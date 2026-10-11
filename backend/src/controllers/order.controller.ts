import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import Order from "../models/Order";
import Listing from "../models/Listing";
import User from "../models/User";
import { AppError } from "../utils/AppError";
import { validateDeliveryAddress } from "../utils/validation";
import { notificationService } from "../services/notification.service";

export async function mine(req: Request, res: Response, next: NextFunction) {
  try {
    const role = req.user!.role;
    let q: any;
    if (role === "buyer") {
      q = { buyerId: req.user!.id };
    } else if (role === "fpo") {
      const members = await User.find({ fpoId: req.user!.id });
      const allowedFarmerIds = [req.user!.id, ...members.map((m) => m.id)];
      q = { farmerId: { $in: allowedFarmerIds } };
    } else {
      q = { farmerId: req.user!.id };
    }
    res.json({ data: await Order.find(q).sort({ createdAt: -1 }) });
  } catch (e) {
    next(e);
  }
}

export async function getOne(req: Request, res: Response, next: NextFunction) {
  try {
    const o = await Order.findById(req.params.id);
    if (!o) throw new AppError("Order not found", 404);

    let isAuthorized = req.user!.role === "admin" || o.buyerId === req.user!.id || o.farmerId === req.user!.id;
    if (!isAuthorized && req.user!.role === "fpo") {
      const members = await User.find({ fpoId: req.user!.id });
      const allowedFarmerIds = [req.user!.id, ...members.map((m) => m.id)];
      isAuthorized = allowedFarmerIds.includes(o.farmerId);
    }

    if (!isAuthorized) {
      throw new AppError("Forbidden", 403);
    }
    res.json({ data: o });
  } catch (e) {
    next(e);
  }
}

// MongoDB retry pattern for TransientTransactionError
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
      await new Promise((resolve) => setTimeout(resolve, 50 * attempt)); // brief backoff
    }
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  const { items, deliveryAddress: rawAddress } = req.body;

  if (!Array.isArray(items) || !items.length) {
    return next(new AppError("Order must contain at least one item", 400));
  }

  // Validate delivery address structure
  let validatedAddress: any;
  try {
    validatedAddress = validateDeliveryAddress(rawAddress);
  } catch (addrErr) {
    return next(addrErr);
  }

  const buyer = await User.findById(req.user!.id);
  if (!buyer) return next(new AppError("User not found", 404));

  const session = await mongoose.startSession();
  let createdOrder: InstanceType<typeof Order> | undefined;

  try {
    await runWithTransactionRetry(session, async () => {
      const ids = items.map((i: any) => i.productId);

      // Snapshot read inside transaction for farmer/price verification
      const listings = await Listing.find({ _id: { $in: ids } }).session(session);

      if (listings.length !== ids.length) {
        throw new AppError("One or more products are unavailable", 400);
      }

      const farmerId = listings[0].farmerId;
      const farmerName = listings[0].farmerName;

      for (const i of items) {
        const l = listings.find((x) => x.id === i.productId);
        if (!l || l.farmerId !== farmerId) {
          throw new AppError("An order can contain products from one farmer only", 400);
        }
        if (!i.quantity || typeof i.quantity !== "number" || i.quantity <= 0) {
          throw new AppError(`Invalid quantity for ${l.name}`, 400);
        }
      }

      const orderItems: {
        productId: string;
        productName: string;
        quantity: number;
        unit: string;
        price: number;
      }[] = [];
      let total = 0;

      for (const i of items) {
        const l = listings.find((x) => x.id === i.productId)!;

        // Atomic check and decrement wrapped in the transaction
        const updated = await Listing.findOneAndUpdate(
          {
            _id: l.id,
            isActive: true,
            quantity: { $gte: i.quantity },
          },
          { $inc: { quantity: -i.quantity } },
          { new: true, session }
        );

        if (!updated) {
          throw new AppError(`${l.name} no longer has enough stock available`, 409);
        }

        if (updated.quantity === 0) {
          updated.status = "sold_out";
          updated.isActive = false;
          await updated.save({ session });
        }

        orderItems.push({
          productId: l.id,
          productName: l.name,
          quantity: i.quantity,
          unit: l.unit,
          price: l.price, // Server-side price snapshot (Hard rule #1)
        });
        total += l.price * i.quantity;
      }

      const [order] = await Order.create(
        [
          {
            buyerId: buyer.id,
            buyerName: buyer.name,
            farmerId,
            farmerName,
            items: orderItems,
            total,
            deliveryAddress: typeof rawAddress === "string" ? rawAddress : `${validatedAddress.fullName}, ${validatedAddress.street}, ${validatedAddress.district}, ${validatedAddress.state} - ${validatedAddress.pincode} (Tel: ${validatedAddress.phone})`,
          },
        ],
        { session }
      );

      createdOrder = order;
    });

    if (createdOrder) {
      notificationService.notifyOrderPlaced({
        farmerId: createdOrder.farmerId,
        buyerId: createdOrder.buyerId,
        buyerName: createdOrder.buyerName,
        orderTotal: createdOrder.total,
        orderId: createdOrder.id,
      });
    }

    res.status(201).json({ data: createdOrder });
  } catch (e) {
    next(e);
  } finally {
    session.endSession();
  }
}

