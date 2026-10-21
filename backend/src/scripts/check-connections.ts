import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import axios from "axios";
import { connectDB } from "../config/db";
import User from "../models/User";
import Listing from "../models/Listing";
import Order from "../models/Order";
import Payment from "../models/Payment";
import { Notification } from "../models/Notification";
import MandiPrice from "../models/MandiPrice";
import WeatherAlert from "../models/WeatherAlert";
import { StorageFacility } from "../models/StorageFacility";
import { Review } from "../models/Review";
import Offer from "../models/Offer";
import LedgerEntry from "../models/LedgerEntry";
import OtpVerification from "../models/OtpVerification";
import Market from "../models/Market";
import { marketService } from "../services/market.service";

interface DiagnosticResult {
  category: string;
  name: string;
  status: "PASS" | "WARN" | "FAIL";
  details: string;
}

const results: DiagnosticResult[] = [];

function record(category: string, name: string, status: "PASS" | "WARN" | "FAIL", details: string) {
  results.push({ category, name, status, details });
  const icon = status === "PASS" ? "✅" : status === "WARN" ? "⚠️" : "❌";
  console.log(`  ${icon} [${category}] ${name}: ${details}`);
}

async function runDiagnostics() {
  console.log("\n=======================================================");
  console.log("🔍 KRISHIBAZAAR BACKEND FULL CONNECTIVITY DIAGNOSTICS");
  console.log("=======================================================\n");

  // 1. ENVIRONMENT CONFIGURATION
  console.log("1️⃣ Checking Environment Variables...");
  const requiredEnv = [
    { key: "MONGO_URI", val: process.env.MONGO_URI },
    { key: "JWT_SECRET", val: process.env.JWT_SECRET || process.env.JWT_ACCESS_SECRET },
    { key: "JWT_REFRESH_SECRET", val: process.env.JWT_REFRESH_SECRET },
  ];
  for (const envVar of requiredEnv) {
    if (envVar.val) {
      record("Config", envVar.key, "PASS", "Configured and loaded");
    } else {
      record("Config", envVar.key, "FAIL", "Missing in environment");
    }
  }

  const optionalEnv = ["PORT", "CLIENT_ORIGIN", "DATA_GOV_API_KEY", "GEMINI_API_KEY", "GEMINI_MODEL", "FCM_SERVER_KEY", "RAZORPAY_KEY_ID"];
  for (const envVar of optionalEnv) {
    if (process.env[envVar]) {
      record("Config", envVar, "PASS", `Configured (${process.env[envVar]?.slice(0, 8)}...)`);
    } else {
      record("Config", envVar, "WARN", "Not set (using fallback or mock mode)");
    }
  }

  // 2. MONGODB DATABASE CONNECTION & COLLECTIONS
  console.log("\n2️⃣ Checking MongoDB Connection & Collections...");
  try {
    await connectDB();
    const adminDb = mongoose.connection.db?.admin();
    if (adminDb) {
      const pingRes = await adminDb.ping();
      record("Database", "MongoDB Ping", "PASS", `Connected and responsive (ok: ${pingRes.ok})`);
    }

    // Check transaction support (replica set check)
    try {
      const session = await mongoose.startSession();
      session.startTransaction();
      await session.abortTransaction();
      await session.endSession();
      record("Database", "MongoDB Transactions", "PASS", "Replica-set multi-document transactions enabled");
    } catch (txErr: any) {
      record("Database", "MongoDB Transactions", "WARN", `Transactions not active (standalone): ${txErr.message}`);
    }

    // Ensure seed markets exist
    await marketService.seedMarketsIfEmpty();

    // Check all collections
    const collections = [
      { name: "Users", model: User },
      { name: "Listings", model: Listing },
      { name: "Orders", model: Order },
      { name: "Payments", model: Payment },
      { name: "Notifications", model: Notification },
      { name: "MandiPrices", model: MandiPrice },
      { name: "WeatherAlerts", model: WeatherAlert },
      { name: "StorageFacilities", model: StorageFacility },
      { name: "Reviews", model: Review },
      { name: "Offers", model: Offer },
      { name: "LedgerEntries", model: LedgerEntry },
      { name: "OtpVerifications", model: OtpVerification },
      { name: "Markets", model: Market },
    ];

    for (const col of collections) {
      try {
        const count = await col.model.countDocuments();
        record("Collection", col.name, "PASS", `${count} records found in database`);
      } catch (err: any) {
        record("Collection", col.name, "FAIL", `Error querying collection: ${err.message}`);
      }
    }
  } catch (dbErr: any) {
    record("Database", "MongoDB Connection", "FAIL", `Connection failed: ${dbErr.message}`);
  }

  // 3. RUNNING HTTP SERVER ENDPOINTS
  console.log("\n3️⃣ Checking HTTP Server Endpoints (http://localhost:5000)...");
  const port = process.env.PORT || 5000;
  const baseUrl = `http://localhost:${port}/api`;

  const endpoints = [
    { path: "/health", method: "GET", expectedStatus: 200, name: "Health Check" },
    { path: "/listings?limit=1", method: "GET", expectedStatus: 200, name: "Marketplace Listings" },
    { path: "/storage", method: "GET", expectedStatus: 200, name: "Storage Directory" },
    { path: "/mandi-prices/crops", method: "GET", expectedStatus: 200, name: "Mandi Crops" },
    { path: "/weather/alerts", method: "GET", expectedStatus: 200, name: "Weather Alerts" },
    { path: "/location/search?q=Pune", method: "GET", expectedStatus: 200, name: "OSM Location Search" },
    { path: "/markets/nearby?district=Pune", method: "GET", expectedStatus: 200, name: "Nearby Markets" },
    { path: "/notifications", method: "GET", expectedStatus: 401, name: "Notifications Gate (Auth Required)" },
    { path: "/orders", method: "GET", expectedStatus: 401, name: "Orders Gate (Auth Required)" },
    { path: "/offers", method: "GET", expectedStatus: 401, name: "Offers Gate (Auth Required)" },
  ];

  for (const ep of endpoints) {
    try {
      const res = await axios({
        url: `${baseUrl}${ep.path}`,
        method: ep.method as any,
        validateStatus: () => true, // Don't throw on 4xx/5xx
        timeout: 6000,
      });

      if (res.status === ep.expectedStatus) {
        record("API Route", ep.name, "PASS", `HTTP ${res.status} (as expected)`);
      } else {
        record("API Route", ep.name, "WARN", `HTTP ${res.status} (expected ${ep.expectedStatus})`);
      }
    } catch (err: any) {
      record("API Route", ep.name, "FAIL", `Request failed: ${err.message}`);
    }
  }

  // 4. EXTERNAL 3RD-PARTY SERVICES
  console.log("\n4️⃣ Checking External Third-Party Services...");

  // Open-Meteo Weather API
  try {
    const weatherRes = await axios.get(
      "https://api.open-meteo.com/v1/forecast?latitude=18.5204&longitude=73.8567&current=temperature_2m",
      { timeout: 7000 }
    );
    if (weatherRes.status === 200 && weatherRes.data?.current) {
      record(
        "External",
        "Open-Meteo Weather API",
        "PASS",
        `Accessible. Current Pune Temp: ${weatherRes.data.current.temperature_2m}°C`
      );
    } else {
      record("External", "Open-Meteo Weather API", "WARN", `Unexpected response format`);
    }
  } catch (err: any) {
    record("External", "Open-Meteo Weather API", "WARN", `External call warning: ${err.message}`);
  }

  // OpenStreetMap Nominatim
  try {
    const osmRes = await axios.get("https://nominatim.openstreetmap.org/search?q=Nashik,India&format=json&limit=1", {
      headers: { "User-Agent": "KrishiBazaarDiagnostics/1.0" },
      timeout: 7000,
    });
    if (osmRes.status === 200 && Array.isArray(osmRes.data)) {
      record("External", "OpenStreetMap Nominatim", "PASS", "Accessible and geocoding functional");
    } else {
      record("External", "OpenStreetMap Nominatim", "WARN", `Unexpected response`);
    }
  } catch (err: any) {
    record("External", "OpenStreetMap Nominatim", "WARN", `OSM geocoding call warning: ${err.message}`);
  }

  // Data.gov.in Mandi Integration
  if (process.env.DATA_GOV_API_KEY) {
    try {
      const mandiRes = await axios.get(
        `https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070?api-key=${process.env.DATA_GOV_API_KEY}&format=json&limit=1`,
        { timeout: 8000 }
      );
      if (mandiRes.status === 200) {
        record("External", "Data.gov.in Mandi API", "PASS", "Government Agmarknet API key valid and active");
      } else {
        record("External", "Data.gov.in Mandi API", "WARN", `Data.gov.in returned HTTP ${mandiRes.status}`);
      }
    } catch (err: any) {
      record("External", "Data.gov.in Mandi API", "WARN", `Data.gov.in check: ${err.message}`);
    }
  } else {
    record("External", "Data.gov.in Mandi API", "WARN", "DATA_GOV_API_KEY not configured (using cached/fallback rates)");
  }

  // Google Gemini AI Engine
  if (process.env.GEMINI_API_KEY) {
    try {
      const model = process.env.GEMINI_MODEL || "gemini-3.6-flash";
      const geminiRes = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`,
        {
          contents: [{ parts: [{ text: "ping" }] }],
          generationConfig: { maxOutputTokens: 10 },
        },
        { timeout: 10000 }
      );
      if (geminiRes.status === 200 && geminiRes.data?.candidates?.[0]?.content) {
        record(
          "External",
          "Google Gemini AI",
          "PASS",
          `Connected and responsive via model '${model}' (Phase 12 Crop Doctor & Voice AI active)`
        );
      } else {
        record("External", "Google Gemini AI", "WARN", `Unexpected response format from model '${model}'`);
      }
    } catch (err: any) {
      record("External", "Google Gemini AI", "WARN", `Gemini API check warning: ${err?.response?.data?.error?.message || err.message}`);
    }
  } else {
    record("External", "Google Gemini AI", "WARN", "GEMINI_API_KEY not configured (safe basic fallback mode active)");
  }

  // SUMMARY REPORT
  console.log("\n=======================================================");
  const total = results.length;
  const passed = results.filter((r) => r.status === "PASS").length;
  const warned = results.filter((r) => r.status === "WARN").length;
  const failed = results.filter((r) => r.status === "FAIL").length;

  console.log(`📊 SUMMARY: ${passed}/${total} Passed, ${warned} Warnings, ${failed} Failed.`);
  console.log("=======================================================\n");

  await mongoose.disconnect();
  process.exit(failed > 0 ? 1 : 0);
}

runDiagnostics().catch((err) => {
  console.error("Diagnostics crash:", err);
  process.exit(1);
});
