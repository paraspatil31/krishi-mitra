import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/context/AuthContext";
import { aiService } from "@/services/ai.service";
import type { AIChatResponse } from "@/types/ai";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  action?: AIChatResponse["action"];
  timestamp: string;
}

export default function VoiceAssistantModal() {
  const { t, i18n } = useTranslation();
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  const [isOpen, setIsOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        i18n.language === "hi"
          ? "नमस्ते! मैं आपका कृषि मित्र हूँ। आप बोलकर मंडी भाव, मौसम या किसी भी पेज पर जा सकते हैं।"
          : i18n.language === "mr"
          ? "नमस्कार! मी तुमचा कृषी मित्र आहे. तुम्ही बोलून बाजारभाव, हवामान किंवा इतर पानांवर जाऊ शकता."
          : "Hello! I am Krishi Mitra, your voice farming assistant. Speak to navigate anywhere or ask questions.",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);
  const [textInput, setTextInput] = useState("");
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);

  const recognitionRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const activeUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Preload and monitor available SpeechSynthesis voices across browsers
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSpeechSupported(false);
    }

    function loadVoices() {
      if ("speechSynthesis" in window) {
        const v = window.speechSynthesis.getVoices();
        if (v && v.length > 0) {
          setAvailableVoices(v);
        }
      }
    }

    loadVoices();
    if ("speechSynthesis" in window) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }

    return () => {
      if ("speechSynthesis" in window) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, []);

  // Sync initial welcome message when language changes
  useEffect(() => {
    setMessages((prev) => {
      if (prev.length === 1 && prev[0].id === "welcome") {
        return [
          {
            id: "welcome",
            role: "assistant",
            content:
              i18n.language === "hi"
                ? "नमस्ते! मैं आपका कृषि मित्र हूँ। आप बोलकर मंडी भाव, मौसम या किसी भी पेज पर जा सकते हैं।"
                : i18n.language === "mr"
                ? "नमस्कार! मी तुमचा कृषी मित्र आहे. तुम्ही बोलून बाजारभाव, हवामान किंवा इतर पानांवर जाऊ शकता."
                : "Hello! I am Krishi Mitra, your voice farming assistant. Speak to navigate anywhere or ask questions.",
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          },
        ];
      }
      return prev;
    });
  }, [i18n.language]);

  // Auto-scroll messages
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  // Robust voice matching across Chrome, Edge, Safari, Windows, Android
  function findBestVoice(lang: string, voices: SpeechSynthesisVoice[]) {
    if (!voices || voices.length === 0) return null;

    const matchesLang = (v: SpeechSynthesisVoice, prefix: string) =>
      v.lang.toLowerCase().replace("_", "-").startsWith(prefix.toLowerCase());

    const hasInName = (v: SpeechSynthesisVoice, sub: string) =>
      v.name.toLowerCase().includes(sub.toLowerCase());

    // 1. Marathi requested
    if (lang === "mr" || lang.startsWith("mr")) {
      // Look for native Marathi voice
      const mrVoice = voices.find(
        (v) => matchesLang(v, "mr") || hasInName(v, "marathi") || v.name.includes("मराठी")
      );
      if (mrVoice) return { voice: mrVoice, lang: mrVoice.lang };

      // Devanagari cross-fallback:
      // Hindi and Marathi share the Devanagari script.
      // Standard Windows/Chrome Hindi voices (Google हिन्दी / Microsoft Swara) pronounce
      // Marathi Devanagari text accurately and fluently without dropping audio!
      const hiVoice = voices.find(
        (v) => matchesLang(v, "hi") || hasInName(v, "hindi") || v.name.includes("हिन्दी")
      );
      if (hiVoice) return { voice: hiVoice, lang: "hi-IN" };
    }

    // 2. Hindi requested
    if (lang === "hi" || lang.startsWith("hi")) {
      const hiVoice = voices.find(
        (v) => matchesLang(v, "hi") || hasInName(v, "hindi") || v.name.includes("हिन्दी")
      );
      if (hiVoice) return { voice: hiVoice, lang: hiVoice.lang || "hi-IN" };
    }

    // 3. English
    const enInVoice = voices.find((v) => matchesLang(v, "en-in") || hasInName(v, "india"));
    if (enInVoice) return { voice: enInVoice, lang: enInVoice.lang };

    const enVoice = voices.find((v) => matchesLang(v, "en"));
    if (enVoice) return { voice: enVoice, lang: enVoice.lang };

    return null;
  }

  // Handle robust TTS speech across browsers & OSs (Hindi, Marathi, English)
  function speakText(text: string) {
    if (isMuted || !("speechSynthesis" in window)) return;

    try {
      window.speechSynthesis.cancel();
      window.speechSynthesis.resume();

      const utterance = new SpeechSynthesisUtterance(text);
      activeUtteranceRef.current = utterance; // Prevent garbage collection mid-sentence

      const currentLang = i18n.language || "en";
      const isDevanagari = /[\u0900-\u097F]/.test(text);

      const voices =
        availableVoices.length > 0 ? availableVoices : window.speechSynthesis.getVoices();
      const matched = findBestVoice(currentLang, voices);

      if (
        matched &&
        (matched.voice.lang.toLowerCase().includes("hi") ||
          matched.voice.lang.toLowerCase().includes("mr") ||
          currentLang === "en")
      ) {
        utterance.voice = matched.voice;
        utterance.lang = matched.lang;
      } else if (isDevanagari || currentLang === "hi" || currentLang === "mr") {
        // CRITICAL: Never assign an English voice to Devanagari text!
        // Leaving utterance.voice unassigned lets Chromium and Edge route Devanagari text
        // to their cloud natural synthesis engine for "hi-IN", producing clear sound.
        utterance.lang = "hi-IN";
      } else {
        utterance.lang = "en-IN";
      }

      utterance.rate = 0.95; // Slightly clearer rate for regional languages
      utterance.pitch = 1.0;

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => {
        setIsSpeaking(false);
        activeUtteranceRef.current = null;
      };
      utterance.onerror = (e) => {
        console.warn("Speech synthesis notice:", e?.error);
        setIsSpeaking(false);
        activeUtteranceRef.current = null;
      };

      // 60ms delay fixes Chromium cancel-then-speak dropping utterance bug
      setTimeout(() => {
        try {
          window.speechSynthesis.resume();
          window.speechSynthesis.speak(utterance);
        } catch (e) {
          console.warn("speechSynthesis.speak error:", e);
        }
      }, 60);
    } catch (e) {
      console.warn("Failed to execute speakText:", e);
    }
  }

  function startListening() {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSpeechSupported(false);
      return;
    }

    try {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }

      window.speechSynthesis.cancel();
      setIsSpeaking(false);

      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;

      const currentLang = i18n.language || "en";
      recognition.lang = currentLang === "hi" ? "hi-IN" : currentLang === "mr" ? "mr-IN" : "en-IN";

      recognition.onstart = () => {
        setIsListening(true);
        setTranscript("");
      };

      recognition.onresult = (event: any) => {
        const current = event.resultIndex;
        const text = event.results[current][0].transcript;
        setTranscript(text);

        if (event.results[current].isFinal) {
          handleSendMessage(text);
          stopListening();
        }
      };

      recognition.onerror = (event: any) => {
        console.warn("Speech recognition error:", event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error("Failed to start speech recognition:", err);
      setIsListening(false);
    }
  }

  function stopListening() {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // Ignored
      }
    }
    setIsListening(false);
  }

  async function handleSendMessage(inputMsg: string) {
    const trimmed = inputMsg.trim();
    if (!trimmed) return;

    // Add user message
    const userMsg: Message = {
      id: "u-" + Date.now(),
      role: "user",
      content: trimmed,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setTextInput("");
    setTranscript("");
    setIsLoading(true);

    try {
      // Build history
      const history = messages.slice(-4).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const lang = (i18n.language as "en" | "hi" | "mr") || "en";
      const res = await aiService.chatAssistant(trimmed, history, lang);

      const assistantMsg: Message = {
        id: "a-" + Date.now(),
        role: "assistant",
        content: res.message,
        action: res.action,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, assistantMsg]);
      speakText(res.message);

      // Execute Autonomous Navigation Action if present
      if (res.action && res.action.type === "navigate" && res.action.path) {
        if (res.action.path.startsWith("#language-")) {
          const targetLang = res.action.path.replace("#language-", "");
          if (["en", "hi", "mr"].includes(targetLang)) {
            i18n.changeLanguage(targetLang);
          }
        } else {
          setTimeout(() => {
            navigate(res.action!.path);
            setIsOpen(false);
          }, 1000);
        }
      }
    } catch (err: any) {
      const errMsg =
        err?.message ||
        (i18n.language === "hi"
          ? "माफ़ कीजिए, कनेक्शन में समस्या आई।"
          : "Sorry, I encountered a temporary connection issue.");

      setMessages((prev) => [
        ...prev,
        {
          id: "err-" + Date.now(),
          role: "assistant",
          content: errMsg,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
      speakText(errMsg);
    } finally {
      setIsLoading(false);
    }
  }

  // Only authenticated or public guest assistant
  return (
    <>
      {/* Floating Action Trigger Button (Bottom Right) */}
      <div className="fixed bottom-6 right-6 z-40 flex items-center gap-3">
        {/* Floating Tooltip if closed */}
        {!isOpen && (
          <div className="hidden sm:flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 text-xs font-semibold text-emerald-900 shadow-md border border-emerald-100 animate-bounce">
            <span>🎙️</span>
            <span>{t("voice.askKrishiMitra", "Talk to Krishi Mitra")}</span>
          </div>
        )}

        <button
          type="button"
          onClick={() => {
            if (!isOpen) {
              setIsOpen(true);
              if (speechSupported) {
                setTimeout(startListening, 300);
              }
            } else {
              setIsOpen(false);
              stopListening();
              window.speechSynthesis?.cancel();
            }
          }}
          aria-label="Toggle Krishi Mitra Voice Assistant"
          className={`relative flex h-14 w-14 items-center justify-center rounded-full shadow-xl transition-all duration-300 focus:outline-hidden ${
            isOpen
              ? "bg-gray-900 text-white scale-95"
              : isListening
              ? "bg-red-500 text-white scale-110 ring-4 ring-red-300 animate-pulse"
              : "bg-gradient-to-tr from-emerald-600 to-teal-500 text-white hover:scale-105 ring-4 ring-emerald-100"
          }`}
        >
          {isOpen ? (
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : isListening ? (
            <div className="flex items-center gap-0.5">
              <span className="h-4 w-1 bg-white rounded-full animate-pulse" />
              <span className="h-6 w-1 bg-white rounded-full animate-pulse" />
              <span className="h-3 w-1 bg-white rounded-full animate-pulse" />
            </div>
          ) : (
            <div className="relative">
              <span className="text-2xl">🎙️</span>
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-400" />
              </span>
            </div>
          )}
        </button>
      </div>

      {/* Voice Assistant Modal Window */}
      {isOpen && (
        <div className="fixed bottom-24 right-4 sm:right-6 z-40 w-[calc(100vw-2rem)] sm:w-96 rounded-3xl border border-gray-100 bg-white/95 backdrop-blur-xl shadow-2xl ring-1 ring-black/5 overflow-hidden flex flex-col max-h-[550px] animate-in fade-in slide-in-from-bottom-5">
          {/* Header */}
          <div className="bg-gradient-to-r from-emerald-700 via-emerald-800 to-teal-800 p-4 text-white flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/20 text-lg">
                🤖
              </div>
              <div>
                <h3 className="text-sm font-bold flex items-center gap-1.5 leading-none">
                  {t("voice.krishiMitra", "Krishi Mitra Voice Assistant")}
                  <span className="rounded-full bg-emerald-400/20 px-2 py-0.5 text-[9px] font-semibold text-emerald-300">
                    AI
                  </span>
                </h3>
                <p className="text-[10px] text-emerald-100/80 mt-1">
                  {isListening
                    ? t("voice.listeningNow", "Listening... Speak your command")
                    : isSpeaking
                    ? t("voice.speakingReply", "Speaking reply...")
                    : t("voice.readyToAssist", "Tap mic or type a command")}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setIsMuted(!isMuted);
                  if (!isMuted) window.speechSynthesis?.cancel();
                }}
                className={`p-1.5 rounded-lg text-xs transition-colors ${
                  isMuted ? "bg-red-500/20 text-red-200" : "bg-white/10 text-white hover:bg-white/20"
                }`}
                title={isMuted ? "Unmute Spoken Reply" : "Mute Spoken Reply"}
              >
                {isMuted ? "🔇" : "🔊"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  stopListening();
                  window.speechSynthesis?.cancel();
                }}
                className="p-1.5 rounded-lg bg-white/10 text-white hover:bg-white/20 text-xs"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Quick Language Selector Bar */}
          <div className="bg-emerald-900/90 px-3.5 py-1.5 border-t border-emerald-700/50 flex items-center justify-between text-xs backdrop-blur-sm">
            <span className="text-[11px] text-emerald-200/90 font-medium flex items-center gap-1.5">
              <span>🌐</span>
              <span className="font-semibold">{t("settings.language", "Language")}:</span>
              <span className="text-[10px] text-emerald-300/80">
                {i18n.language === "hi"
                  ? "हिन्दी (hi-IN)"
                  : i18n.language === "mr"
                  ? "मराठी (mr-IN)"
                  : "English (en-IN)"}
              </span>
            </span>
            <div className="flex items-center gap-1 bg-black/25 p-0.5 rounded-lg border border-white/10">
              <button
                type="button"
                onClick={() => {
                  i18n.changeLanguage("en");
                  if (isListening) {
                    stopListening();
                    setTimeout(startListening, 150);
                  }
                }}
                className={`px-2 py-0.5 rounded-md text-[10px] font-medium transition-all ${
                  i18n.language === "en"
                    ? "bg-emerald-500 text-white font-bold shadow-xs"
                    : "text-emerald-100 hover:bg-white/10"
                }`}
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => {
                  i18n.changeLanguage("hi");
                  if (isListening) {
                    stopListening();
                    setTimeout(startListening, 150);
                  }
                }}
                className={`px-2 py-0.5 rounded-md text-[10px] font-medium transition-all ${
                  i18n.language === "hi"
                    ? "bg-emerald-500 text-white font-bold shadow-xs"
                    : "text-emerald-100 hover:bg-white/10"
                }`}
              >
                हिन्दी
              </button>
              <button
                type="button"
                onClick={() => {
                  i18n.changeLanguage("mr");
                  if (isListening) {
                    stopListening();
                    setTimeout(startListening, 150);
                  }
                }}
                className={`px-2 py-0.5 rounded-md text-[10px] font-medium transition-all ${
                  i18n.language === "mr"
                    ? "bg-emerald-500 text-white font-bold shadow-xs"
                    : "text-emerald-100 hover:bg-white/10"
                }`}
              >
                मराठी
              </button>
            </div>
          </div>

          {/* Messages Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[220px] max-h-[300px] text-xs">
            {messages.map((m) => {
              const isUser = m.role === "user";
              return (
                <div key={m.id} className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}>
                  <div
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 shadow-2xs ${
                      isUser
                        ? "bg-emerald-600 text-white rounded-br-xs font-medium"
                        : "bg-gray-100 text-gray-900 rounded-bl-xs border border-gray-200/60"
                    }`}
                  >
                    <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>

                    {/* Replay speech button for assistant replies */}
                    {!isUser && (
                      <div className="mt-1.5 flex items-center justify-end">
                        <button
                          type="button"
                          onClick={() => speakText(m.content)}
                          className="text-[10px] text-emerald-800 hover:text-emerald-950 flex items-center gap-1 font-semibold bg-emerald-100/70 px-2 py-0.5 rounded hover:bg-emerald-200/80 transition-colors"
                          title="Listen to this response"
                        >
                          🔊 Listen
                        </button>
                      </div>
                    )}

                    {/* Action pill if assistant performed navigation */}
                    {m.action && (
                      <div className="mt-2 pt-2 border-t border-gray-200/60 flex items-center justify-between gap-2">
                        <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1">
                          ⚡ {m.action.label}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            if (m.action?.path) navigate(m.action.path);
                            setIsOpen(false);
                          }}
                          className="rounded-lg bg-emerald-700 text-white px-2 py-0.5 text-[10px] font-bold hover:bg-emerald-800 transition-colors"
                        >
                          Open ↗
                        </button>
                      </div>
                    )}
                  </div>
                  <span className="text-[9px] text-gray-400 mt-1 px-1">{m.timestamp}</span>
                </div>
              );
            })}

            {isLoading && (
              <div className="flex items-center gap-2 text-gray-500 text-xs py-1">
                <span className="h-2 w-2 rounded-full bg-emerald-600 animate-ping" />
                <span className="italic">{t("voice.thinking", "Krishi Mitra is thinking...")}</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Suggestions Chips */}
          <div className="px-4 py-2 border-t border-gray-100 bg-gray-50/70 flex gap-1.5 overflow-x-auto no-scrollbar">
            {(user?.role === "farmer"
              ? [
                  { label: "🌾 Mandi Prices", text: "Show mandi prices" },
                  { label: "🌦️ Weather", text: "Check weather forecast" },
                  { label: "➕ Sell Crop", text: "Add new listing" },
                  { label: "🌿 Crop Doctor", text: "Diagnose crop disease" },
                  { label: "📋 My Listings", text: "Show my listings" },
                  { label: "📦 Farmer Orders", text: "View incoming orders" },
                  { label: "🤝 Offers Desk", text: "Show received offers" },
                  { label: "🏢 Bulk Demands", text: "Show bulk demands" },
                ]
              : user?.role === "buyer"
              ? [
                  { label: "🛒 View Cart", text: "Open shopping cart" },
                  { label: "📦 My Orders", text: "Show my orders" },
                  { label: "💳 Checkout", text: "Proceed to checkout" },
                  { label: "🤝 Sent Offers", text: "Show my offers" },
                  { label: "🥦 Marketplace", text: "Browse produce" },
                  { label: "🌿 Crop Doctor", text: "Diagnose crop disease" },
                ]
              : user?.role === "fpo"
              ? [
                  { label: "🌾 FPO Hub", text: "Open FPO dashboard" },
                  { label: "👥 Members", text: "View FPO members" },
                  { label: "📦 Aggregated Lots", text: "View FPO lots" },
                  { label: "🌾 Mandi Prices", text: "Show mandi prices" },
                ]
              : [
                  { label: "🔑 Login", text: "Open login page" },
                  { label: "📝 Sign Up", text: "Open sign up page" },
                  { label: "🥦 Marketplace", text: "Browse produce" },
                  { label: "🛡️ Escrow Protection", text: "How does escrow payment work?" },
                ]
            ).map((chip) => (
              <button
                key={chip.text}
                type="button"
                onClick={() => handleSendMessage(chip.text)}
                className="shrink-0 rounded-full border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-medium text-gray-700 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800 transition-all shadow-2xs"
              >
                {chip.label}
              </button>
            ))}
          </div>

          {/* Listening State Overlay or Input Footer */}
          <div className="p-3 bg-white border-t border-gray-100">
            {isListening ? (
              <div className="flex items-center justify-between rounded-2xl bg-red-50 border border-red-200 p-2.5">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-xs font-semibold text-red-700">
                    {transcript ? `"${transcript}"` : t("voice.listeningIndicator", "Listening to your voice...")}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={stopListening}
                  className="rounded-xl bg-red-600 px-3 py-1 text-xs font-bold text-white shadow-xs hover:bg-red-700 transition-colors"
                >
                  Done
                </button>
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage(textInput);
                }}
                className="flex items-center gap-2"
              >
                {speechSupported && (
                  <button
                    type="button"
                    onClick={startListening}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-all"
                    title="Speak command"
                  >
                    <span className="text-base">🎙️</span>
                  </button>
                )}

                <input
                  type="text"
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  placeholder={
                    speechSupported
                      ? t("voice.typeOrSpeak", "Type question or tap mic...")
                      : t("voice.typeCommand", "Type question or command (e.g. mandi prices)...")
                  }
                  className="flex-1 rounded-xl border border-gray-200 bg-gray-50/50 px-3 py-2 text-xs text-gray-900 placeholder:text-gray-400 focus:bg-white focus:border-emerald-500 focus:outline-hidden"
                />

                <button
                  type="submit"
                  disabled={!textInput.trim() || isLoading}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-700 text-white disabled:opacity-40 hover:bg-emerald-800 transition-colors shadow-xs"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </button>
              </form>
            )}

            {!speechSupported && (
              <p className="text-[10px] text-amber-700 bg-amber-50 rounded-lg p-1.5 mt-2 border border-amber-200">
                ℹ️ {t("voice.unsupportedNotice", "Voice recognition is not supported in this browser. You can type commands above.")}
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
