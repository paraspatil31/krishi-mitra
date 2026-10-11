import { Request, Response, NextFunction } from "express";
import User from "../models/User";
import Listing from "../models/Listing";
import Order from "../models/Order";
import { AppError } from "../utils/AppError";

export async function users(req: Request, res: Response, next: NextFunction) {
  try {
    res.json({ data: await User.find().select("-passwordHash").sort({ createdAt: -1 }) });
  } catch (e) {
    next(e);
  }
}

export async function listings(req: Request, res: Response, next: NextFunction) {
  try {
    res.json({ data: await Listing.find().sort({ createdAt: -1 }) });
  } catch (e) {
    next(e);
  }
}

export async function orders(req: Request, res: Response, next: NextFunction) {
  try {
    res.json({ data: await Order.find().sort({ createdAt: -1 }) });
  } catch (e) {
    next(e);
  }
}

export async function updateListing(req: Request, res: Response, next: NextFunction) {
  try {
    const x = await Listing.findById(req.params.id);
    if (!x) throw new AppError("Listing not found", 404);
    if (req.body.status) {
      x.status = req.body.status;
      x.isActive = req.body.status === "active";
    }
    await x.save();
    res.json({ data: x });
  } catch (e) {
    next(e);
  }
}

export async function updateOrder(req: Request, res: Response, next: NextFunction) {
  try {
    const x = await Order.findById(req.params.id);
    if (!x) throw new AppError("Order not found", 404);
    x.status = req.body.status;
    await x.save();
    res.json({ data: x });
  } catch (e) {
    next(e);
  }
}

/**
 * Admin Buyer Verification toggle (Ticket T9.1 / docs/04 line 136)
 * PATCH /api/admin/users/:id/verify
 */
export async function verifyUser(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { isVerifiedBuyer, notes = "Verified by platform administrator" } = req.body;

    const user = await User.findById(id);
    if (!user) {
      throw new AppError("User not found", 404);
    }

    const shouldVerify = isVerifiedBuyer !== undefined ? Boolean(isVerifiedBuyer) : !user.isVerifiedBuyer;

    user.isVerifiedBuyer = shouldVerify;
    user.verificationDetails = {
      verifiedAt: shouldVerify ? new Date() : undefined,
      verifiedBy: req.user!.id,
      notes,
    };

    await user.save();

    res.json({
      data: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        role: user.role,
        isVerifiedBuyer: user.isVerifiedBuyer,
        verificationDetails: user.verificationDetails,
      },
      message: `User ${user.name} verification status updated to ${shouldVerify ? "VERIFIED" : "UNVERIFIED"}`,
    });
  } catch (e) {
    next(e);
  }
}

export async function stats(req: Request, res: Response, next: NextFunction) {
  try {
    const [usersCount, farmersCount, buyersCount, listingsCount, ordersCount] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: "farmer" }),
      User.countDocuments({ role: "buyer" }),
      Listing.countDocuments({ isActive: true }),
      Order.countDocuments(),
    ]);
    res.json({ data: { users: usersCount, farmers: farmersCount, buyers: buyersCount, listings: listingsCount, orders: ordersCount } });
  } catch (e) {
    next(e);
  }
}
