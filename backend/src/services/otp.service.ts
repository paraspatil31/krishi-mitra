import OtpVerification from "../models/OtpVerification";
import { AppError } from "../utils/AppError";

const MOCK_DEFAULT_OTP = "123456";
const OTP_EXPIRY_MINUTES = 10;
const MAX_ATTEMPTS = 5;

/**
 * Generates and sends OTP for phone verification.
 * In development / mock mode, uses a predictable code or random 6-digit code
 * and returns it in the payload and console log so developers can easily test.
 */
export async function sendOtp(phone: string, purpose: "signup" | "login" | "verify_phone" = "verify_phone") {
  // Clean phone to 10 digits
  const cleanedPhone = phone.trim().replace(/[\s\-()]/g, "").slice(-10);

  // In production, this can be randomly generated (e.g. Math.floor(100000 + Math.random() * 900000).toString())
  // In development/mock mode, default to 123456 or env-defined mock
  const otpCode = process.env.MOCK_OTP || MOCK_DEFAULT_OTP;
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  // Invalidate any existing active OTP for this phone + purpose
  await OtpVerification.deleteMany({ phone: cleanedPhone, purpose });

  // Create new OTP record
  await OtpVerification.create({
    phone: cleanedPhone,
    otp: otpCode,
    purpose,
    expiresAt,
    verified: false,
    attempts: 0,
  });

  console.log(`\n==============================================`);
  console.log(`📱 [MOCK OTP SERVICE] Verification Code Sent!`);
  console.log(`📞 Phone: +91-${cleanedPhone}`);
  console.log(`🔑 OTP Code: ${otpCode}`);
  console.log(`🎯 Purpose: ${purpose}`);
  console.log(`⏰ Valid for: ${OTP_EXPIRY_MINUTES} minutes`);
  console.log(`==============================================\n`);

  return {
    success: true,
    message: `OTP sent successfully to +91-${cleanedPhone}`,
    phone: cleanedPhone,
    expiresAt,
    mockOtp: otpCode, // Exposed in development mode for easy manual/automated testing
  };
}

/**
 * Verifies the user-entered OTP.
 */
export async function verifyOtp(phone: string, enteredOtp: string, purpose: "signup" | "login" | "verify_phone" = "verify_phone") {
  const cleanedPhone = phone.trim().replace(/[\s\-()]/g, "").slice(-10);
  const otp = enteredOtp.trim();

  const record = await OtpVerification.findOne({
    phone: cleanedPhone,
    purpose,
    verified: false,
  }).sort({ createdAt: -1 });

  if (!record) {
    throw new AppError("No active OTP request found for this phone number. Please request a new OTP.", 400);
  }

  if (new Date() > record.expiresAt) {
    await OtpVerification.deleteOne({ _id: record._id });
    throw new AppError("This OTP has expired. Please request a new one.", 400);
  }

  if (record.attempts >= MAX_ATTEMPTS) {
    await OtpVerification.deleteOne({ _id: record._id });
    throw new AppError("Too many incorrect attempts. Please request a new OTP.", 429);
  }

  // Check if matches either the record OTP or universal dev bypass (123456)
  const isMatch = record.otp === otp || otp === MOCK_DEFAULT_OTP;

  if (!isMatch) {
    record.attempts += 1;
    await record.save();
    const remaining = MAX_ATTEMPTS - record.attempts;
    throw new AppError(`Invalid OTP code. ${remaining} attempt(s) remaining.`, 400);
  }

  // Mark as verified
  record.verified = true;
  await record.save();

  return {
    success: true,
    message: "Phone number verified successfully.",
    phone: cleanedPhone,
  };
}
