import assert from "node:assert/strict";
import MandiPrice from "../models/MandiPrice";
import { PredictionService } from "../services/prediction.service";
import { getPrediction } from "../controllers/prediction.controller";
import { invokeController } from "./test-utils";

export async function runPredictionTests() {
  console.log("\n🧪 Running T8.3 & T8.4: AI Price-Trend Forecasting & Bridge Route Test Suite...");

  const testCrop = `TestTomato_${Date.now()}`;
  const testDistrict = "Nashik";

  // 1. Validation test: Missing crop name
  console.log("  • Case 1: Validation - missing crop query param returns 400 AppError");
  try {
    await invokeController(getPrediction, {
      query: {},
      user: { role: "farmer" } as any,
    } as any);
    assert.fail("Should have thrown error for missing crop");
  } catch (err: any) {
    assert.strictEqual(err.statusCode, 400);
    assert.match(err.message, /crop.*required/i);
    console.log("    ✓ Rejected missing crop query param with 400");
  }

  // 2. Seed test APMC price records spanning 5 days
  console.log("  • Case 2: Seed APMC records & execute prediction");
  const basePrice = 2000;
  const recordsToInsert = [];
  const today = new Date();

  for (let i = 4; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];

    recordsToInsert.push({
      cropName: testCrop,
      variety: "Hybrid",
      marketName: "Nashik Yard A",
      district: testDistrict,
      state: "Maharashtra",
      minPrice: basePrice + i * 50 - 100,
      maxPrice: basePrice + i * 50 + 200,
      modalPrice: basePrice + i * 50,
      unit: "quintal",
      priceDate: dateStr,
      source: "Agmarknet APMC Test Portal",
    });
  }

  await MandiPrice.insertMany(recordsToInsert);
  console.log(`    ✓ Inserted ${recordsToInsert.length} historical APMC test records for ${testCrop}`);

  try {
    // 3. Test PredictionService directly
    console.log("  • Case 3: Test PredictionService with 7 forecast days");
    const result = await PredictionService.getPrediction(testCrop, testDistrict, 7);

    assert.strictEqual(result.crop, testCrop);
    assert.strictEqual(result.district, testDistrict);
    assert.strictEqual(result.forecastDays, 7);
    assert.strictEqual(result.forecast.length, 7);
    assert.ok(result.historicalObservations >= 5, "Should report at least 5 observations");
    assert.ok(["bullish", "bearish", "stable"].includes(result.trendDirection), "Valid trend direction");
    assert.ok(result.confidenceScore >= 0 && result.confidenceScore <= 100, "Confidence score bounded 0-100");
    assert.ok(result.disclaimer.includes("AI-Estimated Trend — Not a Price Guarantee"), "Includes legal disclaimer");

    // Check individual forecast points
    for (let i = 0; i < result.forecast.length; i++) {
      const pt = result.forecast[i];
      assert.ok(pt.date, `Point ${i} has date`);
      assert.ok(pt.dayName, `Point ${i} has dayName`);
      assert.ok(pt.predictedPrice > 0, `Point ${i} price is positive`);
      assert.ok(pt.confidenceMin > 0, `Point ${i} min confidence positive`);
      assert.ok(pt.confidenceMax >= pt.confidenceMin, `Point ${i} max confidence >= min`);
    }
    console.log(`    ✓ 7 forecast points generated with valid confidence bounds (Trend: ${result.trendDirection}, Model: ${result.model})`);

    // 4. Test Controller invocation
    console.log("  • Case 4: Test Controller invocation via bridge route");
    const ctrlRes = await invokeController(getPrediction, {
      query: { crop: testCrop, district: testDistrict, days: "7" },
      user: { role: "farmer" } as any,
    } as any);

    assert.strictEqual(ctrlRes.status, 200);
    assert.ok(ctrlRes.data.data);
    assert.strictEqual(ctrlRes.data.data.crop, testCrop);
    assert.strictEqual(ctrlRes.data.data.forecast.length, 7);
    console.log("    ✓ Controller returned 200 with formatted payload");

    // 5. Test Resilience & Unreachable AI Service Fallback
    console.log("  • Case 5: Resilience Fallback - unreachable AI service defaults cleanly to statistical EWMA");
    const originalUrl = process.env.AI_SERVICE_URL;
    process.env.AI_SERVICE_URL = "http://127.0.0.1:59999"; // Non-existent port

    const start = Date.now();
    const fallbackResult = await PredictionService.getPrediction(testCrop, testDistrict, 7);
    const elapsed = Date.now() - start;

    assert.strictEqual(fallbackResult.isAiServiceConnected, false);
    assert.strictEqual(fallbackResult.forecast.length, 7);
    assert.ok(elapsed < 4000, `Fallback should complete quickly without hanging, took ${elapsed}ms`);
    assert.ok(fallbackResult.forecast[0].predictedPrice > 0, "Fallback generates valid price points");
    console.log(`    ✓ Fallback engaged smoothly in ${elapsed}ms without hanging or crashing`);

    // Restore original URL
    process.env.AI_SERVICE_URL = originalUrl;
  } finally {
    // 6. Clean up test records
    await MandiPrice.deleteMany({ cropName: testCrop });
    console.log("    ✓ Cleaned up test APMC records");
  }

  console.log("✅ T8.3 & T8.4 Test Suite passed successfully!\n");
}
