import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import MandiPrice from "../models/MandiPrice";
import { MandiService } from "../services/mandi.service";

async function runMandiVerificationTests(): Promise<void> {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    throw new Error("MONGO_URI not configured in .env");
  }

  console.log("==================================================");
  console.log("   MandiService Integration & Verification Test   ");
  console.log("==================================================");

  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(mongoUri);
    console.log("[Test] Connected to MongoDB");
  }

  // --- Test Suite A: Upsert Idempotency & Duplicate Prevention ---
  console.log("\n[Test Suite A] Verifying Upsert Idempotency & Duplicate Prevention...");

  const testKey = {
    cropName: "__TEST_CROP_TOMATO__",
    variety: "Hybrid Desi",
    marketName: "__TEST_MARKET_NASHIK__",
    priceDate: "2026-09-01",
  };

  // Clean any previous test artifacts
  await MandiPrice.deleteMany({ cropName: testKey.cropName });

  const testRecordPayload1 = {
    ...testKey,
    district: "Nashik",
    state: "Maharashtra",
    minPrice: 1600,
    maxPrice: 2200,
    modalPrice: 1900,
    unit: "quintal",
    source: "Data.gov.in / Agmarknet",
    ingestedAt: new Date(),
  };

  // First Upsert Execution
  const bulkOp1 = [
    {
      updateOne: {
        filter: { ...testKey },
        update: { $set: testRecordPayload1 },
        upsert: true,
      },
    },
  ];

  const res1 = await MandiPrice.bulkWrite(bulkOp1);
  console.log(`- Upsert 1 executed: upsertedCount=${res1.upsertedCount}, modifiedCount=${res1.modifiedCount}`);

  const countAfterFirst = await MandiPrice.countDocuments({ ...testKey });
  if (countAfterFirst !== 1) {
    throw new Error(`Expected exactly 1 document after first upsert, found ${countAfterFirst}`);
  }

  // Second Upsert Execution with identical key and updated modal price
  const testRecordPayload2 = {
    ...testRecordPayload1,
    modalPrice: 2050, // Price adjustment
    maxPrice: 2300,
  };

  const bulkOp2 = [
    {
      updateOne: {
        filter: { ...testKey },
        update: { $set: testRecordPayload2 },
        upsert: true,
      },
    },
  ];

  const res2 = await MandiPrice.bulkWrite(bulkOp2);
  console.log(`- Upsert 2 executed: upsertedCount=${res2.upsertedCount}, modifiedCount=${res2.modifiedCount}`);

  const countAfterSecond = await MandiPrice.countDocuments({ ...testKey });
  if (countAfterSecond !== 1) {
    throw new Error(`Duplicate detected! Expected 1 document, found ${countAfterSecond}`);
  }

  const updatedDoc = await MandiPrice.findOne({ ...testKey });
  if (updatedDoc?.modalPrice !== 2050) {
    throw new Error(`Expected updated modalPrice 2050, found ${updatedDoc?.modalPrice}`);
  }

  console.log("✅ TEST A PASSED: Upsert is strictly idempotent. No duplicate records created upon repeated writes.");

  // --- Test Suite B: 90-Day Retention Policy & Cleanup ---
  console.log("\n[Test Suite B] Verifying 90-Day Historical Retention Cleanup...");

  const today = new Date();

  // Create an expired record (95 days ago)
  const expiredDate = new Date(today);
  expiredDate.setDate(today.getDate() - 95);
  const expiredDateStr = expiredDate.toISOString().split("T")[0];

  // Create a recent record (10 days ago)
  const recentDate = new Date(today);
  recentDate.setDate(today.getDate() - 10);
  const recentDateStr = recentDate.toISOString().split("T")[0];

  const expiredRecord = {
    cropName: "__TEST_RETENTION_CROP__",
    variety: "Expired 95 Days",
    marketName: "__TEST_MARKET_PUNE__",
    district: "Pune",
    state: "Maharashtra",
    minPrice: 1000,
    maxPrice: 1500,
    modalPrice: 1200,
    unit: "quintal",
    priceDate: expiredDateStr,
    source: "Data.gov.in / Agmarknet",
    ingestedAt: expiredDate,
  };

  const recentRecord = {
    cropName: "__TEST_RETENTION_CROP__",
    variety: "Recent 10 Days",
    marketName: "__TEST_MARKET_PUNE__",
    district: "Pune",
    state: "Maharashtra",
    minPrice: 1100,
    maxPrice: 1600,
    modalPrice: 1300,
    unit: "quintal",
    priceDate: recentDateStr,
    source: "Data.gov.in / Agmarknet",
    ingestedAt: recentDate,
  };

  await MandiPrice.bulkWrite([
    {
      updateOne: {
        filter: {
          cropName: expiredRecord.cropName,
          variety: expiredRecord.variety,
          marketName: expiredRecord.marketName,
          priceDate: expiredRecord.priceDate,
        },
        update: { $set: expiredRecord },
        upsert: true,
      },
    },
    {
      updateOne: {
        filter: {
          cropName: recentRecord.cropName,
          variety: recentRecord.variety,
          marketName: recentRecord.marketName,
          priceDate: recentRecord.priceDate,
        },
        update: { $set: recentRecord },
        upsert: true,
      },
    },
  ]);

  console.log(`- Created expired record (date: ${expiredDateStr}, >90 days)`);
  console.log(`- Created recent record (date: ${recentDateStr}, <90 days)`);

  // Run cleanup with 90-day retention
  const cleanupRes = await MandiService.cleanupOldMandiPrices(90);
  console.log(`- Ran cleanupOldMandiPrices(90). Deleted total: ${cleanupRes.deletedCount}`);

  const expiredDoc = await MandiPrice.findOne({
    cropName: expiredRecord.cropName,
    variety: expiredRecord.variety,
    priceDate: expiredDateStr,
  });

  const recentDoc = await MandiPrice.findOne({
    cropName: recentRecord.cropName,
    variety: recentRecord.variety,
    priceDate: recentDateStr,
  });

  if (expiredDoc) {
    throw new Error(`Retention failure: Record older than 90 days (${expiredDateStr}) was NOT deleted!`);
  }

  if (!recentDoc) {
    throw new Error(`Retention failure: Recent record (${recentDateStr}) within 90 days was erroneously deleted!`);
  }

  console.log("✅ TEST B PASSED: Records older than 90 days are deleted; recent records within retention window are preserved.");

  // Clean up test documents
  await MandiPrice.deleteMany({
    cropName: { $in: ["__TEST_CROP_TOMATO__", "__TEST_RETENTION_CROP__"] },
  });

  console.log("\n==================================================");
  console.log("   ALL MANDI INTEGRATION TESTS PASSED (100%)      ");
  console.log("==================================================");

  await mongoose.disconnect();
}

if (require.main === module) {
  runMandiVerificationTests()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("\n❌ TEST SUITE FAILED:", err);
      process.exit(1);
    });
}
