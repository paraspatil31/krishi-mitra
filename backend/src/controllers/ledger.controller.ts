import { Request, Response, NextFunction } from "express";
import { LedgerService } from "../services/ledger.service";
import { AppError } from "../utils/AppError";

/**
 * Public provenance lookup route (Ticket T6.5 / docs/04 line 121)
 * Returns the immutable provenance certificate for a crop listing.
 */
export async function getProvenance(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { listingId } = req.params;

    if (!listingId || listingId.length !== 24) {
      throw new AppError("Invalid listing ID format", 400);
    }

    const origin = req.get("origin") || `${req.protocol}://${req.get("host")}`;
    const provenance = await LedgerService.getProvenanceByListing(listingId, origin);

    res.json({
      data: provenance,
    });
  } catch (err: any) {
    if (err.message && err.message.includes("not found")) {
      next(new AppError("Produce listing provenance not found", 404));
    } else {
      next(err);
    }
  }
}
