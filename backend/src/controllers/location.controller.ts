import { Request, Response, NextFunction } from "express";
import { searchLocation, reverseGeocode, verifyCoordinates } from "../services/location.service";
import { AppError } from "../utils/AppError";

/**
 * Searches locations using OpenStreetMap Nominatim.
 */
export async function search(req: Request, res: Response, next: NextFunction) {
  try {
    const q = req.query.q as string;
    if (!q) {
      throw new AppError("Search query 'q' parameter is required", 400);
    }
    const results = await searchLocation(q);
    res.json({ data: results });
  } catch (err) {
    next(err);
  }
}

/**
 * Reverse geocodes coordinates using OpenStreetMap Nominatim.
 */
export async function reverse(req: Request, res: Response, next: NextFunction) {
  try {
    const lat = parseFloat(req.query.lat as string);
    const lng = parseFloat(req.query.lng as string);

    if (isNaN(lat) || isNaN(lng)) {
      throw new AppError("Valid 'lat' and 'lng' query parameters are required", 400);
    }

    const result = await reverseGeocode(lat, lng);
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
}

/**
 * Verifies if coordinates or an address represent a valid Indian agricultural location.
 */
export async function verify(req: Request, res: Response, next: NextFunction) {
  try {
    const { lat, lng, address } = req.body;

    if (lat !== undefined && lng !== undefined) {
      const numLat = parseFloat(lat);
      const numLng = parseFloat(lng);
      const isValid = verifyCoordinates(numLat, numLng);
      const details = await reverseGeocode(numLat, numLng);
      res.json({
        data: {
          isValid,
          ...details,
        },
      });
      return;
    }

    if (address) {
      const results = await searchLocation(address);
      if (!results.length) {
        throw new AppError("Location could not be found or verified", 404);
      }
      res.json({ data: { isValid: true, ...results[0] } });
      return;
    }

    throw new AppError("Please provide either 'lat' & 'lng' or 'address' to verify", 400);
  } catch (err) {
    next(err);
  }
}
