export type DiagnosisSource = "ai_model" | "basic_fallback";

export interface QualityControlAssessment {
  grade: "A" | "B" | "C";
  freshnessScore: number;
  shelfLifeDays: number;
  defects: string[];
  estimatedMarketPriceModifier: string;
}

export interface CropRemedies {
  organic: string[];
  chemical?: string[];
  prevention: string[];
}

export interface CropDiagnosisResponse {
  diagnosisSource: DiagnosisSource;
  cropName: string;
  diseaseName?: string;
  confidence?: number;
  severity?: "Healthy" | "Mild" | "Moderate" | "Severe";
  pathogenType?: "Fungal" | "Bacterial" | "Viral" | "Pest" | "None" | "Unknown";
  symptoms?: string[];
  remedies?: CropRemedies;
  qualityControl?: QualityControlAssessment;
  fallbackMessage?: string;
  analyzedAt: string;
}

export interface ChatNavigationAction {
  type: "navigate";
  path: string;
  label: string;
}

export interface AIChatResponse {
  message: string;
  action?: ChatNavigationAction;
  source: "ai_model" | "voice_commander";
  suggestedPrompts?: string[];
}
