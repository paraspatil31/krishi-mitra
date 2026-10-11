import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import MandiPrice from "../models/MandiPrice";

export async function deduplicateAndIndex(): Promise<{ duplicatesRemoved: number; syntheticRemoved: number }> {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    throw new Error("MONGO_URI not defined in environment");
  }

  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(mongoUri);
    console.log("[Migration] Connected to MongoDB Atlas");
  }

  // 1. Remove old synthetic seed records that were created by fake generateSeedData()
  const syntheticRes = await MandiPrice.deleteMany({
    source: "Agmarknet APMC Portal",
  });
  console.log(`[Migration] Cleaned up ${syntheticRes.deletedCount} legacy synthetic seed records.`);

  // 2. Find any duplicate documents grouped by (cropName, variety, marketName, priceDate)
  const duplicates = await MandiPrice.aggregate([
    {
      $group: {
        _id: {
          cropName: "$cropName",
          variety: "$variety",
          marketName: "$marketName",
          priceDate: "$priceDate",
        },
        docIds: { $push: "$_id" },
        count: { $sum: 1 },
      },
    },
    {
      $match: {
        count: { $gt: 1 },
      },
    },
  ]);

  let totalDupsRemoved = 0;
  for (const group of duplicates) {
    // Keep the first document, delete the rest
    const idsToDelete = group.docIds.slice(1);
    const delRes = await MandiPrice.deleteMany({ _id: { $in: idsToDelete } });
    totalDupsRemoved += delRes.deletedCount;
  }

  console.log(`[Migration] Removed ${totalDupsRemoved} duplicate mandi price documents.`);

  // 3. Ensure the unique compound index exists
  try {
    const indexResult = await MandiPrice.collection.createIndex(
      {
        cropName: 1,
        variety: 1,
        marketName: 1,
        priceDate: 1,
      },
      {
        unique: true,
        background: true,
      }
    );
    console.log(`[Migration] Successfully created unique index: ${indexResult}`);
  } catch (idxErr: any) {
    console.error("[Migration] Index creation error:", idxErr.message);
    throw idxErr;
  }

  return {
    duplicatesRemoved: totalDupsRemoved,
    syntheticRemoved: syntheticRes.deletedCount,
  };
}

// Run standalone if executed directly
if (require.main === module) {
  deduplicateAndIndex()
    .then((result) => {
      console.log("[Migration] Migration completed successfully:", result);
      process.exit(0);
    })
    .catch((err) => {
      console.error("[Migration] Migration failed:", err);
      process.exit(1);
    });
}
