import { Request, Response, NextFunction } from "express";
import { PredictionService } from "../services/prediction.service";
import { AppError } from "../utils/AppError";
import { sanitizeString } from "../utils/validation";

/**
 * GET /api/predictions
 * Query parameters:
 *  - crop (or cropName): string (required)
 *  - district: string (optional)
 *  - days: number (optional, default 7, range 1-14)
 *
 * Calls the Python AI microservice (ai-service/) over HTTP.
 * Guaranteed to degrade gracefully if the AI microservice is offline or slow.
 */
export async function getPrediction(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const rawCrop = (req.query.crop || req.query.cropName) as string;
    const rawDistrict = req.query.district as string | undefined;
    const rawDays = req.query.days as string | undefined;

    if (!rawCrop || typeof rawCrop !== "string" || !rawCrop.trim()) {
      throw new AppError("Query parameter 'crop' (or 'cropName') is required", 400);
    }

    const cropName = sanitizeString(rawCrop, "Crop Name", { minLen: 2, maxLen: 80 });
    const district = rawDistrict
      ? sanitizeString(rawDistrict, "District", { minLen: 2, maxLen: 80 })
      : undefined;

    let days = 7;
    if (rawDays) {
      const parsed = parseInt(rawDays, 10);
      if (!isNaN(parsed)) {
        days = Math.max(1, Math.min(14, parsed));
      }
    }

    const prediction = await PredictionService.getPrediction(cropName, district, days);

    res.json({
      data: prediction,
    });
  } catch (err) {
    next(err);
  }
}
