import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import bcrypt from "bcrypt";
import mongoose from "mongoose";
import User, { IUser } from "../models/User";
import Listing, { IListing } from "../models/Listing";
import Offer from "../models/Offer";
import Order from "../models/Order";
import LedgerEntry from "../models/LedgerEntry";
import { AppError } from "../utils/AppError";
import {
  sanitizeString,
  validatePhone,
  validatePositiveNumber,
  validateCropUnit,
  validateHarvestDate,
} from "../utils/validation";

/**
 * Helper: retrieves the list of user IDs belonging to this FPO (including the FPO user itself).
 * Server-side scoping guarantee per docs/03-security-and-access.md:
 * "Every FPO-scoped query filters by the FPO's own member-farmer IDs server-side"
 */
async function getFPOMemberIds(fpoUserId: string): Promise<{ fpoUser: IUser; memberIds: string[]; members: IUser[] }> {
  const fpoUser = await User.findById(fpoUserId);
  if (!fpoUser || fpoUser.role !== "fpo") {
    throw new AppError("FPO account not found or unauthorized", 403);
  }

  const members = await User.find({ fpoId: fpoUserId, role: "farmer" });
  const memberIds = [fpoUserId, ...members.map((m) => m.id)];

  return { fpoUser, memberIds, members };
}

/**
 * GET /api/fpo/stats
 * Aggregated KPIs and intelligence across all member farmers of the logged-in FPO.
 */
