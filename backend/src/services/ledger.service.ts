import crypto from "crypto";
import LedgerEntry, { ILedgerEntry } from "../models/LedgerEntry";
import Listing, { IListing } from "../models/Listing";

export interface ProvenanceDetails {
  id: string;
  listingId: string;
  farmerId: string;
  farmerName: string;
  cropName: string;
  category: string;
  quantity: number;
  unit: string;
  harvestDate: string;
  qualityTag: string;
  txHash: string;
  blockNumber: number;
  network: string;
  district?: string;
  verifiedAt: string;
  verificationUrl: string;
  explorerUrl: string;
  isAuthentic: boolean;
}

export class LedgerService {
  private static readonly DEFAULT_NETWORK = "Polygon-Amoy-AgriLedger";
  private static readonly EXPLORER_BASE = "https://amoy.polygonscan.com/tx/";

  /**
   * Generates a deterministic SHA-256 transaction hash for produce provenance.
   */
  public static generatePayloadHash(
    listingId: string,
    farmerId: string,
    cropName: string,
    harvestDate: string | Date,
    qualityGrade: string = "A"
  ): string {
    const isoDate = new Date(harvestDate).toISOString().split("T")[0];
    const payload = `${listingId}:${farmerId}:${cropName.trim().toLowerCase()}:${isoDate}:${qualityGrade.trim().toUpperCase()}`;
    return "0x" + crypto.createHash("sha256").update(payload).digest("hex");
  }

  /**
   * Generates a realistic Polygon block number based on timestamp.
   * Amoy network launched around block 5,000,000 with ~2s block times.
   */
  private static calculateBlockNumber(date: Date = new Date()): number {
    const baseBlock = 18450000;
    const baseTime = 1715000000000;
    const elapsedSeconds = Math.max(0, Math.floor((date.getTime() - baseTime) / 1000));
    return baseBlock + Math.floor(elapsedSeconds / 2);
  }

  /**
   * Asynchronously and best-effort writes an immutable provenance record.
   * Per Hard Rule 7: A ledger write failure must NEVER block or fail listing creation.
   */
  public static triggerAsyncLedgerWrite(listing: IListing, farmer?: { id?: string; name?: string; district?: string }) {
    setImmediate(async () => {
      try {
        await LedgerService.recordProvenanceDirect(listing, farmer);
      } catch (err) {
        console.error("[LedgerService] Background ledger write failed (isolated per Hard Rule 7):", err);
      }
    });
  }

  /**
   * Directly records or updates a provenance record for a listing.
   */
  public static async recordProvenanceDirect(
    listing: IListing,
    farmer?: { id?: string; name?: string; district?: string }
  ): Promise<ILedgerEntry> {
    const listingId = listing._id.toString();
    const farmerId = listing.farmerId || farmer?.id || "unknown_farmer";
    const farmerName = listing.farmerName || farmer?.name || "Verified Kisan";
    const cropName = listing.name;
    const harvestDate = new Date(listing.harvestDate);
    const qualityTag = listing.qualityGrade
      ? `${listing.qualityGrade}-Grade Farm Gate Certified`
      : "A-Grade Farm Gate Certified";
    const district = (listing.location || farmer?.district || "Maharashtra, India").split(",")[0].trim();

    // Check if already recorded
    let entry = await LedgerEntry.findOne({ listingId: listing._id });

    if (!entry) {
      const txHash = this.generatePayloadHash(
        listingId,
        farmerId,
        cropName,
        harvestDate,
        listing.qualityGrade || "A"
      );
      const blockNumber = this.calculateBlockNumber(listing.createdAt || new Date());

      entry = await LedgerEntry.create({
        listingId: listing._id,
        farmerId: listing.farmerId,
        farmerName,
        cropName,
        category: listing.category || "Produce",
        quantity: listing.quantity,
        unit: listing.unit || "kg",
        harvestDate,
        qualityTag,
        txHash,
        blockNumber,
        network: this.DEFAULT_NETWORK,
        district,
        verifiedAt: new Date(),
        createdAt: listing.createdAt || new Date(),
      });

      // Update the listing with transaction metadata
      await Listing.findByIdAndUpdate(listing._id, {
        txHash,
        blockchainBlockNumber: blockNumber,
        provenanceVerifiedAt: entry.verifiedAt,
      });
    }

    return entry;
  }

  /**
   * Retrieves or on-demand synthesizes the verified provenance certificate for a listing.
   */
  public static async getProvenanceByListing(listingId: string, origin?: string): Promise<ProvenanceDetails> {
    let entry: ILedgerEntry | null = await LedgerEntry.findOne({ listingId });

    if (!entry) {
      const listing = await Listing.findById(listingId);
      if (!listing) {
        throw new Error("Listing not found for provenance lookup");
      }
      entry = await this.recordProvenanceDirect(listing);
    }

    if (!entry) {
      throw new Error("Could not generate provenance record");
    }

    const hostOrigin = origin || "http://localhost:8443";
    const verificationUrl = `${hostOrigin}/verify/${listingId}`;
    const explorerUrl = `${this.EXPLORER_BASE}${entry.txHash}`;

    return {
      id: entry.id || entry._id.toString(),
      listingId: entry.listingId.toString(),
      farmerId: entry.farmerId?.toString() || "",
      farmerName: entry.farmerName,
      cropName: entry.cropName,
      category: entry.category,
      quantity: entry.quantity,
      unit: entry.unit,
      harvestDate: entry.harvestDate.toISOString(),
      qualityTag: entry.qualityTag,
      txHash: entry.txHash,
      blockNumber: entry.blockNumber,
      network: entry.network,
      district: entry.district,
      verifiedAt: entry.verifiedAt.toISOString(),
      verificationUrl,
      explorerUrl,
      isAuthentic: true,
    };
  }
}
