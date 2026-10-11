import { Request, Response } from "express";
import { AIService } from "../services/ai.service";

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

export async function diagnoseCrop(req: Request, res: Response): Promise<void> {
  try {
    const { image, mimeType = "image/jpeg", language = "en" } = req.body;

    if (!image || typeof image !== "string") {
      res.status(400).json({ error: "An image payload (base64 data) is required for crop diagnosis." });
      return;
    }

    if (!ALLOWED_MIME_TYPES.includes(mimeType.toLowerCase())) {
      res.status(400).json({
        error: `Unsupported image format (${mimeType}). Allowed formats: JPEG, PNG, WebP.`,
      });
      return;
    }

    // Estimate base64 byte length
    const approximateBytes = Math.ceil((image.length * 3) / 4);
    if (approximateBytes > MAX_IMAGE_SIZE_BYTES) {
      res.status(400).json({ error: "Image exceeds maximum allowed size of 10MB." });
      return;
    }

    const validLang = ["en", "hi", "mr"].includes(language) ? language : "en";
    const diagnosis = await AIService.diagnoseCropImage(image, mimeType, validLang as "en" | "hi" | "mr");

    res.status(200).json({
      success: true,
      data: diagnosis,
    });
  } catch (err: any) {
    console.error("Crop diagnosis controller error:", err);
    res.status(500).json({
      error: "Internal server error during crop diagnosis. Please try again.",
    });
  }
}

export async function assistantChat(req: Request, res: Response): Promise<void> {
  try {
    const { message, history = [], language = "en" } = req.body;

    if (!message || typeof message !== "string" || message.trim().length === 0) {
      res.status(400).json({ error: "A message string is required." });
      return;
    }

    const authUser = (req as any).user;
    const userId = authUser?.id || "guest";
    const userRole = authUser?.role || "guest";

    const validLang = ["en", "hi", "mr"].includes(language) ? language : "en";
    const response = await AIService.chatAssistant(
      message,
      Array.isArray(history) ? history : [],
      userId,
      userRole,
      validLang as "en" | "hi" | "mr"
    );

    res.status(200).json({
      success: true,
      data: response,
    });
  } catch (err: any) {
    console.error("Assistant chat controller error:", err);
    res.status(500).json({
      error: "Internal server error during assistant conversation.",
    });
  }
}
