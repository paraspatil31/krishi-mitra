import { Request, Response, NextFunction } from "express";
import BulkRequirement from "../models/BulkRequirement";
import User from "../models/User";
import { AppError } from "../utils/AppError";
import { sanitizeString } from "../utils/validation";
import { notificationService } from "../services/notification.service";

export async function createRequirement(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const buyerId = req.user!.id;

    // Enforce mandatory business profile details before allowing bulk RFQs
    const user = await User.findById(buyerId);
    if (!user) {
      throw new AppError("User not found", 404);
    }
    if (!user.businessProfile?.businessName?.trim() || !user.businessProfile?.businessAddress?.trim()) {
      throw new AppError(
        "Please complete your Business Profile (Entity Name and Delivery Address) before posting bulk procurement requests.",
        400
      );
    }

    const { product, quantity, unit, targetPricePerUnit, requiredByDate, deliveryLocation, notes } = req.body;

    if (!product || !quantity || !requiredByDate || !deliveryLocation?.address || !deliveryLocation?.district) {
      throw new AppError("Product, quantity, requiredByDate, address, and district are required", 400);
    }

    const numQuantity = Number(quantity);
    if (isNaN(numQuantity) || numQuantity <= 0) {
      throw new AppError("Quantity must be a positive number", 400);
    }

    const cleanProduct = sanitizeString(product, "Product Name", { minLen: 2, maxLen: 100 });
    const cleanNotes = notes ? sanitizeString(notes, "Notes", { minLen: 0, maxLen: 1000 }) : undefined;

    const requirement = await BulkRequirement.create({
      buyerId,
      product: cleanProduct,
      quantity: numQuantity,
      unit: ["tons", "quintals", "crates", "kg"].includes(unit) ? unit : "tons",
      targetPricePerUnit: targetPricePerUnit ? Number(targetPricePerUnit) : undefined,
      requiredByDate,
      deliveryLocation: {
        address: sanitizeString(deliveryLocation.address, "Address", { minLen: 2, maxLen: 200 }),
        district: sanitizeString(deliveryLocation.district, "District", { minLen: 2, maxLen: 80 }),
        state: deliveryLocation.state ? sanitizeString(deliveryLocation.state, "State", { minLen: 2, maxLen: 80 }) : "Maharashtra",
        pincode: deliveryLocation.pincode ? sanitizeString(deliveryLocation.pincode, "Pincode", { minLen: 6, maxLen: 6 }) : undefined,
      },
      notes: cleanNotes,
      status: "open",
      quotations: [],
      quotationsCount: 0,
    });

    res.status(201).json({ data: requirement });
  } catch (err) {
    next(err);
  }
}

export async function getMyRequirements(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const buyerId = req.user!.id;
    const { status } = req.query;

    const filter: any = { buyerId };
    if (status && ["open", "fulfilled", "cancelled"].includes(status as string)) {
      filter.status = status;
    }

    const requirements = await BulkRequirement.find(filter).sort({ createdAt: -1 });
    res.status(200).json({ data: requirements });
  } catch (err) {
    next(err);
  }
}

export async function getAllOpenRequirements(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { district, product } = req.query;
    const filter: any = { status: "open" };

    if (district) {
      filter["deliveryLocation.district"] = new RegExp(String(district), "i");
    }
    if (product) {
      filter.product = new RegExp(String(product), "i");
    }

    const requirements = await BulkRequirement.find(filter)
      .populate("buyerId", "name phone businessProfile")
      .sort({ createdAt: -1 })
      .limit(50);

    res.status(200).json({ data: requirements });
  } catch (err) {
    next(err);
  }
}

export async function getRequirementById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const requirement = await BulkRequirement.findById(id).populate("buyerId", "name phone businessProfile");

    if (!requirement) {
      throw new AppError("Bulk requirement not found", 404);
    }

    res.status(200).json({ data: requirement });
  } catch (err) {
    next(err);
  }
}

export async function updateRequirementStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const userId = req.user!.id;

    if (!status || !["open", "fulfilled", "cancelled"].includes(status)) {
      throw new AppError("Invalid status. Allowed: open, fulfilled, cancelled", 400);
    }

    const requirement = await BulkRequirement.findById(id);
    if (!requirement) {
      throw new AppError("Bulk requirement not found", 404);
    }

    if (requirement.buyerId.toString() !== userId && req.user?.role !== "admin") {
      throw new AppError("You can only modify your own requirements", 403);
    }

    requirement.status = status;
    await requirement.save();

    res.status(200).json({ data: requirement });
  } catch (err) {
    next(err);
  }
}

export async function deleteRequirement(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const requirement = await BulkRequirement.findById(id);
    if (!requirement) {
      throw new AppError("Bulk requirement not found", 404);
    }

    if (requirement.buyerId.toString() !== userId && req.user?.role !== "admin") {
      throw new AppError("You can only delete your own requirements", 403);
    }

    await BulkRequirement.findByIdAndDelete(id);
    res.status(200).json({ message: "Requirement deleted successfully" });
  } catch (err) {
    next(err);
  }
}

export async function submitQuotation(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const farmerId = req.user!.id;
    const { availableDate, notes } = req.body;
    const offeredPricePerUnit = req.body.offeredPricePerUnit ?? req.body.pricePerUnit;
    const availableQuantity = req.body.availableQuantity ?? req.body.quantityOffered;

    if (!offeredPricePerUnit || !availableQuantity || !availableDate) {
      throw new AppError("Offered price per unit, available quantity, and available date are required", 400);
    }

    const numPrice = Number(offeredPricePerUnit);
    const numQty = Number(availableQuantity);
    if (isNaN(numPrice) || numPrice <= 0 || isNaN(numQty) || numQty <= 0) {
      throw new AppError("Price and quantity must be positive numbers", 400);
    }

    const requirement = await BulkRequirement.findById(id);
    if (!requirement) {
      throw new AppError("Bulk requirement not found", 404);
    }
    if (requirement.status !== "open") {
      throw new AppError("This bulk requirement is no longer accepting quotations", 400);
    }

    const farmer = await User.findById(farmerId);
    if (!farmer) {
      throw new AppError("Farmer not found", 404);
    }

    const quotation = {
      farmerId: farmer._id,
      farmerName: farmer.name,
      farmerPhone: farmer.phone,
      offeredPricePerUnit: numPrice,
      availableQuantity: numQty,
      availableDate: String(availableDate),
      notes: notes ? sanitizeString(notes, "Notes", { minLen: 0, maxLen: 500 }) : undefined,
      createdAt: new Date(),
    };

    requirement.quotations.push(quotation as any);
    requirement.quotationsCount = requirement.quotations.length;
    await requirement.save();

    // Dispatch in-app notification to the business buyer
    notificationService.notifyBulkQuotation({
      buyerId: requirement.buyerId.toString(),
      farmerName: farmer.name,
      product: requirement.product,
      offeredPrice: numPrice,
      unit: requirement.unit,
      requirementId: requirement.id,
    });

    res.status(201).json({ data: requirement, message: "Quotation submitted successfully" });
  } catch (err) {
    next(err);
  }
}
