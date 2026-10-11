import axios from "axios";
import MandiPrice, { IMandiPrice } from "../models/MandiPrice";

export interface MandiFilters {
  cropName?: string;
  district?: string;
  marketName?: string;
  date?: string;
  page?: number;
  limit?: number;
}

export interface IngestionStats {
  received: number;
  valid: number;
  inserted: number;
  updated: number;
  skipped: number;
}

export interface DataGovMandiRecord {
  state?: string;
  district?: string;
  market?: string;
  commodity?: string;
  variety?: string;
  grade?: string;
  arrival_date?: string;
  min_price?: number | string;
  max_price?: number | string;
  modal_price?: number | string;
}

export interface PriceTrendItem {
  date: string;
  avgModalPrice: number;
  minPrice: number;
  maxPrice: number;
  marketsCount: number;
}

export interface PriceTrendsResult {
  data: PriceTrendItem[];
  cropName: string;
  daysRequested: number;
  daysAvailable: number;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Parses arrival_date from Data.gov.in (format: "DD/MM/YYYY" or "DD\/MM\/YYYY")
 * into ISO "YYYY-MM-DD".
 */
export function parseArrivalDate(dateStr?: string): string {
  if (!dateStr || typeof dateStr !== "string") {
    return new Date().toISOString().split("T")[0];
  }
  const cleaned = dateStr.replace(/\\/g, "").trim();
  const parts = cleaned.split("/");
  if (parts.length === 3) {
    const [day, month, year] = parts;
    const y = year.padStart(4, "2000");
    const m = month.padStart(2, "0");
    const d = day.padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  // If already in YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) {
    return cleaned;
  }
  return new Date().toISOString().split("T")[0];
}

export class MandiService {
  private static seeded = false;
  private static lastApiCallTimestamp = 0;
  // Minimum cooldown between external Data.gov.in API calls to protect rate limits/quotas (5 minutes)
  private static readonly REFRESH_COOLDOWN_MS = 5 * 60 * 1000;

  /**
   * Ingest real mandi rates directly from official Government of India Agmarknet bulletin on Data.gov.in.
   * Resource ID: 9ef84268-d588-465a-a308-a864a43d0070
   * 
   * Fetches paginated records, validates data, and performs batch upsert into MongoDB.
   */
  public static async fetchAndStoreMandiPrices(options?: {
    state?: string;
    limit?: number;
    maxPages?: number;
  }): Promise<IngestionStats> {
    const apiKey = process.env.DATA_GOV_API_KEY;
    const resourceId =
      process.env.DATA_GOV_MANDI_RESOURCE_ID || "9ef84268-d588-465a-a308-a864a43d0070";
    const targetState = options?.state || "Maharashtra";
    const pageSize = Math.min(options?.limit || 100, 100);
    const maxPages = options?.maxPages || 5;

    const stats: IngestionStats = {
      received: 0,
      valid: 0,
      inserted: 0,
      updated: 0,
      skipped: 0,
    };

    if (!apiKey) {
      console.warn(
        "[MandiService] Warning: DATA_GOV_API_KEY is not set. Cannot fetch live mandi data from Data.gov.in."
      );
      return stats;
    }

    this.lastApiCallTimestamp = Date.now();

    for (let page = 0; page < maxPages; page++) {
      const offset = page * pageSize;
      const url = `https://api.data.gov.in/resource/${resourceId}?api-key=${encodeURIComponent(
        apiKey
      )}&format=json&limit=${pageSize}&offset=${offset}&filters[state]=${encodeURIComponent(
        targetState
      )}`;

      try {
        const response = await axios.get<{
          total?: number;
          count?: number;
          records?: DataGovMandiRecord[];
        }>(url, {
          timeout: 10000,
          headers: {
            Accept: "application/json",
            "User-Agent": "FarmerMarketplace/1.0",
          },
        });

        const rawRecords = response.data?.records || [];
        stats.received += rawRecords.length;

        if (rawRecords.length === 0) {
          // No more records available
          break;
        }

        const validOps: any[] = [];

        for (const r of rawRecords) {
          // Validate required fields
          if (!r.commodity || !r.market || r.modal_price === undefined || r.modal_price === null) {
            stats.skipped++;
            continue;
          }

          const rawModal = Number(r.modal_price);
          if (isNaN(rawModal) || rawModal <= 0) {
            stats.skipped++;
            continue;
          }

          const modalPrice = Math.round(rawModal);
          const rawMin = r.min_price !== undefined ? Number(r.min_price) : modalPrice;
          const rawMax = r.max_price !== undefined ? Number(r.max_price) : modalPrice;

          const minPrice = isNaN(rawMin) || rawMin < 0 ? modalPrice : Math.round(rawMin);
          const maxPrice = isNaN(rawMax) || rawMax < 0 ? modalPrice : Math.round(rawMax);

          const cropName = r.commodity.trim();
          const variety = (r.variety && r.variety.trim()) || "Standard";
          const marketName = r.market.trim();
          const district = (r.district && r.district.trim()) || targetState;
          const state = (r.state && r.state.trim()) || targetState;
          const priceDate = parseArrivalDate(r.arrival_date);

          if (!cropName || !marketName || !priceDate) {
            stats.skipped++;
            continue;
          }

          stats.valid++;

          validOps.push({
            updateOne: {
              filter: {
                cropName,
                variety,
                marketName,
                priceDate,
              },
              update: {
                $set: {
                  district,
                  state,
                  minPrice,
                  maxPrice,
                  modalPrice,
                  unit: "quintal",
                  source: "Data.gov.in / Agmarknet",
                  ingestedAt: new Date(),
                },
              },
              upsert: true,
            },
          });
        }

        if (validOps.length > 0) {
          const bulkRes = await MandiPrice.bulkWrite(validOps, { ordered: false });
          stats.inserted += bulkRes.upsertedCount || 0;
          stats.updated += bulkRes.modifiedCount || 0;
        }

        // If fewer records than page size were returned, reached end of dataset
        if (rawRecords.length < pageSize) {
          break;
        }
      } catch (err: any) {
        if (err.response?.status === 429) {
          console.error(
            `[MandiService] Data.gov.in API quota exceeded or rate limit hit (HTTP 429). Ingestion paused.`
          );
        } else {
          console.error(
            `[MandiService] Error fetching Data.gov.in page ${page}:`,
            err.message || err
          );
        }
        // Stop pagination loop on failure
        break;
      }
    }

    console.log(
      `[MandiService] Mandi Ingestion Completed - Received: ${stats.received}, Valid: ${stats.valid}, Inserted: ${stats.inserted}, Updated: ${stats.updated}, Skipped: ${stats.skipped}`
    );

    return stats;
  }

