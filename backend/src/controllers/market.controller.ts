import { Request, Response, NextFunction } from "express";
import { marketService } from "../services/market.service";
import { MarketType } from "../models/Market";
import { AppError } from "../utils/AppError";

export const marketController = {
  /**
   * GET /api/markets/nearby
   * Find nearby APMC markets, sub-yards, and collection centers.
   * Query params: lat, lng, radius (in km), type, commodity, district, search, enamOnly
   */
  async getNearbyMarkets(req: Request, res: Response, next: NextFunction) {
    try {
      const {
        lat,
        lng,
        radius,
        radiusKm,
        type,
        commodity,
        district,
        search,
        enamOnly,
      } = req.query;

      const latitude = lat ? parseFloat(lat as string) : undefined;
      const longitude = lng ? parseFloat(lng as string) : undefined;
      const radiusValue = radius || radiusKm;
      const parsedRadius = radiusValue ? parseFloat(radiusValue as string) : 50;

      // Validate coordinate pairs if either is provided
      if ((latitude !== undefined && longitude === undefined) || (latitude === undefined && longitude !== undefined)) {
        throw new AppError("Both 'lat' and 'lng' query parameters are required for geospatial search", 400);
      }

      if (latitude !== undefined && (isNaN(latitude) || latitude < -90 || latitude > 90)) {
        throw new AppError("Invalid 'lat' coordinate: must be between -90 and 90", 400);
      }

      if (longitude !== undefined && (isNaN(longitude) || longitude < -180 || longitude > 180)) {
        throw new AppError("Invalid 'lng' coordinate: must be between -180 and 180", 400);
      }

      const markets = await marketService.findNearbyMarkets({
        lat: latitude,
        lng: longitude,
        radiusKm: parsedRadius,
        marketType: type as MarketType,
        commodity: commodity as string,
        district: district as string,
        search: search as string,
        enamOnly: enamOnly === "true" || enamOnly === "1",
      });

      res.json({
        data: markets,
        count: markets.length,
        query: {
          lat: latitude,
          lng: longitude,
          radiusKm: parsedRadius,
          district: district || null,
          type: type || null,
          commodity: commodity || null,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/markets/commodities
   * Unique list of commodities traded across markets.
   */
  async getTradedCommodities(_req: Request, res: Response, next: NextFunction) {
    try {
      const commodities = await marketService.getTradedCommodities();
      res.json({
        data: commodities,
        count: commodities.length,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/markets/:id
   * Get single market details by ID.
   */
  async getMarketById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const market = await marketService.getMarketById(id);

      if (!market) {
        throw new AppError("Agricultural market not found", 404);
      }

      res.json({
        data: market,
      });
    } catch (error) {
      next(error);
    }
  },
};

export default marketController;
