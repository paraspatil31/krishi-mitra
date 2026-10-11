import { Request, Response, NextFunction } from "express";
import { MandiService } from "../services/mandi.service";
import { AppError } from "../utils/AppError";

/**
 * GET /api/mandi-prices
 * Query parameters: cropName, district, marketName, date, page, limit
 */
export async function listPrices(req: Request, res: Response, next: NextFunction) {
  try {
    const { cropName, district, marketName, date, page, limit } = req.query;

    const result = await MandiService.getPrices({
      cropName: typeof cropName === "string" ? cropName : undefined,
      district: typeof district === "string" ? district : undefined,
      marketName: typeof marketName === "string" ? marketName : undefined,
      date: typeof date === "string" ? date : undefined,
      page: page ? parseInt(page as string, 10) : undefined,
      limit: limit ? parseInt(limit as string, 10) : undefined,
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
}

/**
 * POST or GET /api/mandi-prices/refresh
 * Triggers manual or automated rate synchronization with Data.gov.in
 */
export async function refreshRates(req: Request, res: Response, next: NextFunction) {
  try {
    const force = req.query.force === "true" || req.body?.force === true;
    const result = await MandiService.refreshRates(force);

    res.json({
      success: true,
      count: result.count,
      refreshedAt: result.refreshedAt,
      source: result.source,
      cached: result.cached,
      message: result.cached
        ? "Served cached APMC rates to protect API quota"
        : `Synchronized ${result.count} records from Data.gov.in / Agmarknet`,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/mandi-prices/trends
 * Query parameters: cropName (required), days (optional, default 14)
 */
export async function getTrends(req: Request, res: Response, next: NextFunction) {
  try {
    const { cropName, days } = req.query;

    if (!cropName || typeof cropName !== "string") {
      throw new AppError("Query parameter 'cropName' is required", 400);
    }

    const numDays = days ? parseInt(days as string, 10) : 14;
    const result = await MandiService.getTrends(cropName, numDays);

    res.json({
      data: result.data,
      cropName: result.cropName,
      days: numDays,
      daysRequested: result.daysRequested,
      daysAvailable: result.daysAvailable,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/mandi-prices/crops
 * Returns summary list of all tracked crops and current modal rates
 */
export async function getCropsSummary(_req: Request, res: Response, next: NextFunction) {
  try {
    const crops = await MandiService.getCropsSummary();
    res.json({ data: crops });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/mandi-prices/benchmark/:cropName
 * Optional query: district
 */
export async function getBenchmark(req: Request, res: Response, next: NextFunction) {
  try {
    const { cropName } = req.params;
    const district = req.query.district as string | undefined;

    const benchmark = await MandiService.getBenchmark(cropName, district);

    if (!benchmark) {
      return res.status(404).json({
        error: `No mandi benchmark found for '${cropName}'`,
      });
    }

    res.json({ data: benchmark });
  } catch (err) {
    next(err);
  }
}
