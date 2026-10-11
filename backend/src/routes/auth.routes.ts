import { Router } from "express";
import {
  signup,
  login,
  refresh,
  logout,
  me,
  updateProfile,
  updateSettings,
  changePassword,
  deleteAccount,
  reportIssue,
  sendOtpHandler,
  verifyOtpHandler,
} from "../controllers/auth.controller";
import { authenticate } from "../middleware/auth.middleware";
import { authRateLimiter, otpRateLimiter } from "../middleware/rateLimit";

const router = Router();

// Rate-limited auth & OTP endpoints per docs/03-security-and-access.md
router.post("/signup", authRateLimiter, signup);
router.post("/login", authRateLimiter, login);
router.post("/otp/send", otpRateLimiter, sendOtpHandler);
router.post("/otp/verify", otpRateLimiter, verifyOtpHandler);

router.post("/refresh", refresh);
router.post("/logout", logout);
router.get("/me", authenticate, me);
router.patch("/profile", authenticate, updateProfile);

// Authenticated Settings & Security routes
router.patch("/settings", authenticate, updateSettings);
router.post("/change-password", authenticate, changePassword);
router.delete("/account", authenticate, deleteAccount);
router.post("/support/report", authenticate, reportIssue);

export default router;