  /**
   * Delete records older than retention window (default 90 days).
   * Keeps database lean while retaining required historical trend data.
   */
  public static async cleanupOldMandiPrices(
    retentionDays?: number
  ): Promise<{ deletedCount: number; cutoffDate: string }> {
    const days =
      retentionDays ||
      (process.env.MANDI_DATA_RETENTION_DAYS
        ? parseInt(process.env.MANDI_DATA_RETENTION_DAYS, 10)
        : 90);

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffDate = cutoff.toISOString().split("T")[0];

    try {
      const res = await MandiPrice.deleteMany({
        priceDate: { $lt: cutoffDate },
      });
      console.log(
        `[MandiService] Retention cleanup: removed ${res.deletedCount} records older than ${cutoffDate} (${days} days retention)`
      );
      return { deletedCount: res.deletedCount || 0, cutoffDate };
    } catch (err: any) {
      console.error("[MandiService] Retention cleanup error:", err.message);
      return { deletedCount: 0, cutoffDate };
    }
  }

  /**
   * Synchronize rates with Data.gov.in and clean up obsolete records.
   * Includes rate-limit guard to avoid exhausting daily API quota.
   */
  public static async refreshRates(force = false): Promise<{
    count: number;
    refreshedAt: Date;
    source: string;
    stats?: IngestionStats;
    cached?: boolean;
  }> {
    const now = Date.now();
    const timeSinceLast = now - this.lastApiCallTimestamp;

    // If triggered within cooldown window and not forced, return current database snapshot to protect quota
    if (!force && this.lastApiCallTimestamp > 0 && timeSinceLast < this.REFRESH_COOLDOWN_MS) {
      const remainingCooldownSec = Math.ceil((this.REFRESH_COOLDOWN_MS - timeSinceLast) / 1000);
      console.log(
        `[MandiService] Refresh rate-limited. Serving cached data (${remainingCooldownSec}s cooldown remaining).`
      );
      const currentCount = await MandiPrice.countDocuments();
      return {
        count: currentCount,
        refreshedAt: new Date(this.lastApiCallTimestamp),
        source: "Data.gov.in / Agmarknet (Cached)",
        cached: true,
      };
    }

    // 1. Fetch and store live real records
    const stats = await this.fetchAndStoreMandiPrices();

    // 2. Perform 90-day retention cleanup
    await this.cleanupOldMandiPrices();

    const totalProcessed = stats.inserted + stats.updated;
    return {
      count: totalProcessed,
      refreshedAt: new Date(),
      source: "Data.gov.in / Agmarknet",
      stats,
      cached: false,
    };
  }

  /**
   * On startup, ensure database contains real data from Data.gov.in.
   * Never generates synthetic or fake random prices.
   */
  public static async ensureSeedData(): Promise<void> {
    if (this.seeded) return;

    try {
      const count = await MandiPrice.countDocuments();
      if (count === 0) {
        console.log(
          "[MandiService] MongoDB mandiprices collection is empty. Fetching initial dataset from Data.gov.in..."
        );
        const stats = await this.fetchAndStoreMandiPrices();
        if (stats.valid === 0) {
          console.warn(
            "[MandiService] Data.gov.in did not return any records or is temporarily unavailable. No synthetic data will be generated."
          );
        }
      }
      this.seeded = true;
    } catch (err: any) {
      console.error("[MandiService] Error during startup seed check:", err.message);
    }
  }

