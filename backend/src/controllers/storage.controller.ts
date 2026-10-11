import { Request, Response, NextFunction } from "express";
import { StorageFacility } from "../models/StorageFacility";
import { AppError } from "../utils/AppError";

export const storageController = {
  /**
   * GET /api/storage
   * Query storage facilities with district, type, search keyword, or geospatial proximity.
   */
  async getStorageFacilities(req: Request, res: Response, next: NextFunction) {
    try {
      const { district, type, search, lat, lng, radiusKm } = req.query;

      const query: any = { isActive: true };

      if (district && typeof district === "string") {
        query.district = { $regex: new RegExp(district.trim(), "i") };
      }

      if (type && typeof type === "string") {
        query.type = type.trim();
      }

      if (search && typeof search === "string") {
        const searchRegex = { $regex: new RegExp(search.trim(), "i") };
        query.$or = [
          { name: searchRegex },
          { district: searchRegex },
          { address: searchRegex },
          { amenities: searchRegex },
        ];
      }

      // Geospatial filter if coordinates are provided
      if (lat && lng) {
        const latitude = Number(lat);
        const longitude = Number(lng);
        const maxDistMeters = (Number(radiusKm) || 100) * 1000; // default 100km

        if (!isNaN(latitude) && !isNaN(longitude)) {
          query.location = {
            $nearSphere: {
              $geometry: {
                type: "Point",
                coordinates: [longitude, latitude],
              },
              $maxDistance: maxDistMeters,
            },
          };
        }
      }

      const facilities = await StorageFacility.find(query).sort({
        availableCapacity: -1,
        createdAt: -1,
      });

      res.json({
        data: facilities,
        count: facilities.length,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/storage/:id
   * Retrieve details for a single storage facility.
   */
  async getStorageFacilityById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const facility = await StorageFacility.findOne({ _id: id, isActive: true });

      if (!facility) {
        throw new AppError("Storage facility not found", 404);
      }

      res.json({
        data: facility,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /api/storage (Admin only per T10.4)
   * Create an admin-curated storage facility entry.
   */
  async createStorageFacility(req: Request, res: Response, next: NextFunction) {
    try {
      const {
        name,
        type,
        district,
        state,
        address,
        pincode,
        coordinates, // [lng, lat]
        totalCapacity,
        availableCapacity,
        temperatureRange,
        pricePerTonPerMonth,
        amenities,
        contactPhone,
        contactEmail,
        operatingHours,
        wdraRegistered,
      } = req.body;

      if (!name || !type || !district || !address || !totalCapacity || !pricePerTonPerMonth || !contactPhone) {
        throw new AppError("Please provide all required storage facility fields", 400);
      }

      const facility = await StorageFacility.create({
        name,
        type,
        district,
        state: state || "Maharashtra",
        address,
        pincode: pincode || "400001",
        location: {
          type: "Point",
          coordinates: Array.isArray(coordinates) && coordinates.length === 2 ? coordinates : [73.8567, 18.5204],
        },
        totalCapacity: Number(totalCapacity),
        availableCapacity: availableCapacity !== undefined ? Number(availableCapacity) : Number(totalCapacity),
        capacityUpdatedAt: new Date(),
        temperatureRange,
        pricePerTonPerMonth: Number(pricePerTonPerMonth),
        amenities: Array.isArray(amenities) ? amenities : [],
        contactPhone,
        contactEmail,
        operatingHours: operatingHours || "08:00 AM - 08:00 PM",
        wdraRegistered: wdraRegistered ?? true,
        isActive: true,
      });

      res.status(201).json({
        message: "Storage facility created successfully",
        data: facility,
      });
    } catch (err) {
      next(err);
    }
  },
};
