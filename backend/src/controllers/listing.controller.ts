import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import crypto from "crypto";
import Listing from "../models/Listing";
import User from "../models/User";
import LedgerEntry from "../models/LedgerEntry";
import { LedgerService } from "../services/ledger.service";
import { AppError } from "../utils/AppError";
import {
  sanitizeString,
  validatePositiveNumber,
  validateCropUnit,
  validateHarvestDate,
} from "../utils/validation";

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const { search, category, status } = req.query;
    const q: any = { isActive: true };

    if (status) q.status = status;
    if (category) q.category = category;

    if (search) {
      const s = String(search).trim();
      if (s) {
        const regex = new RegExp(s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
        q.$or = [
          { name: regex },
          { category: regex },
          { description: regex },
          { location: regex },
          { farmerName: regex },
        ];
      }
    }

    const data = await Listing.find(q).sort({ createdAt: -1 });
    res.json({ data });
  } catch (e) {
    next(e);
  }
}

export async function getOne(req: Request, res: Response, next: NextFunction) {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      throw new AppError("Listing not found", 404);
    }
    const x = await Listing.findById(req.params.id);
    if (!x) throw new AppError("Listing not found", 404);
    res.json({ data: x });
  } catch (e) {
    next(e);
  }
}

export async function mine(req: Request, res: Response, next: NextFunction) {
  try {
    let allowedFarmerIds = [req.user!.id];
    if (req.user!.role === "fpo") {
      const members = await User.find({ fpoId: req.user!.id });
      allowedFarmerIds = [req.user!.id, ...members.map((m) => m.id)];
    }
    const data = await Listing.find({ farmerId: { $in: allowedFarmerIds } }).sort({ createdAt: -1 });
    res.json({ data });
  } catch (e) {
    next(e);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const {
      name: rawName,
      category: rawCategory,
      description: rawDescription,
      price: rawPrice,
      unit: rawUnit,
      quantity: rawQuantity,
      location: rawLocation,
      harvestDate: rawHarvestDate,
      status = "draft",
      images = [],
      qualityGrade = "A",
    } = req.body;

    // Strict input validation
    const name = sanitizeString(rawName, "Crop Name", { minLen: 2, maxLen: 100 });
    const category = sanitizeString(rawCategory, "Category", { minLen: 2, maxLen: 50 });
    const description = sanitizeString(rawDescription, "Description", { minLen: 5, maxLen: 2000 });
    const price = validatePositiveNumber(rawPrice, "Price", { min: 0.5, max: 1000000 });
    const quantity = validatePositiveNumber(rawQuantity, "Quantity", { min: 1, max: 500000 });
    const unit = validateCropUnit(rawUnit);
    const harvestDate = validateHarvestDate(rawHarvestDate);

    const user = await User.findById(req.user!.id);
    if (!user) throw new AppError("User not found", 404);

    let locationStr = typeof rawLocation === "string" ? rawLocation : (user.district || "Maharashtra, India");
    const location = sanitizeString(locationStr, "Location", { minLen: 2, maxLen: 150 });

    const geo =
      req.body.geo && req.body.geo.coordinates?.length === 2
        ? req.body.geo
        : typeof rawLocation === "object" && rawLocation?.coordinates?.length === 2
        ? rawLocation
        : user.location?.coordinates?.length === 2
        ? user.location
        : undefined;

    let farmerId = user.id;
    let farmerName = user.name;
    let memberFarmerId: string | undefined = undefined;
    let memberFarmerName: string | undefined = undefined;

    if (user.role === "fpo") {
      farmerName = user.fpoProfile?.orgName || user.name;
      if (req.body.memberFarmerId) {
        const member = await User.findOne({ _id: req.body.memberFarmerId, fpoId: user.id });
        if (member) {
          memberFarmerId = member.id;
          memberFarmerName = member.name;
          farmerName = `${user.fpoProfile?.orgName || user.name} (${member.name})`;
        }
      }
    }

    const listing = await Listing.create({
      name,
      category,
      description,
      price,
      unit,
      quantity,
      location,
      geo,
      harvestDate: harvestDate.toISOString().split("T")[0],
      status,
      images,
      farmerId,
      farmerName,
      fpoId: user.role === "fpo" ? user.id : user.fpoId,
      memberFarmerId,
      memberFarmerName,
      isActive: status === "active",
    });

    // Hard Rule #7: Blockchain ledger write is best-effort and asynchronous.
    // Must never block or fail listing creation.
    LedgerService.triggerAsyncLedgerWrite(listing, user);

    res.status(201).json({ data: listing });
  } catch (e) {
    next(e);
  }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    let allowedFarmerIds = [req.user!.id];
    if (req.user!.role === "fpo") {
      const members = await User.find({ fpoId: req.user!.id });
      allowedFarmerIds = [req.user!.id, ...members.map((m) => m.id)];
    }
    const x = await Listing.findOne({ _id: req.params.id, farmerId: { $in: allowedFarmerIds } });
    if (!x) throw new AppError("Listing not found", 404);

    const { name, category, description, price, unit, quantity, location, harvestDate, status, images } = req.body;

    if (name !== undefined) x.name = sanitizeString(name, "Crop Name", { minLen: 2, maxLen: 100 });
    if (category !== undefined) x.category = sanitizeString(category, "Category", { minLen: 2, maxLen: 50 });
    if (description !== undefined) x.description = sanitizeString(description, "Description", { minLen: 5, maxLen: 2000 });
    if (price !== undefined) x.price = validatePositiveNumber(price, "Price", { min: 0.5, max: 1000000 });
    if (quantity !== undefined) x.quantity = validatePositiveNumber(quantity, "Quantity", { min: 0, max: 500000 });
    if (unit !== undefined) x.unit = validateCropUnit(unit);
    if (harvestDate !== undefined) x.harvestDate = validateHarvestDate(harvestDate).toISOString().split("T")[0];
    if (location !== undefined) x.location = sanitizeString(location, "Location", { minLen: 2, maxLen: 150 });
    if (images !== undefined) x.images = images;
    if (status !== undefined) {
      x.status = status;
      x.isActive = status === "active" && x.quantity > 0;
    }

    await x.save();
    res.json({ data: x });
  } catch (e) {
    next(e);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    let allowedFarmerIds = [req.user!.id];
    if (req.user!.role === "fpo") {
      const members = await User.find({ fpoId: req.user!.id });
      allowedFarmerIds = [req.user!.id, ...members.map((m) => m.id)];
    }
    const x = await Listing.findOne({ _id: req.params.id, farmerId: { $in: allowedFarmerIds } });
    if (!x) throw new AppError("Listing not found", 404);

    x.isActive = false;
    x.status = "deleted";
    await x.save();

    res.json({ data: { message: "Listing soft-deleted successfully", id: x.id } });
  } catch (e) {
    next(e);
  }
}
