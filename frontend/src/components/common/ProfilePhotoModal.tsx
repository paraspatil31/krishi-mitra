import { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/context/AuthContext";

interface ProfilePhotoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PRESET_FARMER_AVATARS = [
  {
    key: "progressiveKisan",
    url: "https://images.unsplash.com/photo-1595974482597-4b8da8879bc5?w=300&auto=format&fit=crop&q=80",
  },
  {
    key: "organicFarmer",
    url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80",
  },
  {
    key: "kisanProducer",
    url: "https://images.unsplash.com/photo-1544717305-2782549b5136?w=300&auto=format&fit=crop&q=80",
  },
  {
    key: "agriculturalist",
    url: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&auto=format&fit=crop&q=80",
  },
];

export default function ProfilePhotoModal({ isOpen, onClose }: ProfilePhotoModalProps) {
  const { t } = useTranslation();
  const { user, updateAvatar } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const defaultAvatar =
    user?.avatar ||
    (user?.role === "farmer"
      ? PRESET_FARMER_AVATARS[0].url
      : "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80");

  const [previewUrl, setPreviewUrl] = useState(defaultAvatar);
  const [urlInput, setUrlInput] = useState("");
  const [activeTab, setActiveTab] = useState<"upload" | "url" | "presets">("upload");
  const [errorMsg, setErrorMsg] = useState("");

  if (!isOpen) return null;

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setErrorMsg("");
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setErrorMsg("Please select a valid image file (PNG, JPG, WEBP).");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg("File size must be under 5MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (typeof event.target?.result === "string") {
        setPreviewUrl(event.target.result);
      }
    };
    reader.readAsDataURL(file);
  }

  function handleApplyUrl() {
    setErrorMsg("");
    if (!urlInput.trim()) {
      setErrorMsg("Please enter an image URL.");
      return;
    }
    setPreviewUrl(urlInput.trim());
  }

  function handleSave() {
    updateAvatar(previewUrl);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in-up">
      <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl border border-gray-100 animate-scale-in">
        <div className="flex items-center justify-between pb-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-xl font-bold text-emerald-800">
              📸
            </span>
            <div>
              <h3 className="text-lg font-black text-gray-900">{t("profile.updateProfilePicture")}</h3>
              <p className="text-xs text-gray-500">{t("profile.photoSubtitle")}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Live Preview Circle */}
        <div className="my-6 flex flex-col items-center justify-center">
          <div className="relative group">
            <img
              src={previewUrl}
              alt="Profile Preview"
              className="h-28 w-28 rounded-full object-cover ring-4 ring-emerald-600/30 shadow-lg"
            />
            <span className="absolute bottom-1 right-1 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-white text-xs ring-2 ring-white">
              ✓
            </span>
          </div>
          <p className="mt-2 text-xs font-bold text-gray-600">
            {user?.name ? user.name : t("nav.kisanProducer", "Kisan Producer")}
          </p>
          <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">
            {user?.role === "farmer" ? `🌾 ${t("badges.verifiedFarmer")}` : t("badges.verifiedBuyer")}
          </span>
        </div>

        {errorMsg && (
          <div className="mb-4 rounded-xl bg-red-50 border border-red-200 p-2.5 text-xs font-semibold text-red-700 text-center">
            {errorMsg}
          </div>
        )}

        {/* Tabs */}
        <div className="flex rounded-2xl bg-gray-100 p-1 mb-4 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab("upload")}
            className={`flex-1 py-2 rounded-xl transition-all ${
              activeTab === "upload" ? "bg-white text-emerald-800 shadow-xs" : "text-gray-600 hover:text-gray-900"
            }`}
          >
            📁 {t("profile.uploadFromDevice")}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("presets")}
            className={`flex-1 py-2 rounded-xl transition-all ${
              activeTab === "presets" ? "bg-white text-emerald-800 shadow-xs" : "text-gray-600 hover:text-gray-900"
            }`}
          >
            🌾 {t("profile.presets")}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("url")}
            className={`flex-1 py-2 rounded-xl transition-all ${
              activeTab === "url" ? "bg-white text-emerald-800 shadow-xs" : "text-gray-600 hover:text-gray-900"
            }`}
          >
            🔗 {t("profile.useImageUrl")}
          </button>
        </div>

        {/* Tab Content */}
        <div className="min-h-[120px]">
          {activeTab === "upload" && (
            <div className="space-y-3">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                className="hidden"
              />
              <div
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-emerald-300 bg-emerald-50/40 p-6 text-center cursor-pointer hover:bg-emerald-50/80 transition-all group"
              >
                <span className="text-3xl group-hover:scale-110 transition-transform">📷</span>
                <p className="mt-2 text-sm font-black text-emerald-900">{t("profile.clickToUpload")}</p>
                <p className="text-xs text-gray-500 mt-0.5">{t("profile.uploadHint")}</p>
              </div>
            </div>
          )}

          {activeTab === "presets" && (
            <div className="space-y-2">
              <p className="text-xs text-gray-500">{t("profile.choosePreset")}</p>
              <div className="grid grid-cols-4 gap-3">
                {PRESET_FARMER_AVATARS.map((preset) => (
                  <button
                    key={preset.key}
                    type="button"
                    onClick={() => setPreviewUrl(preset.url)}
                    className={`flex flex-col items-center gap-1.5 p-2 rounded-2xl border transition-all ${
                      previewUrl === preset.url
                        ? "border-emerald-600 bg-emerald-50 ring-2 ring-emerald-600/20"
                        : "border-gray-200 hover:border-emerald-300"
                    }`}
                  >
                    <img
                      src={preset.url}
                      alt={t(`profile.${preset.key}`)}
                      className="h-12 w-12 rounded-full object-cover"
                    />
                    <span className="text-[10px] font-bold text-gray-700 truncate max-w-full">
                      {t(`profile.${preset.key}`)}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeTab === "url" && (
            <div className="space-y-3">
              <label className="block text-xs font-bold text-gray-700">{t("profile.pasteImageUrl")}</label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  className="flex-1 rounded-2xl border border-gray-200 px-3.5 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <button
                  type="button"
                  onClick={handleApplyUrl}
                  className="rounded-2xl bg-gray-900 px-4 py-2 text-xs font-bold text-white hover:bg-gray-800 transition-colors"
                >
                  {t("profile.apply")}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-gray-200 px-5 py-2.5 text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            {t("common.cancel")}
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-700 px-6 py-2.5 text-xs font-black text-white hover:from-emerald-500 hover:to-emerald-600 shadow-md shadow-emerald-800/20 transition-all btn-spring"
          >
            {t("profile.savePhoto")}
          </button>
        </div>
      </div>
    </div>
  );
}
