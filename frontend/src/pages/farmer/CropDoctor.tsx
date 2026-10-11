import { useState, useRef, useEffect, ChangeEvent } from "react";
import { Link, useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { aiService } from "@/services/ai.service";
import type { CropDiagnosisResponse } from "@/types/ai";

export default function CropDoctor() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string>("image/jpeg");
  const [analyzing, setAnalyzing] = useState(false);
  const [diagnosis, setDiagnosis] = useState<CropDiagnosisResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Live Camera state
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [cameraLoading, setCameraLoading] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Start live camera stream
  async function startCamera(desiredFacing = facingMode) {
    stopCamera();
    setIsCameraOpen(true);
    setCameraLoading(true);
    setCameraError(null);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError("Camera is not supported in this browser. Please use file upload.");
      setCameraLoading(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: desiredFacing },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(console.warn);
      }
    } catch (err: any) {
      console.warn("Primary camera facing failed, trying generic fallback:", err);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(console.warn);
        }
      } catch (fallbackErr: any) {
        console.error("Camera access failed completely:", fallbackErr);
        if (fallbackErr.name === "NotAllowedError" || fallbackErr.name === "PermissionDeniedError") {
          setCameraError(
            t(
              "cropDoctor.cameraError",
              "Camera permission was denied. Please allow camera permissions in your browser address bar or upload a file."
            )
          );
        } else {
          setCameraError(
            t(
              "cropDoctor.cameraError",
              "Unable to access camera. Please allow camera permissions or upload a photo."
            )
          );
        }
      }
    } finally {
      setCameraLoading(false);
    }
  }

  // Stop camera and release hardware
  function stopCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraOpen(false);
    setCameraLoading(false);
  }

  function toggleFacingMode() {
    const nextFacing = facingMode === "environment" ? "user" : "environment";
    setFacingMode(nextFacing);
    startCamera(nextFacing);
  }

  // Snap photo from live camera feed onto hidden canvas
  function capturePhoto() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;

    try {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      if (facingMode === "user") {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
      }

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.92);

      setImagePreview(dataUrl);
      setMimeType("image/jpeg");
      setDiagnosis(null);
      setErrorMsg(null);
      stopCamera();
    } catch (e: any) {
      console.error("Failed to capture photo from canvas:", e);
      setErrorMsg("Failed to capture photo. Please try uploading a file.");
    }
  }

  // Cleanup camera stream on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  function handleFileSelect(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setErrorMsg("Please upload a valid image file (JPEG, PNG, WebP).");
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      setErrorMsg("Image size exceeds 15MB limit. Please choose a smaller photo.");
      return;
    }

    setErrorMsg(null);
    setDiagnosis(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const rawDataUrl = event.target?.result as string;
      const img = new Image();
      img.onload = () => {
        // Optimize high-resolution mobile camera photos to prevent request payload errors
        const MAX_DIM = 1600;
        let { width, height } = img;
        if (width > MAX_DIM || height > MAX_DIM) {
          if (width > height) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          } else {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL("image/jpeg", 0.88);
          setImagePreview(compressed);
          setMimeType("image/jpeg");
        } else {
          setImagePreview(rawDataUrl);
          setMimeType(file.type || "image/jpeg");
        }
      };
      img.onerror = () => {
        setImagePreview(rawDataUrl);
        setMimeType(file.type || "image/jpeg");
      };
      img.src = rawDataUrl;
    };
    reader.readAsDataURL(file);
  }

  async function runDiagnosis() {
    if (!imagePreview) return;

    setAnalyzing(true);
    setErrorMsg(null);

    try {
      const lang = (i18n.language as "en" | "hi" | "mr") || "en";
      const result = await aiService.diagnoseCrop(imagePreview, mimeType, lang);
      setDiagnosis(result);
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to complete crop diagnosis. Please try again.");
    } finally {
      setAnalyzing(false);
    }
  }

  function handleReset() {
    stopCamera();
    setImagePreview(null);
    setDiagnosis(null);
    setErrorMsg(null);
  }

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in">
      {/* Page Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-900 via-teal-900 to-emerald-950 p-6 sm:p-8 text-white shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/20 border border-emerald-400/30 px-3 py-1 text-xs font-semibold text-emerald-300 mb-2">
              <span>🌿</span>
              <span>{t("cropDoctor.badge", "AI Agronomic Diagnosis & Quality Inspection")}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white" style={{ fontFamily: "var(--font-heading)" }}>
              {t("cropDoctor.title", "Crop Doctor & Quality Control")}
            </h1>
            <p className="text-xs sm:text-sm text-emerald-100/80 mt-1 max-w-xl">
              {t(
                "cropDoctor.subtitle",
                "Scan foliage for diseases and inspect produce quality grades, freshness, and treatment recommendations."
              )}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/farmer/weather"
              className="rounded-xl border border-white/20 bg-white/10 px-3.5 py-2 text-xs font-semibold text-white hover:bg-white/20 transition-all backdrop-blur-xs"
            >
              🌦️ {t("nav.weatherAdvisory", "Weather Advisory")}
            </Link>
          </div>
        </div>
      </div>

      {/* Main Diagnosis Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Image Uploader & Preview */}
        <div className="lg:col-span-5 space-y-4">
          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-xs">
            <h2 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
              <span>📷</span>
              <span>{t("cropDoctor.uploadTitle", "Upload or Capture Plant Photo")}</span>
            </h2>

            {/* Hidden File Inputs */}
            <input
              type="file"
              ref={fileInputRef}
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileSelect}
              className="hidden"
            />
            <input
              type="file"
              ref={cameraInputRef}
              accept="image/*"
              capture="environment"
              onChange={handleFileSelect}
              className="hidden"
            />

            {!imagePreview ? (
              <div className="rounded-2xl border-2 border-dashed border-emerald-300/80 bg-emerald-50/30 p-6 text-center hover:border-emerald-500 hover:bg-emerald-50/50 transition-all flex flex-col items-center justify-center">
                <div className="h-14 w-14 rounded-2xl bg-emerald-100 flex items-center justify-center text-2xl mb-3">
                  🍃
                </div>
                <h3 className="text-xs font-bold text-gray-800">
                  {t("cropDoctor.uploadTitle", "Upload or Capture Plant Photo")}
                </h3>
                <p className="text-[11px] text-gray-500 mt-1 max-w-xs">
                  {t("cropDoctor.dragOrBrowse", "Take a live photo or upload from your device files")}
                </p>

                {/* Primary Dual Actions: Live Camera & Browse Files */}
                <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5 w-full">
                  <button
                    type="button"
                    onClick={() => startCamera("environment")}
                    className="flex-1 min-w-[140px] rounded-xl bg-emerald-700 text-white px-4 py-2.5 text-xs font-bold hover:bg-emerald-800 shadow-md flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-95"
                  >
                    <span className="text-base">📸</span>
                    <span>{t("cropDoctor.openCamera", "Open Camera")}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 min-w-[140px] rounded-xl border border-emerald-300 bg-white text-emerald-800 px-4 py-2.5 text-xs font-bold hover:bg-emerald-50 shadow-xs flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-95"
                  >
                    <span className="text-base">📁</span>
                    <span>{t("cropDoctor.uploadFiles", "Upload File")}</span>
                  </button>
                </div>
                <p className="text-[10px] text-gray-400 mt-2.5">Supports JPEG, PNG, WebP (Max 10MB)</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="relative rounded-2xl overflow-hidden border border-gray-200 bg-black/5 aspect-4/3 flex items-center justify-center">
                  <img
                    src={imagePreview}
                    alt="Crop Preview"
                    className="max-h-full max-w-full object-contain"
                  />

                  {/* Scanning Radar Animation during analysis */}
                  {analyzing && (
                    <div className="absolute inset-0 bg-emerald-950/40 backdrop-blur-xs flex flex-col items-center justify-center text-white">
                      <div className="relative flex h-16 w-16 items-center justify-center">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-12 w-12 bg-emerald-600 items-center justify-center text-xl">
                          🔬
                        </span>
                      </div>
                      <p className="text-xs font-bold mt-3 animate-pulse text-emerald-200">
                        {t("cropDoctor.analyzing", "AI inspecting pathology & quality...")}
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={analyzing}
                    onClick={runDiagnosis}
                    className="flex-1 min-w-[150px] rounded-xl bg-emerald-700 text-white py-2.5 text-xs font-bold hover:bg-emerald-800 disabled:opacity-50 transition-all shadow-xs flex items-center justify-center gap-1.5"
                  >
                    <span>⚡</span> {t("cropDoctor.startScan", "Run Diagnosis & Grading")}
                  </button>
                  <button
                    type="button"
                    disabled={analyzing}
                    onClick={() => startCamera("environment")}
                    className="rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 px-3 py-2.5 text-xs font-bold hover:bg-emerald-100 transition-colors flex items-center gap-1"
                    title={t("cropDoctor.retake", "Retake Photo")}
                  >
                    <span>📸</span> {t("cropDoctor.retake", "Retake")}
                  </button>
                  <button
                    type="button"
                    disabled={analyzing}
                    onClick={() => fileInputRef.current?.click()}
                    className="rounded-xl border border-gray-200 bg-white text-gray-700 px-3 py-2.5 text-xs font-bold hover:bg-gray-50 transition-colors"
                  >
                    📁 {t("cropDoctor.uploadFiles", "Change")}
                  </button>
                  <button
                    type="button"
                    disabled={analyzing}
                    onClick={handleReset}
                    className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-xs font-bold text-gray-600 hover:bg-gray-100 transition-colors"
                  >
                    {t("common.reset", "Reset")}
                  </button>
                </div>
              </div>
            )}

            {/* Live Camera Viewfinder Modal */}
            {isCameraOpen && (
              <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4 sm:p-6 animate-fade-in">
                <div className="relative w-full max-w-lg bg-gray-900 rounded-3xl overflow-hidden shadow-2xl border border-gray-700/80 flex flex-col">
                  {/* Viewfinder Top Bar */}
                  <div className="p-4 flex items-center justify-between text-white bg-gradient-to-b from-black/80 to-transparent absolute top-0 inset-x-0 z-10">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-red-500 animate-ping" />
                      <span className="text-xs font-bold tracking-wide uppercase text-emerald-400">
                        {t("cropDoctor.liveCamera", "Live Camera Viewfinder")}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={toggleFacingMode}
                        className="rounded-full bg-white/15 p-2 text-white hover:bg-white/30 backdrop-blur-xs transition-colors"
                        title={t("cropDoctor.switchCamera", "Switch Camera")}
                      >
                        🔄
                      </button>
                      <button
                        type="button"
                        onClick={stopCamera}
                        className="rounded-full bg-white/15 p-2 text-white hover:bg-white/30 backdrop-blur-xs transition-colors"
                        title={t("cropDoctor.closeCamera", "Close Camera")}
                      >
                        ✕
                      </button>
                    </div>
                  </div>

                  {/* Video Frame & Viewfinder Reticle */}
                  <div className="relative aspect-4/3 w-full bg-black flex items-center justify-center overflow-hidden">
                    {cameraLoading && (
                      <div className="flex flex-col items-center gap-3 text-emerald-300 z-10">
                        <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />
                        <p className="text-xs font-semibold">{t("cropDoctor.analyzing", "Starting camera...")}</p>
                      </div>
                    )}

                    {cameraError && (
                      <div className="p-6 text-center text-red-200 z-10 max-w-sm">
                        <span className="text-3xl">⚠️</span>
                        <p className="mt-2 text-xs font-semibold">{cameraError}</p>
                        <button
                          type="button"
                          onClick={() => {
                            stopCamera();
                            fileInputRef.current?.click();
                          }}
                          className="mt-4 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 shadow-md"
                        >
                          {t("cropDoctor.uploadFiles", "Upload File Instead")}
                        </button>
                      </div>
                    )}

                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className={`w-full h-full object-cover ${facingMode === "user" ? "scale-x-[-1]" : ""}`}
                    />

                    {/* Crop Target Focus Guide Overlay */}
                    {!cameraLoading && !cameraError && (
                      <div className="absolute inset-8 pointer-events-none border-2 border-dashed border-emerald-400/60 rounded-2xl flex flex-col justify-between p-3">
                        <div className="flex justify-between">
                          <div className="w-5 h-5 border-t-2 border-l-2 border-emerald-400" />
                          <div className="w-5 h-5 border-t-2 border-r-2 border-emerald-400" />
                        </div>
                        <p className="text-center text-[10px] font-semibold text-emerald-200 bg-black/60 px-3 py-1 rounded-full backdrop-blur-xs self-center">
                          {t("cropDoctor.centerFocus", "Center crop leaf or produce inside frame")}
                        </p>
                        <div className="flex justify-between">
                          <div className="w-5 h-5 border-b-2 border-l-2 border-emerald-400" />
                          <div className="w-5 h-5 border-b-2 border-r-2 border-emerald-400" />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Shutter Bottom Bar */}
                  <div className="p-5 bg-gray-950 flex items-center justify-around border-t border-gray-800">
                    <button
                      type="button"
                      onClick={stopCamera}
                      className="text-xs font-semibold text-gray-400 hover:text-white transition-colors"
                    >
                      {t("cropDoctor.cancel", "Cancel")}
                    </button>

                    <button
                      type="button"
                      disabled={cameraLoading || !!cameraError}
                      onClick={capturePhoto}
                      className="relative flex h-16 w-16 items-center justify-center rounded-full border-4 border-white bg-emerald-600 hover:bg-emerald-500 shadow-lg active:scale-95 transition-all disabled:opacity-40"
                      title={t("cropDoctor.capturePhoto", "Capture Photo")}
                    >
                      <div className="h-12 w-12 rounded-full bg-white flex items-center justify-center text-xl shadow-inner">
                        📸
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        stopCamera();
                        fileInputRef.current?.click();
                      }}
                      className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition-colors"
                    >
                      {t("cropDoctor.uploadFiles", "Browse Files")}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {errorMsg && (
              <div className="mt-3 rounded-xl bg-red-50 border border-red-200 p-3 text-xs text-red-700 flex items-center gap-2">
                <span>⚠️</span>
                <span>{errorMsg}</span>
              </div>
            )}
          </div>

          {/* Educational Quick Tips */}
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4 text-xs text-emerald-900 space-y-1.5">
            <h4 className="font-bold flex items-center gap-1.5 text-emerald-950">
              <span>💡</span> {t("cropDoctor.tipsTitle", "Photography Tips for High Accuracy")}
            </h4>
            <ul className="list-disc list-inside text-[11px] text-emerald-800 space-y-1">
              <li>Ensure bright, natural daylight without harsh glare or heavy shadows.</li>
              <li>Focus closely on infected leaf margins, lesions, or stem discoloration.</li>
              <li>For fruit quality grading, capture the whole fruit showing skin surface.</li>
            </ul>
          </div>
        </div>

        {/* Right Column: Diagnosis & Quality Control Results */}
        <div className="lg:col-span-7">
          {!diagnosis ? (
            <div className="rounded-3xl border border-gray-200/80 bg-white p-12 text-center shadow-xs flex flex-col items-center justify-center min-h-[350px]">
              <div className="h-16 w-16 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-3xl mb-3">
                🌿
              </div>
              <h3 className="text-base font-bold text-gray-900">
                {t("cropDoctor.awaitingScan", "Awaiting Crop Sample")}
              </h3>
              <p className="text-xs text-gray-500 max-w-sm mt-1">
                {t(
                  "cropDoctor.awaitingScanDesc",
                  "Upload or photograph a crop specimen to view disease diagnosis, treatment prescriptions, and quality grading."
                )}
              </p>
            </div>
          ) : diagnosis.diagnosisSource === "ai_model" ? (
            /* ==============================================================
               STATE A: Real AI Model Diagnosis (Full Color, Metrics & Grade)
               ============================================================== */
            <div className="space-y-6">
              {/* Primary Diagnostic Banner */}
              <div className="rounded-3xl border border-emerald-200 bg-gradient-to-br from-white via-emerald-50/30 to-teal-50/40 p-6 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-emerald-100">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-emerald-100 text-emerald-800 font-bold px-2.5 py-0.5 text-[10px] uppercase tracking-wider">
                        {diagnosis.cropName}
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                          diagnosis.severity === "Healthy"
                            ? "bg-emerald-100 text-emerald-800"
                            : diagnosis.severity === "Severe"
                            ? "bg-red-100 text-red-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {diagnosis.severity} Severity
                      </span>
                    </div>

                    <h3 className="text-xl font-black text-gray-900 mt-2">
                      {diagnosis.diseaseName}
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Pathogen Classification: <strong>{diagnosis.pathogenType}</strong>
                    </p>
                  </div>

                  {diagnosis.confidence && (
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-gray-400 uppercase">Estimated Confidence</p>
                      <p className="text-2xl font-black text-emerald-700">{diagnosis.confidence}%</p>
                      <span className="text-[9px] text-gray-400">Model estimate</span>
                    </div>
                  )}
                </div>

                {/* Visible Symptoms */}
                {diagnosis.symptoms && diagnosis.symptoms.length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                      {t("cropDoctor.observedSymptoms", "Observed Symptoms")}
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {diagnosis.symptoms.map((s, idx) => (
                        <span
                          key={idx}
                          className="rounded-lg bg-white border border-gray-200 px-2.5 py-1 text-xs text-gray-700 shadow-2xs font-medium"
                        >
                          • {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Produce Quality Control & Commercial Grading Card */}
              {diagnosis.qualityControl && (
                <div className="rounded-3xl border border-emerald-200/90 bg-white p-6 shadow-xs">
                  <div className="flex items-center justify-between gap-3 pb-3 border-b border-gray-100">
                    <h4 className="text-sm font-black text-gray-900 flex items-center gap-2">
                      <span>🏷️</span>
                      <span>{t("cropDoctor.qualityControl", "Produce Quality Control & Commercial Grade")}</span>
                    </h4>

                    <span
                      className={`rounded-xl px-3 py-1 text-xs font-black uppercase tracking-wider ${
                        diagnosis.qualityControl.grade === "A"
                          ? "bg-emerald-600 text-white shadow-xs"
                          : diagnosis.qualityControl.grade === "B"
                          ? "bg-blue-600 text-white shadow-xs"
                          : "bg-amber-600 text-white shadow-xs"
                      }`}
                    >
                      Grade {diagnosis.qualityControl.grade} (
                      {diagnosis.qualityControl.grade === "A"
                        ? "Export / Premium"
                        : diagnosis.qualityControl.grade === "B"
                        ? "Standard Mandi"
                        : "Processing"}
                      )
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-3 mt-4 text-center">
                    <div className="rounded-2xl bg-gray-50 p-3 border border-gray-100">
                      <p className="text-[10px] font-bold text-gray-400 uppercase">Freshness Index</p>
                      <p className="text-lg font-black text-emerald-700 mt-0.5">
                        {diagnosis.qualityControl.freshnessScore}/100
                      </p>
                    </div>

                    <div className="rounded-2xl bg-gray-50 p-3 border border-gray-100">
                      <p className="text-[10px] font-bold text-gray-400 uppercase">Est. Shelf Life</p>
                      <p className="text-lg font-black text-gray-900 mt-0.5">
                        {diagnosis.qualityControl.shelfLifeDays} Days
                      </p>
                    </div>

                    <div className="rounded-2xl bg-gray-50 p-3 border border-gray-100">
                      <p className="text-[10px] font-bold text-gray-400 uppercase">Price Valuation</p>
                      <p className="text-xs font-black text-emerald-800 mt-1.5">
                        {diagnosis.qualityControl.estimatedMarketPriceModifier}
                      </p>
                    </div>
                  </div>

                  {/* One-click Action to prefill ListingForm */}
                  <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between gap-3">
                    <p className="text-xs text-gray-500">
                      Ready to sell? Carry this verified grade directly to your marketplace listing.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        navigate(
                          `/farmer/listings/new?title=${encodeURIComponent(
                            diagnosis.cropName
                          )}&qualityGrade=Grade ${diagnosis.qualityControl?.grade}`
                        );
                      }}
                      className="rounded-xl bg-emerald-700 text-white px-4 py-2 text-xs font-bold hover:bg-emerald-800 transition-colors shadow-xs shrink-0"
                    >
                      {t("cropDoctor.listWithGrade", "List for Sale With Grade ↗")}
                    </button>
                  </div>
                </div>
              )}

              {/* Actionable Remedies Section */}
              {diagnosis.remedies && (
                <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-xs space-y-4">
                  <h4 className="text-sm font-black text-gray-900 flex items-center gap-2">
                    <span>🩺</span>
                    <span>{t("cropDoctor.prescribedRemedies", "Agronomic Prescriptions & Treatment")}</span>
                  </h4>

                  {/* Organic Remedies */}
                  {diagnosis.remedies.organic && diagnosis.remedies.organic.length > 0 && (
                    <div className="rounded-2xl bg-emerald-50/60 border border-emerald-200 p-4">
                      <h5 className="text-xs font-bold text-emerald-950 flex items-center gap-1.5 mb-2">
                        <span>🌱</span>
                        <span>{t("cropDoctor.organicRemedies", "Organic & Biological Controls")}</span>
                      </h5>
                      <ul className="space-y-1.5 text-xs text-emerald-900">
                        {diagnosis.remedies.organic.map((r, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-emerald-600 font-bold mt-0.5">✓</span>
                            <span>{r}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Chemical Remedies */}
                  {diagnosis.remedies.chemical && diagnosis.remedies.chemical.length > 0 && (
                    <div className="rounded-2xl bg-blue-50/60 border border-blue-200 p-4">
                      <h5 className="text-xs font-bold text-blue-950 flex items-center gap-1.5 mb-2">
                        <span>🧪</span>
                        <span>{t("cropDoctor.chemicalRemedies", "Scientific Chemical Control (Safe Dosages)")}</span>
                      </h5>
                      <ul className="space-y-1.5 text-xs text-blue-900">
                        {diagnosis.remedies.chemical.map((r, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-blue-600 font-bold mt-0.5">•</span>
                            <span>{r}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Prevention */}
                  {diagnosis.remedies.prevention && diagnosis.remedies.prevention.length > 0 && (
                    <div className="rounded-2xl bg-gray-50 border border-gray-200 p-4">
                      <h5 className="text-xs font-bold text-gray-800 flex items-center gap-1.5 mb-2">
                        <span>🛡️</span>
                        <span>{t("cropDoctor.prevention", "Preventive Field Management")}</span>
                      </h5>
                      <ul className="space-y-1.5 text-xs text-gray-700">
                        {diagnosis.remedies.prevention.map((r, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-gray-400">•</span>
                            <span>{r}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            /* ==============================================================
               STATE B: Basic Fallback State (Strictly Muted & Non-Fabricated)
               ============================================================== */
            <div className="rounded-3xl border border-gray-300 bg-slate-50 p-6 shadow-xs space-y-5">
              <div className="rounded-2xl bg-amber-100/80 border border-amber-300 p-4 text-amber-950 flex items-start gap-3">
                <span className="text-2xl mt-0.5">⚠️</span>
                <div>
                  <h4 className="text-sm font-black uppercase tracking-wider text-amber-900">
                    {t("cropDoctor.fallbackTitle", "Basic Check Only — Not an AI Diagnosis")}
                  </h4>
                  <p className="text-xs mt-1 leading-relaxed text-amber-900 font-medium">
                    {diagnosis.fallbackMessage}
                  </p>
                </div>
              </div>

              <div className="rounded-2xl bg-white border border-gray-200 p-5 space-y-3">
                <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                  General Agricultural Good Practices
                </h4>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Because algorithmic image analysis is currently operating in offline mode, no specific chemical
                  dosage or quality grade has been generated. We strongly recommend reaching out to:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3">
                    <p className="text-[11px] font-bold text-emerald-950">📞 Kisan Call Centre</p>
                    <p className="text-xs font-bold text-emerald-700 mt-1">1800-180-1551</p>
                    <p className="text-[10px] text-gray-500 mt-0.5">Toll-Free Government Agronomy Helpline</p>
                  </div>

                  <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-3">
                    <p className="text-[11px] font-bold text-blue-950">🏛️ Local Krishi Vigyan Kendra</p>
                    <p className="text-xs font-medium text-gray-600 mt-1">Visit your district agricultural officer</p>
                  </div>
                </div>

                {diagnosis.remedies?.organic && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <p className="text-[11px] font-bold text-gray-700 mb-1">Standard Field Hygiene:</p>
                    <ul className="list-disc list-inside text-xs text-gray-600 space-y-1">
                      {diagnosis.remedies.organic.map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