/**
 * Validates order status transitions against a strict state machine.
 */
const VALID_TRANSITIONS: Record<string, string[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["processing", "cancelled"],
  processing: ["shipped"],
  shipped: ["delivered"],
  delivered: [], // Terminal state
  cancelled: [], // Terminal state
};

export async function updateStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const { status: targetStatus } = req.body;
    const userRole = req.user!.role;
    const userId = req.user!.id;

    const o = await Order.findById(req.params.id);
    if (!o) throw new AppError("Order not found", 404);

    const currentStatus = o.status;

    // Terminal states cannot be changed
    if (currentStatus === "delivered" || currentStatus === "cancelled") {
      throw new AppError(`Cannot change order status from terminal state '${currentStatus}'`, 400);
    }

    // Role access check
    let isProducerAuthorized = o.farmerId === userId;
    if (!isProducerAuthorized && userRole === "fpo") {
      const members = await User.find({ fpoId: userId });
      const allowedFarmerIds = [userId, ...members.map((m) => m.id)];
      isProducerAuthorized = allowedFarmerIds.includes(o.farmerId);
    }

    if (userRole === "farmer" && o.farmerId !== userId) throw new AppError("Forbidden", 403);
    if (userRole === "fpo" && !isProducerAuthorized) throw new AppError("Forbidden", 403);
    if (userRole === "buyer" && o.buyerId !== userId) throw new AppError("Forbidden", 403);

    // Admin can perform emergency dispute overrides
    if (userRole !== "admin") {
      // Check valid state transition path
      const allowedNext = VALID_TRANSITIONS[currentStatus] || [];
      if (!allowedNext.includes(targetStatus)) {
        throw new AppError(
          `Invalid status transition: cannot advance from '${currentStatus}' directly to '${targetStatus}'. Allowed next: ${allowedNext.join(", ") || "none"}`,
          400
        );
      }

      // Role authority rules
      if (targetStatus === "delivered") {
        if (userRole !== "buyer") {
          throw new AppError("Only the buyer can confirm delivery and receipt of goods", 403);
        }
      } else if (["confirmed", "processing", "shipped"].includes(targetStatus)) {
        if (userRole !== "farmer" && userRole !== "fpo") {
          throw new AppError("Only the farmer or FPO can confirm or advance shipment progress", 403);
        }
      } else if (targetStatus === "cancelled") {
        if (userRole === "buyer" && currentStatus !== "pending") {
          throw new AppError("Buyers can only cancel an order before the producer confirms it", 400);
        }
      }
    }

    o.status = targetStatus;
    await o.save();

    // Notify buyer of updated delivery progress
    notificationService.notifyOrderStatusChanged({
      buyerId: o.buyerId,
      farmerName: o.farmerName,
      status: o.status,
      orderId: o.id,
    });

    res.json({ data: o });
  } catch (e) {
    next(e);
  }
}