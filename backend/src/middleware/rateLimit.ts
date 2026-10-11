import rateLimit from "express-rate-limit";

const isDev = process.env.NODE_ENV !== "production";

// Global API rate limiter (protects server from general DDoS and resource exhaustion)
export const publicApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 2000 : 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "API rate limit exceeded. Please throttle your requests." },
});

// Auth rate limiter for signup & login:
// In dev, allow 200 attempts so testing does not block developer.
// In prod, 15 attempts per 15 minutes per IP.
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 200 : 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many login/signup attempts. Please try again in a few minutes." },
});

// OTP rate limiter for sending/verifying verification codes:
export const otpRateLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: isDev ? 200 : 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many OTP requests. Please wait a few minutes before requesting another code." },
});

// Public marketplace listings search limiter (prevents aggressive scraping)
export const listingsSearchLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: isDev ? 500 : 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many search requests. Please slow down." },
});

// Weather advisory limiter (protects upstream meteorological calls)
export const weatherLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: isDev ? 300 : 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many weather advisory requests. Please slow down." },
});

// APMC mandi prices limiter
export const mandiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: isDev ? 300 : 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many mandi price requests. Please wait a moment." },
});

// Order placement rate limiter (prevents rapid-fire race condition attacks)
export const orderLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: isDev ? 300 : 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Order submission rate limit exceeded. Please wait a moment." },
});

// AI Multimodal diagnosis and conversational voice limiter
export const aiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: isDev ? 300 : 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many AI diagnosis or chat requests. Please wait a moment." },
});