  /**
   * Query mandi prices with filtering, safe regex matching, and pagination.
   */
  public static async getPrices(filters: MandiFilters) {
    await this.ensureSeedData();

    const query: any = {};

    if (filters.cropName && filters.cropName.trim()) {
      query.cropName = new RegExp(`^${escapeRegex(filters.cropName.trim())}`, "i");
    }

    if (filters.district && filters.district.trim()) {
      query.district = new RegExp(escapeRegex(filters.district.trim()), "i");
    }

    if (filters.marketName && filters.marketName.trim()) {
      query.marketName = new RegExp(escapeRegex(filters.marketName.trim()), "i");
    }

    if (filters.date && filters.date.trim()) {
      query.priceDate = filters.date.trim();
    }

    const page = Math.max(1, filters.page || 1);
    const limit = Math.min(100, Math.max(1, filters.limit || 20));
    const skip = (page - 1) * limit;

    const [records, total] = await Promise.all([
      MandiPrice.find(query)
        .sort({ priceDate: -1, modalPrice: -1 })
        .skip(skip)
        .limit(limit),
      MandiPrice.countDocuments(query),
    ]);

    return {
      data: records,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Historical price trend for the selected crop over requested days.
   * Returns ONLY real stored trade dates from MongoDB.
   * Never calculates fake missing dates.
   */
  public static async getTrends(cropName: string, days = 14): Promise<PriceTrendsResult> {
    await this.ensureSeedData();

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffStr = cutoff.toISOString().split("T")[0];

    const records = await MandiPrice.aggregate([
      {
        $match: {
          cropName: new RegExp(`^${escapeRegex(cropName.trim())}`, "i"),
          priceDate: { $gte: cutoffStr },
        },
      },
      {
        $group: {
          _id: "$priceDate",
          avgModalPrice: { $avg: "$modalPrice" },
          minPrice: { $min: "$minPrice" },
          maxPrice: { $max: "$maxPrice" },
          marketsCount: { $sum: 1 },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]);

    const formatted: PriceTrendItem[] = records.map((r) => ({
      date: r._id,
      avgModalPrice: Math.round(r.avgModalPrice),
      minPrice: Math.round(r.minPrice),
      maxPrice: Math.round(r.maxPrice),
      marketsCount: r.marketsCount,
    }));

    return {
      data: formatted,
      cropName,
      daysRequested: days,
      daysAvailable: formatted.length,
    };
  }

  /**
   * Summary list of latest APMC modal rates grouped by crop.
   */
  public static async getCropsSummary() {
    await this.ensureSeedData();

    const latestRecords = await MandiPrice.aggregate([
      {
        $sort: { priceDate: -1, modalPrice: -1 },
      },
      {
        $group: {
          _id: "$cropName",
          latestPrice: { $first: "$modalPrice" },
          minPrice: { $first: "$minPrice" },
          maxPrice: { $first: "$maxPrice" },
          unit: { $first: "$unit" },
          marketName: { $first: "$marketName" },
          district: { $first: "$district" },
          priceDate: { $first: "$priceDate" },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]);

    return latestRecords.map((r) => ({
      cropName: r._id,
      modalPrice: r.latestPrice,
      minPrice: r.minPrice,
      maxPrice: r.maxPrice,
      unit: r.unit,
      topMarket: `${r.marketName} (${r.district})`,
      priceDate: r.priceDate,
    }));
  }

  /**
   * Get benchmark price for a crop and optional district.
   */
  public static async getBenchmark(cropName: string, district?: string) {
    await this.ensureSeedData();

    const query: any = {
      cropName: new RegExp(`^${escapeRegex(cropName.trim())}`, "i"),
    };

    if (district && district.trim()) {
      query.district = new RegExp(escapeRegex(district.trim()), "i");
    }

    const latest = await MandiPrice.findOne(query).sort({ priceDate: -1, modalPrice: -1 });

    if (!latest) {
      // Fallback without district
      const general = await MandiPrice.findOne({
        cropName: new RegExp(`^${escapeRegex(cropName.trim())}`, "i"),
      }).sort({ priceDate: -1, modalPrice: -1 });

      if (!general) return null;

      return this.formatBenchmark(general);
    }

    return this.formatBenchmark(latest);
  }

  private static formatBenchmark(record: IMandiPrice) {
    const isPerQuintal = record.unit?.toLowerCase().includes("quintal");
    const perKgEquivalent = isPerQuintal
      ? Math.round((record.modalPrice / 100) * 10) / 10
      : record.modalPrice;

    return {
      cropName: record.cropName,
      marketName: record.marketName,
      district: record.district,
      modalPricePerQuintal: isPerQuintal ? record.modalPrice : null,
      suggestedPricePerKg: perKgEquivalent,
      unit: record.unit,
      priceDate: record.priceDate,
      source: record.source,
    };
  }
}
