import { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../utils/jwt";
import { AppError } from "../utils/AppError";
import { UserRole, BuyerType } from "../models/User";

// Augment Express's Request type so req.user is typed everywhere it's used,
// instead of every controller re-casting it.
declare global {
  namespace Express {
    interface Request {
      user?: { id: string; role: UserRole; buyerType?: BuyerType };
    }
  }
}

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next(new AppError("No access token provided", 401));
  }

  const token = authHeader.split(" ")[1];

  try {
    const payload = verifyAccessToken(token);
    req.user = {
      id: payload.sub,
      role: payload.role,
      buyerType: payload.buyerType,
    };
    next();
  } catch {
    next(new AppError("Invalid or expired access token", 401));
  }
}

export function optionalAuthenticate(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next();
  }

  const token = authHeader.split(" ")[1];

  try {
    const payload = verifyAccessToken(token);
    req.user = {
      id: payload.sub,
      role: payload.role,
      buyerType: payload.buyerType,
    };
  } catch {
    // Treat invalid or expired tokens gracefully as unauthenticated guest
  }
  next();
}

// Usage: router.post('/listings', authenticate, requireRole('farmer'), createListing)
export function requireRole(...allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new AppError("Not authenticated", 401));
    }
    if (!allowedRoles.includes(req.user.role)) {
      return next(new AppError("You do not have permission to perform this action", 403));
    }
    next();
  };
}

// Usage: router.post('/bulk-requirements', authenticate, requireBuyerType('business'), createBulkRequirement)
export function requireBuyerType(...allowedBuyerTypes: BuyerType[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new AppError("Not authenticated", 401));
    }
    // Admin override
    if (req.user.role === "admin") {
      return next();
    }
    if (req.user.role !== "buyer") {
      return next(new AppError("Only buyers can access this resource", 403));
    }
    const currentBuyerType = req.user.buyerType || "household";
    if (!allowedBuyerTypes.includes(currentBuyerType)) {
      return next(
        new AppError(
          `This feature requires a ${allowedBuyerTypes.join(" or ")} buyer account. Household accounts cannot access bulk procurement.`,
          403
        )
      );
    }
    next();
  };
}

/**
 * Enforces Feature Access Matrix:
 * Blocks household buyers from accessing wholesale/B2B tools (Mandi prices, market finder, cold storage).
 * Allows Farmers, Business Buyers, and Admins.
 */
export function requireBusinessOrFarmer(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    return next(new AppError("Authentication required to access wholesale agricultural tools", 401));
  }

  // Admins, Farmers & FPOs always allowed
  if (req.user.role === "admin" || req.user.role === "farmer" || req.user.role === "fpo") {
    return next();
  }

  // Buyers must be Business / Bulk Buyers
  if (req.user.role === "buyer") {
    const currentBuyerType = req.user.buyerType || "household";
    if (currentBuyerType === "business") {
      return next();
    }
    return next(
      new AppError(
        "Access Forbidden: This feature is reserved for Business/Bulk Buyers and Farmers. Household consumers cannot access wholesale mandi rates, markets, or storage facilities.",
        403
      )
    );
  }

  return next(new AppError("You do not have permission to perform this action", 403));
}