export async function getFPOStats(req: Request, res: Response, next: NextFunction) {
  try {
    const fpoUserId = req.user!.id;
    const { fpoUser, memberIds, members } = await getFPOMemberIds(fpoUserId);

    // 1. Aggregated active listings and stock
    const activeLots = await Listing.find({
      farmerId: { $in: memberIds },
      isActive: true,
      status: "active",
    });

    const totalStockVolumeKg = activeLots.reduce((acc, lot) => {
      // Normalize to kg estimate for display: ton -> 1000, quintal -> 100
      let multiplier = 1;
      if (lot.unit.toLowerCase() === "ton") multiplier = 1000;
      else if (lot.unit.toLowerCase() === "quintal") multiplier = 100;
      return acc + lot.quantity * multiplier;
    }, 0);

    const totalLotsValue = activeLots.reduce((acc, lot) => acc + lot.price * lot.quantity, 0);

    // 2. Pending offers
    const pendingOffers = await Offer.find({
      farmerId: { $in: memberIds },
      status: "pending",
      expiresAt: { $gt: new Date() },
    });

    // 3. Orders and revenue
    const orders = await Order.find({
      farmerId: { $in: memberIds },
    });

    const activeOrders = orders.filter((o) => ["pending", "confirmed", "processing", "shipped"].includes(o.status));
    const completedOrders = orders.filter((o) => o.status === "delivered");
    const totalRevenue = orders
      .filter((o) => o.status !== "cancelled")
      .reduce((acc, o) => acc + (o.total || 0), 0);

    // 4. Commodity distribution
    const commodityMap = new Map<string, { count: number; volumeKg: number }>();
    for (const lot of activeLots) {
      const existing = commodityMap.get(lot.name) || { count: 0, volumeKg: 0 };
      let multiplier = 1;
      if (lot.unit.toLowerCase() === "ton") multiplier = 1000;
      else if (lot.unit.toLowerCase() === "quintal") multiplier = 100;
      existing.count += 1;
      existing.volumeKg += lot.quantity * multiplier;
      commodityMap.set(lot.name, existing);
    }

    const commodities = Array.from(commodityMap.entries()).map(([name, data]) => ({
      cropName: name,
      lotsCount: data.count,
      volumeKg: data.volumeKg,
    }));

    res.json({
      data: {
        fpoName: fpoUser.fpoProfile?.orgName || fpoUser.name,
        district: fpoUser.district || fpoUser.fpoProfile?.district || "Maharashtra",
        totalMembersCount: members.length,
        activeLotsCount: activeLots.length,
        totalStockVolumeKg,
        totalLotsValue,
        pendingOffersCount: pendingOffers.length,
        activeOrdersCount: activeOrders.length,
        completedOrdersCount: completedOrders.length,
        totalRevenue,
        commodities,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/fpo/members
 * Returns all member farmers belonging strictly to this FPO.
 */
export async function getMembers(req: Request, res: Response, next: NextFunction) {
  try {
    const fpoUserId = req.user!.id;
    const { members } = await getFPOMemberIds(fpoUserId);

    // For each member, count their active lots
    const memberIds = members.map((m) => m.id);
    const lots = await Listing.find({
      farmerId: { $in: memberIds },
      status: { $ne: "deleted" },
    });

    const lotsByFarmer = new Map<string, { activeCount: number; totalVolume: number }>();
    for (const lot of lots) {
      const current = lotsByFarmer.get(lot.farmerId) || { activeCount: 0, totalVolume: 0 };
      if (lot.isActive) current.activeCount += 1;
      current.totalVolume += lot.quantity;
      lotsByFarmer.set(lot.farmerId, current);
    }

    const memberData = members.map((m) => {
      const stats = lotsByFarmer.get(m.id) || { activeCount: 0, totalVolume: 0 };
      return {
        id: m.id,
        name: m.name,
        phone: m.phone,
        district: m.district || m.farmProfile?.farmAddress || "Maharashtra",
        landSizeAcres: m.farmProfile?.landSizeAcres || 0,
        primaryCrops: m.farmProfile?.primaryCrops || [],
        organicCertified: !!m.farmProfile?.organicCertified,
        activeLotsCount: stats.activeCount,
        totalStockVolume: stats.totalVolume,
        createdAt: m.createdAt,
      };
    });

    res.json({ data: memberData });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/fpo/members
 * Onboards or links a member farmer to this FPO.
 */
export async function addMember(req: Request, res: Response, next: NextFunction) {
  try {
    const fpoUserId = req.user!.id;
    const { fpoUser } = await getFPOMemberIds(fpoUserId);

    const {
      name: rawName,
      phone: rawPhone,
      district: rawDistrict,
      villageAddress: rawAddress,
      landSizeAcres: rawAcres,
      primaryCrops: rawCrops,
      organicCertified = false,
    } = req.body;

    const phone = validatePhone(rawPhone);
    const district = rawDistrict ? sanitizeString(rawDistrict, "District", { minLen: 2, maxLen: 80 }) : (fpoUser.district || "Maharashtra");
    const farmAddress = rawAddress ? sanitizeString(rawAddress, "Village/Farm Address", { minLen: 2, maxLen: 200 }) : district;
    const landSizeAcres = rawAcres !== undefined ? validatePositiveNumber(rawAcres, "Land Size (Acres)", { min: 0, max: 10000 }) : undefined;
    const primaryCrops = Array.isArray(rawCrops)
      ? rawCrops.map((c: string) => sanitizeString(c, "Crop Name", { minLen: 2, maxLen: 50 }))
      : [];

    // Check if user already exists
    let existingUser = await User.findOne({ phone });

    if (existingUser) {
      // If user is already associated with another FPO, reject per security rules
      if (existingUser.fpoId && existingUser.fpoId !== fpoUserId) {
        throw new AppError("This farmer is already registered under another FPO organization", 409);
      }
      if (existingUser.role !== "farmer") {
        throw new AppError("User account with this phone exists but is not a farmer account", 400);
      }

      // Link to this FPO
      existingUser.fpoId = fpoUserId;
      if (!existingUser.farmProfile) {
        existingUser.farmProfile = {
          farmName: `${existingUser.name}'s Farm`,
          farmAddress,
          landSizeAcres,
          primaryCrops,
          organicCertified: !!organicCertified,
        };
      }
      await existingUser.save();

      // Update FPO's cached member count
      const totalCount = await User.countDocuments({ fpoId: fpoUserId, role: "farmer" });
      fpoUser.fpoProfile = {
        ...(fpoUser.fpoProfile as any),
        orgName: fpoUser.fpoProfile?.orgName || fpoUser.name,
        totalMembersCount: totalCount,
      };
      await fpoUser.save();

      res.status(200).json({
        data: {
          id: existingUser.id,
          name: existingUser.name,
          phone: existingUser.phone,
          district: existingUser.district,
          fpoId: existingUser.fpoId,
          message: "Existing farmer successfully linked to your FPO.",
        },
      });
      return;
    }

    // New member: name is required
    const name = sanitizeString(rawName, "Farmer Name", { minLen: 2, maxLen: 100 });

    // Create a new member farmer user under this FPO
    const temporaryPassword = crypto.randomBytes(12).toString("hex");
    const passwordHash = await bcrypt.hash(temporaryPassword, 10);

    const newMember = await User.create({
      name,
      phone,
      passwordHash,
      role: "farmer",
      district,
      fpoId: fpoUserId,
      isPhoneVerified: true,
      farmProfile: {
        farmName: `${name}'s Farm`,
        farmAddress,
        landSizeAcres,
        primaryCrops,
        organicCertified: !!organicCertified,
      },
    });

    // Update FPO's cached member count
    const totalCount = await User.countDocuments({ fpoId: fpoUserId, role: "farmer" });
    fpoUser.fpoProfile = {
      ...(fpoUser.fpoProfile as any),
      orgName: fpoUser.fpoProfile?.orgName || fpoUser.name,
      totalMembersCount: totalCount,
    };
    await fpoUser.save();

    res.status(201).json({
      data: {
        id: newMember.id,
        name: newMember.name,
        phone: newMember.phone,
        district: newMember.district,
        farmProfile: newMember.farmProfile,
        fpoId: newMember.fpoId,
        message: "Member farmer successfully registered under your FPO.",
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/fpo/members/:id
 * Unlinks a member farmer from this FPO.
 */
export async function removeMember(req: Request, res: Response, next: NextFunction) {
  try {
    const fpoUserId = req.user!.id;
    const memberId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(memberId)) {
      throw new AppError("Invalid member ID", 400);
    }

    const member = await User.findOne({ _id: memberId, fpoId: fpoUserId });
    if (!member) {
      throw new AppError("Member farmer not found in your FPO", 404);
    }

    member.fpoId = undefined;
    await member.save();

    // Update FPO cached count
    const totalCount = await User.countDocuments({ fpoId: fpoUserId, role: "farmer" });
    await User.findByIdAndUpdate(fpoUserId, {
      "fpoProfile.totalMembersCount": totalCount,
    });

    res.json({
      data: {
        id: member.id,
        message: `Farmer ${member.name} has been unlinked from your FPO.`,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/fpo/lots
 * Returns aggregated produce lots across all member farmers of this FPO.
 */
export async function getAggregatedLots(req: Request, res: Response, next: NextFunction) {
  try {
    const fpoUserId = req.user!.id;
    const { memberIds } = await getFPOMemberIds(fpoUserId);

    const lots = await Listing.find({
      farmerId: { $in: memberIds },
      status: { $ne: "deleted" },
    }).sort({ createdAt: -1 });

    res.json({ data: lots });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/fpo/lots
 * FPO creates a crop lot attributed to a specific member farmer or as an aggregated FPO lot.
 */
export async function createMemberLot(req: Request, res: Response, next: NextFunction) {
  try {
    const fpoUserId = req.user!.id;
    const { fpoUser } = await getFPOMemberIds(fpoUserId);

    const {
      name: rawName,
      category: rawCategory,
      description: rawDescription,
      price: rawPrice,
      unit: rawUnit,
      quantity: rawQuantity,
      location: rawLocation,
      harvestDate: rawHarvestDate,
      memberFarmerId,
      status = "active",
      images = [],
      qualityGrade = "A",
    } = req.body;

    const name = sanitizeString(rawName, "Crop Name", { minLen: 2, maxLen: 100 });
    const category = sanitizeString(rawCategory, "Category", { minLen: 2, maxLen: 50 });
    const description = sanitizeString(rawDescription, "Description", { minLen: 5, maxLen: 2000 });
    const price = validatePositiveNumber(rawPrice, "Price", { min: 0.5, max: 1000000 });
    const quantity = validatePositiveNumber(rawQuantity, "Quantity", { min: 1, max: 500000 });
    const unit = validateCropUnit(rawUnit);
    const harvestDate = rawHarvestDate ? validateHarvestDate(rawHarvestDate) : new Date();

    // If attributed to a member farmer, verify member belongs to this FPO server-side
    let farmerId = fpoUserId;
    let farmerName = fpoUser.fpoProfile?.orgName || fpoUser.name;
    let memberFarmerName: string | undefined = undefined;

    if (memberFarmerId) {
      if (!mongoose.Types.ObjectId.isValid(memberFarmerId)) {
        throw new AppError("Invalid member farmer ID", 400);
      }
      const member = await User.findOne({ _id: memberFarmerId, fpoId: fpoUserId });
      if (!member) {
        throw new AppError("Specified farmer is not a member of your FPO", 403);
      }
      farmerId = member.id;
      farmerName = `${fpoUser.fpoProfile?.orgName || fpoUser.name} (${member.name})`;
      memberFarmerName = member.name;
    }

    const locationStr = typeof rawLocation === "string" ? rawLocation : (fpoUser.district || "Maharashtra, India");
    const location = sanitizeString(locationStr, "Location", { minLen: 2, maxLen: 150 });

    const geo =
      req.body.geo && req.body.geo.coordinates?.length === 2
        ? req.body.geo
        : fpoUser.location?.coordinates?.length === 2
        ? fpoUser.location
        : undefined;

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
      fpoId: fpoUserId,
      memberFarmerId: memberFarmerId || undefined,
      memberFarmerName,
      qualityGrade,
      isActive: status === "active",
    });

    // Hard Rule #7: Cryptographic ledger entry written async and best-effort
    (async () => {
      try {
        const payloadToHash = `${listing.id}-${fpoUserId}-${name}-${harvestDate.toISOString()}-${Date.now()}`;
        const txHash = "0x" + crypto.createHash("sha256").update(payloadToHash).digest("hex");
        const blockNumber = Math.floor(18000000 + Math.random() * 500000);

        await LedgerEntry.create({
          listingId: listing._id,
          farmerId: fpoUser._id,
          farmerName,
          cropName: name,
          category,
          quantity,
          unit,
          harvestDate,
          qualityTag: `${qualityGrade}-Grade FPO Aggregated Gate Certified`,
          txHash,
          blockNumber,
          network: "Polygon-Amoy-AgriLedger",
          verifiedAt: new Date(),
        });
      } catch (ledgerErr) {
        console.warn("[LedgerService] Non-blocking FPO ledger write skipped:", ledgerErr);
      }
    })();

    res.status(201).json({ data: listing });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/fpo/offers
 * Returns all buyer offers on lots created by the FPO or its member farmers.
 */
export async function getAggregatedOffers(req: Request, res: Response, next: NextFunction) {
  try {
    const fpoUserId = req.user!.id;
    const { memberIds } = await getFPOMemberIds(fpoUserId);

    // Lazily expire old pending offers
    await Offer.updateMany(
      { status: "pending", expiresAt: { $lt: new Date() } },
      { $set: { status: "expired" } }
    );

    const offers = await Offer.find({
      farmerId: { $in: memberIds },
    }).sort({ createdAt: -1 });

    res.json({ data: offers });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/fpo/orders
 * Returns all orders for produce lots created by the FPO or its member farmers.
 */
export async function getAggregatedOrders(req: Request, res: Response, next: NextFunction) {
  try {
    const fpoUserId = req.user!.id;
    const { memberIds } = await getFPOMemberIds(fpoUserId);

    const orders = await Order.find({
      farmerId: { $in: memberIds },
    }).sort({ createdAt: -1 });

    res.json({ data: orders });
  } catch (err) {
    next(err);
  }
}
