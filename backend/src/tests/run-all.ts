import dotenv from "dotenv";
import path from "path";
import mongoose from "mongoose";
import "../middleware/auth.middleware";
import { runConcurrencyTests } from "./concurrency.test";
import { runWebhookIdempotencyTests } from "./webhook-idempotency.test";
import { runFPOAggregationTests } from "./fpo-aggregation.test";
import { runPredictionTests } from "./prediction.test";
import { runLedgerTests } from "./ledger.test";
import { runAITests } from "./ai.test";

// Ensure environment variables are loaded from backend root
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

async function runAllTests() {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    console.error("❌ MONGO_URI is not set in environment or .env file.");
    process.exit(1);
  }

  console.log("=================================================================");
  console.log("🚀 Starting Farmer Marketplace Automated Test Suite");
  console.log("=================================================================");

  try {
    console.log("🔌 Connecting to MongoDB test database...");
    await mongoose.connect(mongoUri);
    console.log("✅ Connected successfully.\n");

    const startTime = Date.now();

    // Run T7.1 Suite
    await runConcurrencyTests();

    // Run T7.2 Suite
    await runWebhookIdempotencyTests();

    // Run T11.6 Suite
    await runFPOAggregationTests();

    // Run T8.3 & T8.4 Suite
    await runPredictionTests();

    // Run Phase 6 (T6.1 – T6.6) Suite
    await runLedgerTests();

    // Run Phase 12 (T12.1 – T12.3) AI & Voice Assistant Suite
    await runAITests();

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log("\n=================================================================");
    console.log(`🎉 ALL TESTS PASSED SUCCESSFULLY in ${duration}s!`);
    console.log("   • T7.1:  Order Stock Decrement Race Condition: PASSED");
    console.log("   • T7.2:  Webhook Duplicate Event Idempotency:  PASSED");
    console.log("   • T11.6: FPO Multi-Farm Aggregation Hub:       PASSED");
    console.log("   • T8.3/4: AI Price-Trend Forecasting Bridge:   PASSED");
    console.log("   • T6.1-6: Blockchain Provenance Ledger:        PASSED");
    console.log("   • T12.1-3: AI Crop Doctor & Voice Assistant:   PASSED");
    console.log("=================================================================\n");

    process.exit(0);
  } catch (err: any) {
    console.error("\n❌ TEST SUITE FAILED:");
    console.error(err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

runAllTests();
