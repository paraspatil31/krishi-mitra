import { api } from "./api";
import { CropDiagnosisResponse, AIChatResponse } from "../types/ai";

export const aiService = {
  /**
   * Diagnoses crop leaf/produce image and evaluates quality control grade.
   */
  async diagnoseCrop(imageBase64: string, mimeType: string = "image/jpeg", language: string = "en"): Promise<CropDiagnosisResponse> {
    const res = await api.post<{ success: boolean; data: CropDiagnosisResponse }>("/ai/diagnose", {
      image: imageBase64,
      mimeType,
      language,
    });
    return res.data;
  },

  /**
   * Conversational voice & assistant reasoning
   */
  async chatAssistant(
    message: string,
    history: Array<{ role: "user" | "assistant"; content: string }> = [],
    language: string = "en"
  ): Promise<AIChatResponse> {
    const res = await api.post<{ success: boolean; data: AIChatResponse }>("/ai/chat", {
      message,
      history,
      language,
    });
    return res.data;
  },
};
