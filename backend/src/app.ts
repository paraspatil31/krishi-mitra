import express, { Application, Request, Response } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

import healthRoutes from "./routes/health.routes";
import authRoutes from "./routes/auth.routes";
import { notFound, errorHandler } from "./middleware/errorHandler";
import listingRoutes from "./routes/listing.routes";
import orderRoutes from "./routes/order.routes";
import adminRoutes from "./routes/admin.routes";
import weatherRoutes from "./routes/weather.routes";
import paymentRoutes from "./routes/payment.routes";
import locationRoutes from "./routes/location.routes";
import ledgerRoutes from "./routes/ledger.routes";
import mandiRoutes from "./routes/mandi.routes";
import offerRoutes from "./routes/offer.routes";
import reviewRoutes from "./routes/review.routes";
import storageRoutes from "./routes/storage.routes";
import notificationRoutes from "./routes/notification.routes";
import marketRoutes from "./routes/market.routes";
import bulkRequirementRoutes from "./routes/bulkRequirement.routes";
import fpoRoutes from "./routes/fpo.routes";
import predictionRoutes from "./routes/prediction.routes";
import aiRoutes from "./routes/ai.routes";

import { publicApiLimiter } from "./middleware/rateLimit";

const app: Application = express();

// --- Core middleware ---
const allowedOrigins = process.env.CLIENT_ORIGIN
  ? process.env.CLIENT_ORIGIN.split(",").map((o) => o.trim())
  : ["http://localhost:8443", "http://localhost:5173"];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, health-check probes)
      if (!origin) return callback(null, true);
      if (
        allowedOrigins.includes(origin) ||
        origin.endsWith(".vercel.app") ||
        process.env.NODE_ENV !== "production"
      ) {
        return callback(null, true);
      }
      return callback(new Error(`CORS origin '${origin}' not permitted.`));
    },
    credentials: true, // required so the refresh-token cookie is sent/received
  })
);

// Parse JSON with rawBody preservation for payment webhook signature validation
// Set 15mb limit to support high-resolution base64 agricultural diagnosis images
app.use(
  express.json({
    limit: "15mb",
    verify: (req: Request, _res: Response, buf: Buffer) => {
      (req as any).rawBody = buf;
    },
  })
);
app.use(express.urlencoded({ extended: true, limit: "15mb" }));
app.use(cookieParser());

// --- Routes ---
app.use("/api/health", healthRoutes); // Health check unthrottled for cloud monitoring
app.use("/api", publicApiLimiter); // Protect all API endpoints
app.use("/api/auth", authRoutes);
app.use("/api/listings", listingRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/offers", offerRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/weather", weatherRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/location", locationRoutes);
app.use("/api/ledger", ledgerRoutes);
app.use("/api/mandi-prices", mandiRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/storage", storageRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/markets", marketRoutes);
app.use("/api/bulk-requirements", bulkRequirementRoutes);
app.use("/api/fpo", fpoRoutes);
app.use("/api/predictions", predictionRoutes);
app.use("/api/ai", aiRoutes);

// --- Error handling (must stay last) ---
app.use(notFound);
app.use(errorHandler);

export default app;
