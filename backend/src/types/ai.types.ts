export type DiagnosisSource = "ai_model" | "basic_fallback";

export interface QualityControlAssessment {
  grade: "A" | "B" | "C";
  freshnessScore: number; // 0-100
  shelfLifeDays: number;
  defects: string[];
  estimatedMarketPriceModifier: string; // e.g. "+10%", "Standard", "-15%"
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
  confidence?: number; // 0-100, ONLY present when diagnosisSource === 'ai_model'
  severity?: "Healthy" | "Mild" | "Moderate" | "Severe";
  pathogenType?: "Fungal" | "Bacterial" | "Viral" | "Pest" | "None" | "Unknown";
  symptoms?: string[];
  remedies?: CropRemedies; // Full remedies ONLY when diagnosisSource === 'ai_model'
  qualityControl?: QualityControlAssessment; // ONLY present when diagnosisSource === 'ai_model'
  fallbackMessage?: string; // ONLY present when diagnosisSource === 'basic_fallback'
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
