import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import Offer, { IOffer } from "../models/Offer";
import Listing from "../models/Listing";
import Order from "../models/Order";
import User from "../models/User";
import { AppError } from "../utils/AppError";
import { notificationService } from "../services/notification.service";

// Helper for MongoDB transaction retries on transient errors per Hard Rule #2 & T9.5
async function runWithTransactionRetry(
  session: mongoose.ClientSession,
  fn: () => Promise<void>,
  maxRetries = 3
): Promise<void> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await session.withTransaction(fn);
      return;
    } catch (err: any) {
      const isTransient =
        err?.errorLabels?.includes("TransientTransactionError") && attempt < maxRetries;
      if (!isTransient) throw err;
      await new Promise((resolve) => setTimeout(resolve, 50 * attempt));
    }
  }
}

/**
 * POST /api/offers
 * Buyer proposes a price & volume bid on an active produce listing.
 */
export async function createOffer(req: Request, res: Response, next: NextFunction) {
  try {
    const { listingId, offerPrice, offerQuantity, note } = req.body;

    if (!listingId) {
      throw new AppError("Listing ID is required", 400);
    }
    if (!offerPrice || typeof offerPrice !== "number" || offerPrice <= 0) {
      throw new AppError("A valid positive offer price is required", 400);
    }
    if (!offerQuantity || typeof offerQuantity !== "number" || offerQuantity <= 0) {
      throw new AppError("A valid positive offer quantity is required", 400);
    }

    // Server-side listing re-fetch per Hard Rule #1
    const listing = await Listing.findById(listingId);
    if (!listing || !listing.isActive) {
      throw new AppError("Produce listing is not currently available", 404);
    }

    if (offerQuantity > listing.quantity) {
      throw new AppError(
        `Requested quantity (${offerQuantity} ${listing.unit}) exceeds available farm stock (${listing.quantity} ${listing.unit})`,
        400
      );
    }

    const buyer = await User.findById(req.user!.id);
    if (!buyer) throw new AppError("Buyer account not found", 404);

    // Prevent duplicate pending offers by the same buyer on the same listing
    const existingPending = await Offer.findOne({
      listingId,
      buyerId: req.user!.id,
      status: "pending",
      expiresAt: { $gt: new Date() },
    });
    if (existingPending) {
      throw new AppError(
        "You already have an active pending offer on this listing. Please await farmer response or let it expire.",
        400
      );
    }

    const offer = await Offer.create({
      listingId: listing.id,
      listingTitle: listing.name,
      buyerId: buyer.id,
      buyerName: buyer.name,
      buyerPhone: buyer.phone,
      farmerId: listing.farmerId,
      farmerName: listing.farmerName,
      offerPrice: Math.round(offerPrice * 100) / 100,
      originalPrice: listing.price,
      offerQuantity,
      unit: listing.unit,
      status: "pending",
      note: typeof note === "string" ? note.trim().slice(0, 500) : undefined,
      expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000), // 72 hours
    });

    // Asynchronously notify the farmer without blocking response
    notificationService.notifyOfferReceived({
      farmerId: listing.farmerId,
      buyerId: buyer.id,
      buyerName: buyer.name,
      cropName: listing.name,
      offerPrice: offer.offerPrice,
      unit: listing.unit,
      offerId: offer.id,
    });

    res.status(201).json({
      data: offer,
      message: "Your price offer has been submitted directly to the farmer.",
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/offers/mine
 * Scoped offer retrieval:
 * Buyers see their submitted proposals.
 * Farmers see incoming bids on their produce lots.
 */
export async function getMyOffers(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const role = req.user!.role;

    // Lazily retire expired offers
    await Offer.updateMany(
      { status: "pending", expiresAt: { $lt: new Date() } },
      { $set: { status: "expired" } }
    );

    let filter: any;
    if (role === "fpo") {
      const members = await User.find({ fpoId: userId });
      const allowedFarmerIds = [userId, ...members.map((m) => m.id)];
      filter = { farmerId: { $in: allowedFarmerIds } };
    } else if (role === "farmer") {
      filter = { farmerId: userId };
    } else {
      filter = { buyerId: userId };
    }
    const offers = await Offer.find(filter).sort({ createdAt: -1 });

    res.json({ data: offers });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/offers/:id/respond
 * Farmer or FPO accepts or rejects an incoming buyer offer.
 * If accepted: Executes atomic stock check-and-decrement transaction (T9.5) and generates confirmed Order.
 */
export async function respondToOffer(req: Request, res: Response, next: NextFunction) {
  const session = await mongoose.startSession();
  try {
    const { action, reason, deliveryAddress } = req.body;
    const offerId = req.params.id;

    if (!["accept", "reject"].includes(action)) {
      throw new AppError("Action must be 'accept' or 'reject'", 400);
    }

    const offer = await Offer.findById(offerId);
    if (!offer) {
      throw new AppError("Offer not found", 404);
    }

    // Role and ownership verification per Hard Rule #3
    let isAuthorized = offer.farmerId === req.user!.id || req.user!.role === "admin";
    if (!isAuthorized && req.user!.role === "fpo") {
      const members = await User.find({ fpoId: req.user!.id });
      const allowedFarmerIds = [req.user!.id, ...members.map((m) => m.id)];
      isAuthorized = allowedFarmerIds.includes(offer.farmerId);
    }

    if (!isAuthorized) {
      throw new AppError("Forbidden: you are not authorized to respond to offers for this produce", 403);
    }

    if (offer.status !== "pending") {
      throw new AppError(`Cannot respond: offer is already ${offer.status}`, 400);
    }

    if (new Date() > offer.expiresAt) {
      offer.status = "expired";
      await offer.save();
      throw new AppError("Offer has expired and can no longer be accepted", 400);
    }

    // ── 1. Rejection Path ──────────────────────────────────────────────
    if (action === "reject") {
      offer.status = "rejected";
      offer.rejectionReason = typeof reason === "string" ? reason.trim().slice(0, 300) : "Offer declined by producer";
      await offer.save();

      // Notify buyer of offer rejection
      notificationService.notifyOfferResponded({
        buyerId: offer.buyerId,
        farmerId: offer.farmerId,
        farmerName: offer.farmerName,
        cropName: offer.listingTitle,
        status: "rejected",
        offerId: offer.id,
      });

      res.json({
        data: offer,
        message: "Offer declined.",
      });
      return;
    }

    // ── 2. Acceptance Path (Atomic Transaction per Hard Rule #2 & T9.5) ─
    let createdOrder: InstanceType<typeof Order> | undefined;

    await runWithTransactionRetry(session, async () => {
      // Atomic stock check and decrement with $gte guard against concurrent overselling
      const updatedListing = await Listing.findOneAndUpdate(
        {
          _id: offer.listingId,
          isActive: true,
          quantity: { $gte: offer.offerQuantity },
        },
        { $inc: { quantity: -offer.offerQuantity } },
        { session, new: true }
      );

      if (!updatedListing) {
        throw new AppError(
          "Insufficient stock remaining to fulfill this offer. The lot may have sold via direct order.",
          409
        );
      }

      // If remaining stock reaches 0, update isActive in same transaction
      if (updatedListing.quantity === 0) {
        updatedListing.isActive = false;
        await updatedListing.save({ session });
      }

      // Create linked Order record with negotiated rate
      const totalAmount = Math.round(offer.offerPrice * offer.offerQuantity * 100) / 100;
      const [order] = await Order.create(
        [
          {
            buyerId: offer.buyerId,
            buyerName: offer.buyerName,
            farmerId: offer.farmerId,
            farmerName: offer.farmerName,
            items: [
              {
                productId: offer.listingId,
                productName: offer.listingTitle,
                quantity: offer.offerQuantity,
                unit: offer.unit,
                price: offer.offerPrice,
              },
            ],
            total: totalAmount,
            status: "confirmed", // Confirmed order ready for packaging/dispatch
            deliveryAddress:
              typeof deliveryAddress === "string" && deliveryAddress.trim()
                ? deliveryAddress.trim()
                : "Agreed Farm Gate Pickup / Negotiated Direct Courier",
            offerId: offer.id,
          },
        ],
        { session }
      );

      createdOrder = order;

      // Update offer status
      offer.status = "accepted";
      offer.orderId = order.id;
      await offer.save({ session });
    });

    // Notify buyer of accepted offer and converted order
    notificationService.notifyOfferResponded({
      buyerId: offer.buyerId,
      farmerId: offer.farmerId,
      farmerName: offer.farmerName,
      cropName: offer.listingTitle,
      status: "accepted",
      offerId: offer.id,
      orderId: createdOrder?.id,
    });

    res.json({
      data: {
        offer,
        order: createdOrder,
      },
      message: "Offer accepted! Order created atomically and inventory reserved.",
    });
  } catch (err) {
    next(err);
  } finally {
    await session.endSession();
  }
}

