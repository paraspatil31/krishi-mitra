import axios from "axios";
import { CropDiagnosisResponse, AIChatResponse } from "../types/ai.types";
import { matchVoiceCommand } from "../config/voiceCommands.locales";
import Order from "../models/Order";

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.8-flash";
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

export class AIService {
  /**
   * Diagnoses crop health and inspects quality control.
   * STRICT SAFETY RULE:
   * When GEMINI_API_KEY is absent, basic_fallback mode MUST NEVER fabricate:
   * - confidence percentage (omitted)
   * - numeric quality grade or freshness score (omitted)
   * - chemical remedies or dosages (omitted)
   */
  static async diagnoseCropImage(
    imageBase64: string,
    mimeType: string = "image/jpeg",
    language: "en" | "hi" | "mr" = "en"
  ): Promise<CropDiagnosisResponse> {
    const apiKey = process.env.GEMINI_API_KEY;

    // Clean base64 string if data URL prefix was included
    const cleanedBase64 = imageBase64.replace(/^data:image\/[a-zA-Z]+;base64,/, "");

    if (apiKey && apiKey.trim().length > 0) {
      try {
        const prompt = `You are an expert agronomic plant pathologist and produce quality inspection AI for KrishiBazaar, an Indian agricultural platform.
Analyze the provided crop/leaf/produce image. Respond strictly in JSON format matching the following specification:
{
  "cropName": "Name of the crop in English (e.g. Tomato, Cotton, Wheat, Rice, Potato, Onion, etc.)",
  "diseaseName": "Specific disease name or 'Healthy Crop'",
  "confidence": <integer between 60 and 99 representing your model confidence estimate>,
  "severity": "Healthy" | "Mild" | "Moderate" | "Severe",
  "pathogenType": "Fungal" | "Bacterial" | "Viral" | "Pest" | "None",
  "symptoms": ["list of visible visual symptoms on leaves/fruit"],
  "remedies": {
    "organic": ["specific natural/organic agronomic remedies suitable for Indian farming"],
    "chemical": ["recommended scientific chemical treatments with standard safe dilutions"],
    "prevention": ["preventive crop management guidelines"]
  },
  "qualityControl": {
    "grade": "A" | "B" | "C",
    "freshnessScore": <integer between 1 and 100>,
    "shelfLifeDays": <estimated remaining marketable days as integer>,
    "defects": ["visible physical defects, blemishes, or discoloration"],
    "estimatedMarketPriceModifier": "+15% (Premium)" | "+5% (Standard)" | "-10% (Discounted)"
  }
}
Note: Return pure JSON without markdown code fences if possible, or inside standard json fences.`;

        const payload = {
          contents: [
            {
              parts: [
                { text: prompt },
                {
                  inlineData: {
                    mimeType: mimeType || "image/jpeg",
                    data: cleanedBase64,
                  },
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 1200,
          },
        };

        const response = await axios.post(`${GEMINI_API_URL}?key=${apiKey}`, payload, {
          headers: { "Content-Type": "application/json" },
          timeout: 30000,
        });

        const rawText = response.data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
        const jsonMatch = rawText.match(/\{[\s\S]*\}/);

        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          return {
            diagnosisSource: "ai_model",
            cropName: parsed.cropName || "Identified Crop",
            diseaseName: parsed.diseaseName || "Healthy Crop",
            confidence: Math.min(Math.max(Number(parsed.confidence) || 85, 50), 99),
            severity: parsed.severity || "Mild",
            pathogenType: parsed.pathogenType || "None",
            symptoms: Array.isArray(parsed.symptoms) ? parsed.symptoms : [],
            remedies: {
              organic: parsed.remedies?.organic || [],
              chemical: parsed.remedies?.chemical || [],
              prevention: parsed.remedies?.prevention || [],
            },
            qualityControl: {
              grade: ["A", "B", "C"].includes(parsed.qualityControl?.grade) ? parsed.qualityControl.grade : "B",
              freshnessScore: Math.min(Math.max(Number(parsed.qualityControl?.freshnessScore) || 80, 10), 100),
              shelfLifeDays: Number(parsed.qualityControl?.shelfLifeDays) || 5,
              defects: Array.isArray(parsed.qualityControl?.defects) ? parsed.qualityControl.defects : [],
              estimatedMarketPriceModifier: parsed.qualityControl?.estimatedMarketPriceModifier || "Standard",
            },
            analyzedAt: new Date().toISOString(),
          };
        }
      } catch (err: any) {
        console.warn("Gemini vision diagnosis failed or timed out, falling back safely:", err?.message || err);
      }
    }

    // BASIC FALLBACK MODE (When GEMINI_API_KEY is missing or offline):
    // Strictly adheres to safety rule:
    // - NO confidence percentage
    // - NO numeric quality grade or freshness score
    // - NO chemical remedy or specific dosage recommendations
    return {
      diagnosisSource: "basic_fallback",
      cropName: "Agricultural Specimen",
      diseaseName: "Unverified Visual Pattern",
      severity: "Moderate",
      pathogenType: "Unknown",
      symptoms: ["Visual analysis unavailable without active AI vision service"],
      fallbackMessage:
        "AI vision model is currently unconfigured or offline. This is an unverified fallback scan. Please consult a local agricultural extension officer or Krishi Vigyan Kendra (KVK) for an authoritative agronomic assessment.",
      remedies: {
        organic: ["Maintain proper field drainage and isolate heavily affected foliage."],
        prevention: ["Inspect neighboring rows for pest activity; follow certified seed treatment guidelines."],
      },
      analyzedAt: new Date().toISOString(),
    };
  }

  /**
   * Conversational assistant & voice commander ("Krishi Mitra")
   * Takes `userId` explicitly and scopes any order lookups to that user server-side.
   */
  static async chatAssistant(
    message: string,
    history: Array<{ role: "user" | "assistant"; content: string }> = [],
    userId: string,
    userRole: string = "farmer",
    language: "en" | "hi" | "mr" = "en"
  ): Promise<AIChatResponse> {
    const trimmed = message.trim();

    const isGuest = userId === "guest" || userRole === "guest";

    // 1. Direct Voice Command Matcher
    const matchedCmd = matchVoiceCommand(trimmed, language, userRole);
    if (matchedCmd) {
      if (matchedCmd.action === "navigate" && matchedCmd.path) {
        // Enforce Hard Rule: Unauthenticated guests cannot access protected farmer or buyer features
        const isPublicPath =
          ["/login", "/signup", "/products", "/"].includes(matchedCmd.path) ||
          matchedCmd.path.startsWith("/products/") ||
          matchedCmd.path.startsWith("/verify/") ||
          matchedCmd.path.startsWith("#language-");

        if (isGuest && !isPublicPath) {
          const authPrompt =
            language === "hi"
              ? "यह सुविधा केवल पंजीकृत किसानों और खरीदारों के लिए है। कृपया पहले लॉगिन करें।"
              : language === "mr"
              ? "या सुविधेचा वापर करण्यासाठी कृपया प्रथम लॉगिन करा."
              : "This feature is reserved for registered users. Please log in first to access it.";

          return {
            message: authPrompt,
            action: {
              type: "navigate",
              path: "/login",
              label: language === "hi" ? "पहले लॉगिन करें" : language === "mr" ? "प्रथम लॉगिन करा" : "Login First",
            },
            source: "voice_commander",
            suggestedPrompts: ["Login", "Sign Up", "Browse Marketplace"],
          };
        }

        // Guide buyer trying to list crops to marketplace
        if (userRole === "buyer" && matchedCmd.path?.startsWith("/farmer/listings")) {
          return {
            message:
              language === "hi"
                ? "फसल लिस्टिंग केवल किसान खातों के लिए है। एक खरीदार के रूप में, आप कृषि बाजार से ताजे उत्पाद खरीद सकते हैं।"
                : language === "mr"
                ? "शेतमाल विक्री नोंदणी केवळ शेतकरी खात्यांसाठी आहे. खरेदीदार म्हणून आपण बाजारपेठेतून शेतमाल खरेदी करू शकता."
                : "Produce listing is reserved for farmers. As a buyer, you can browse fresh farm produce in the marketplace.",
            action: { type: "navigate", path: "/products", label: "Browse Produce" },
            source: "voice_commander",
            suggestedPrompts: ["Browse Produce", "View Cart", "My Orders"],
          };
        }

        const navMsg =
          language === "hi"
            ? `${matchedCmd.label} पर जा रहे हैं।`
            : language === "mr"
            ? `${matchedCmd.label} उघडत आहे.`
            : `Navigating to ${matchedCmd.label}.`;

        return {
          message: navMsg,
          action: {
            type: "navigate",
            path: matchedCmd.path,
            label: matchedCmd.label,
          },
          source: "voice_commander",
        };
      }
      if (matchedCmd.action === "language" && matchedCmd.targetLang) {
        const langNames = { en: "English", hi: "हिन्दी", mr: "मराठी" };
        const switchMsg =
          language === "hi"
            ? `भाषा बदलून ${langNames[matchedCmd.targetLang]} कर दी गई है।`
            : language === "mr"
            ? `भाषा बदलून ${langNames[matchedCmd.targetLang]} केली आहे.`
            : `Switching display language to ${langNames[matchedCmd.targetLang]}.`;

        return {
          message: switchMsg,
          action: {
            type: "navigate",
            path: "#language-" + matchedCmd.targetLang,
            label: `Language: ${langNames[matchedCmd.targetLang]}`,
          },
          source: "voice_commander",
        };
      }
    }

    // 2. Personal Scoped Inquiries (e.g. "my orders", "how many orders")
    const lower = trimmed.toLowerCase();
    if (lower.includes("my order") || lower.includes("मेरा ऑर्डर") || lower.includes("माझे ऑर्डर") || lower.includes("order status")) {
      if (userId === "guest" || userRole === "guest") {
        return {
          message:
            language === "hi"
              ? "कृपया अपने ऑर्डर देखने के लिए लॉगिन करें।"
              : language === "mr"
              ? "कृपया आपल्या ऑर्डर्स पाहण्यासाठी लॉगिन करा."
              : "Please log in to your KrishiBazaar account to view your active orders and track fulfillment.",
          action: { type: "navigate", path: "/login", label: "Login" },
          source: "voice_commander",
          suggestedPrompts: ["Login", "Sign Up", "Check Mandi Prices"],
        };
      }
      try {
        const filter = userRole === "farmer" ? { farmerId: userId } : { buyerId: userId };
        const orders = await Order.find(filter).sort({ createdAt: -1 }).limit(3).lean();
        const path = userRole === "farmer" ? "/farmer/orders" : "/buyer/orders";

        if (!orders || orders.length === 0) {
          return {
            message: "You do not have any active orders right now. You can browse the marketplace to find fresh produce or check listings.",
            action: { type: "navigate", path, label: "View Orders" },
            source: "voice_commander",
            suggestedPrompts: ["Browse Produce", "Check Mandi Prices", "Check Weather"],
          };
        }

        const latest = orders[0];
        const statusSummary = `You have ${orders.length} recent order(s). Your latest order for ${latest.items?.[0]?.productName || "produce"} is currently in '${latest.status}' status (Total ₹${latest.total}).`;
        return {
          message: statusSummary,
          action: { type: "navigate", path, label: "View Orders" },
          source: "voice_commander",
          suggestedPrompts: ["View Order Details", "Check Mandi Prices"],
        };
      } catch (e) {
        console.warn("Failed to fetch user-scoped orders:", e);
      }
    }

    // 3. Generative AI Chat (if GEMINI_API_KEY present)
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey && apiKey.trim().length > 0) {
      try {
        const systemPrompt = `You are Krishi Mitra, a friendly, concise, and helpful agricultural voice assistant for KrishiBazaar (India).
User Role: ${userRole}.
Target Language: ${language} (reply concisely in ${language === "hi" ? "Hindi" : language === "mr" ? "Marathi" : "English"}).
${
  isGuest
    ? `SECURITY & ACCESS RULE: The user is currently NOT logged in (Role: guest). Unauthenticated users CANNOT access farmer tools (listings, selling, weather advisory, crop doctor) or buyer tools (cart, orders, checkout, offers). If the user asks to use or open any of these features, you MUST tell them: "Please log in first to access this feature." and direct them to /login.`
    : ""
}
KrishiBazaar features:
- Direct farm-to-table produce sales (no middleman).
- Escrow payment protection via Razorpay (funds held securely until buyer delivery confirmation).
- Mandi price intelligence from APMC Agmarknet.
- 7-day agricultural weather advisories with crop spray windows.
- Cold storage & nearby APMC market directories.
- Blockchain provenance ledger on Polygon for crop origin verification.
- Crop Doctor for disease detection and quality control.

Guidelines:
- Keep spoken responses short (2-3 sentences max) so they are easy to listen to.
- Never reveal or invent details about other users' data.
- Suggest a navigation destination if relevant.`;

        const contents = [
          { role: "user", parts: [{ text: systemPrompt }] },
          { role: "model", parts: [{ text: "Understood. I am Krishi Mitra, ready to assist concisely in the user's preferred language." }] },
        ];

        // Append recent conversation history
        for (const h of history.slice(-4)) {
          contents.push({
            role: h.role === "assistant" ? "model" : "user",
            parts: [{ text: h.content }],
          });
        }

        contents.push({ role: "user", parts: [{ text: trimmed }] });

        const response = await axios.post(
          `${GEMINI_API_URL}?key=${apiKey}`,
          {
            contents,
            generationConfig: {
              temperature: 0.3,
              maxOutputTokens: 300,
            },
          },
          { timeout: 15000 }
        );

        const reply = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (reply) {
          // Check if reply suggests a specific action
          let action: { type: "navigate"; path: string; label: string } | undefined = undefined;
          if (lower.includes("price") || lower.includes("mandi") || lower.includes("भाव") || lower.includes("दर")) {
            action = { type: "navigate", path: "/mandi-prices", label: "Mandi Prices" };
          } else if (lower.includes("weather") || lower.includes("rain") || lower.includes("मौसम") || lower.includes("हवामान")) {
            action = { type: "navigate", path: "/farmer/weather", label: "Weather Forecast" };
          } else if (lower.includes("disease") || lower.includes("doctor") || lower.includes("leaf") || lower.includes("बीमारी")) {
            action = { type: "navigate", path: "/crop-doctor", label: "Crop Doctor" };
          }

          // Strict guest intercept: replace protected destination with login
          if (isGuest && action) {
            const isPublicPath =
              ["/login", "/signup", "/products", "/"].includes(action.path) ||
              action.path.startsWith("/products/") ||
              action.path.startsWith("/verify/");

            if (!isPublicPath) {
              action = {
                type: "navigate",
                path: "/login",
                label: language === "hi" ? "पहले लॉगिन करें" : language === "mr" ? "प्रथम लॉगिन करा" : "Login First",
              };
            }
          }

          return {
            message: reply.trim(),
            action,
            source: "ai_model",
            suggestedPrompts: isGuest ? ["Login", "Sign Up", "Browse Marketplace"] : ["Check Mandi Prices", "Crop Doctor", "Weather Advisory"],
          };
        }
      } catch (err: any) {
        console.warn("Gemini chat assistant failed, using local agricultural responder:", err?.message || err);
      }
    }

    // 4. Localized Platform Responder (Offline / Fallback)
    return AIService.getLocalAssistantResponse(trimmed, language, userRole);
  }

  private static getLocalAssistantResponse(
    message: string,
    language: "en" | "hi" | "mr",
    userRole: string
  ): AIChatResponse {
    const lower = message.toLowerCase();
    const isGuest = userRole === "guest";

    // Enforce guest access control for offline/fallback queries
    if (isGuest) {
      const protectedIntents = [
        "mandi", "price", "rate", "भाव", "दर",
        "weather", "rain", "forecast", "मौसम", "हवामान",
        "disease", "doctor", "leaf", "रोग", "बीमारी",
        "cart", "buy", "sell", "listing", "order", "checkout", "storage", "warehouse", "godown",
        "कार्ट", "खरीद", "बेच", "ऑर्डर", "गोदाम", "शीतगृह"
      ];
      if (protectedIntents.some((intent) => lower.includes(intent))) {
        return {
          message:
            language === "hi"
              ? "यह सुविधा केवल पंजीकृत किसानों और खरीदारों के लिए है। कृपया पहले लॉगिन करें।"
              : language === "mr"
              ? "या सुविधेचा वापर करण्यासाठी कृपया प्रथम लॉगिन करा."
              : "This feature is reserved for registered users. Please log in first to access it.",
          action: {
            type: "navigate",
            path: "/login",
            label: language === "hi" ? "पहले लॉगिन करें" : language === "mr" ? "प्रथम लॉगिन करा" : "Login First",
          },
          source: "voice_commander",
          suggestedPrompts: ["Login", "Sign Up", "Browse Marketplace"],
        };
      }
    }

    if (lower.includes("mandi") || lower.includes("price") || lower.includes("भाव") || lower.includes("दर")) {
      return {
        message:
          language === "hi"
            ? "आप अपनी नजदीकी कृषि उपज मंडी के लाइव दाम 'मंडी भाव' पेज पर देख सकते हैं।"
            : language === "mr"
            ? "तुम्ही तुमच्या जवळच्या कृषी उत्पन्न बाजार समितीचे दर 'बाजारभाव' पानावर पाहू शकता."
            : "You can view live APMC commodity wholesale rates on the Mandi Prices page.",
        action: { type: "navigate", path: "/mandi-prices", label: "Mandi Prices" },
        source: "voice_commander",
        suggestedPrompts: ["Tomato Mandi Rates", "Wheat Price", "Weather Forecast"],
      };
    }

    if (lower.includes("weather") || lower.includes("rain") || lower.includes("मौसम") || lower.includes("हवामान")) {
      return {
        message:
          language === "hi"
            ? "7-दिवसीय मौसम पूर्वानुमान, छिड़काव अनुकूलता और तापमान अलर्ट मौसम सलाह पृष्ठ पर उपलब्ध हैं।"
            : language === "mr"
            ? "७ दिवसांचा हवामान अंदाज आणि फवारणी अनुकूलता हवामान सल्ला पानावर उपलब्ध आहे."
            : "7-day localized agricultural forecasts, spray feasibility windows, and severe weather alerts are available on Weather Advisory.",
        action: { type: "navigate", path: "/farmer/weather", label: "Weather Advisory" },
        source: "voice_commander",
        suggestedPrompts: ["Spray Windows", "Precipitation Alert", "Mandi Prices"],
      };
    }

    if (lower.includes("disease") || lower.includes("doctor") || lower.includes("रोग") || lower.includes("बीमारी")) {
      return {
        message:
          language === "hi"
            ? "पत्ते या फसल की तस्वीर अपलोड करके बीमारी की पहचान और गुणवत्ता जांच के लिए क्रॉप डॉक्टर का उपयोग करें।"
            : language === "mr"
            ? "पिकाचा किंवा पानाचा फोटो काढून रोग निदान आणि गुणवत्ता तपासणीसाठी क्रॉप डॉक्टर वापरा."
            : "Take or upload a photo of your crop leaf or produce to detect diseases and inspect quality grades with Crop Doctor.",
        action: { type: "navigate", path: "/crop-doctor", label: "Crop Doctor" },
        source: "voice_commander",
        suggestedPrompts: ["Scan Tomato Leaf", "Check Quality Grade"],
      };
    }

    if (lower.includes("escrow") || lower.includes("payment") || lower.includes("सुरक्षा") || lower.includes("पैसे")) {
      return {
        message:
          language === "hi"
            ? "कृषि बाज़ार एस्क्रो भुगतान का उपयोग करता है। खरीदार द्वारा डिलीवरी की पुष्टि करने तक पैसा सुरक्षित बैंक खाते में होल्ड रहता है।"
            : language === "mr"
            ? "कृषी बाजार एस्क्रो पेमेंट वापरतो. खरेदीदाराने माल मिळाल्याची खात्री करेपर्यंत रक्कम सुरक्षित बँकेत राहते."
            : "KrishiBazaar uses Escrow Protection. Buyer funds are held securely until delivery confirmation, guaranteeing payment to the farmer.",
        source: "voice_commander",
        suggestedPrompts: ["How to Buy", "How to Sell", "Mandi Prices"],
      };
    }

    // Default friendly assistant greeting
    return {
      message:
        language === "hi"
          ? "नमस्ते! मैं आपका कृषि मित्र हूँ। आप मुझसे मंडी भाव, मौसम सलाह, या अपनी फसल की बीमारी जांच के बारे में पूछ सकते हैं।"
          : language === "mr"
          ? "नमस्कार! मी तुमचा कृषी मित्र आहे. तुम्ही मला बाजारभाव, हवामान अंदाज किंवा पिकांच्या रोगांबद्दल विचारू शकता."
          : "Hello! I am Krishi Mitra, your farming assistant. You can ask me to navigate to mandi rates, weather forecast, or inspect crop health.",
      source: "voice_commander",
      suggestedPrompts: ["Check Mandi Prices", "Weather Advisory", "Crop Doctor", "My Orders"],
    };
  }
}
