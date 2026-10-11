import { AppError } from "./AppError";

/**
 * Validates Indian standard mobile numbers (10 digits starting with 6, 7, 8, or 9).
 * Also accepts optional +91 or 0 prefix.
 */
export function validatePhone(phone: string): string {
  if (!phone || typeof phone !== "string") {
    throw new AppError("Phone number is required", 400);
  }

  // Remove spaces, dashes, parentheses
  const cleaned = phone.trim().replace(/[\s\-()]/g, "");

  // Match 10-digit Indian mobile number, optionally prefixed with +91 or 91 or 0
  const match = cleaned.match(/^(?:\+?91|0)?([6-9]\d{9})$/);
  if (!match) {
    throw new AppError(
      "Invalid mobile number. Please provide a valid 10-digit Indian phone number starting with 6-9",
      400
    );
  }

  return match[1]; // Return canonical 10-digit string
}

/**
 * Validates email format if provided.
 */
export function validateEmail(email?: string): string | undefined {
  if (!email || !email.trim()) return undefined;

  const cleaned = email.trim().toLowerCase();
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(cleaned)) {
    throw new AppError("Invalid email address format", 400);
  }

  if (cleaned.length > 100) {
    throw new AppError("Email address must not exceed 100 characters", 400);
  }

  return cleaned;
}

/**
 * Validates password length and sanity.
 */
export function validatePassword(password: string): string {
  if (!password || typeof password !== "string") {
    throw new AppError("Password is required", 400);
  }

  if (password.length < 8) {
    throw new AppError("Password must be at least 8 characters long", 400);
  }

  if (password.length > 128) {
    throw new AppError("Password must not exceed 128 characters", 400);
  }

  return password;
}

/**
 * Sanitizes strings, trimming whitespace and removing potential script or HTML tags.
 */
export function sanitizeString(
  val: any,
  fieldName: string,
  options: { minLen?: number; maxLen?: number; required?: boolean } = {}
): string {
  const { minLen = 1, maxLen = 500, required = true } = options;

  if (val === undefined || val === null || val === "") {
    if (required) {
      throw new AppError(`${fieldName} is required`, 400);
    }
    return "";
  }

  if (typeof val !== "string") {
    throw new AppError(`${fieldName} must be a valid text string`, 400);
  }

  // Strip script tags, html tags, trim whitespace
  const sanitized = val
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<[^>]+>/g, "")
    .trim();

  if (required && sanitized.length < minLen) {
    throw new AppError(
      `${fieldName} must be at least ${minLen} characters long`,
      400
    );
  }

  if (sanitized.length > maxLen) {
    throw new AppError(
      `${fieldName} must not exceed ${maxLen} characters`,
      400
    );
  }

  return sanitized;
}

/**
 * Validates positive finite numbers within sane bounds.
 */
export function validatePositiveNumber(
  val: any,
  fieldName: string,
  options: { min?: number; max?: number; integer?: boolean } = {}
): number {
  const { min = 0.01, max = 10000000, integer = false } = options;

  const num = Number(val);
  if (val === undefined || val === null || isNaN(num) || !isFinite(num)) {
    throw new AppError(`${fieldName} must be a valid number`, 400);
  }

  if (num < min) {
    throw new AppError(`${fieldName} must be at least ${min}`, 400);
  }

  if (num > max) {
    throw new AppError(`${fieldName} cannot exceed ${max}`, 400);
  }

  if (integer && !Number.isInteger(num)) {
    throw new AppError(`${fieldName} must be a whole integer`, 400);
  }

  return num;
}

/**
 * Validates 6-digit Indian PIN code.
 */
export function validatePinCode(pin: any): string {
  if (!pin) {
    throw new AppError("PIN code is required", 400);
  }

  const str = String(pin).trim();
  const pinRegex = /^[1-9][0-9]{5}$/;
  if (!pinRegex.test(str)) {
    throw new AppError("Invalid PIN code. Indian postal codes must be 6 digits (e.g. 422001)", 400);
  }

  return str;
}

/**
 * Validates harvest dates (between 2 years in past and 1 year in future).
 */
export function validateHarvestDate(dateStr: any): Date {
  if (!dateStr) {
    throw new AppError("Harvest date is required", 400);
  }

  const d = new Date(dateStr);
  if (isNaN(d.getTime())) {
    throw new AppError("Invalid harvest date format", 400);
  }

  const now = new Date();
  const twoYearsAgo = new Date();
  twoYearsAgo.setFullYear(now.getFullYear() - 2);

  const oneYearAhead = new Date();
  oneYearAhead.setFullYear(now.getFullYear() + 1);

  if (d < twoYearsAgo) {
    throw new AppError("Harvest date cannot be more than 2 years in the past", 400);
  }

  if (d > oneYearAhead) {
    throw new AppError("Harvest date cannot be more than 1 year in the future", 400);
  }

  return d;
}

/**
 * Allowed units for crop produce.
 */
export const ALLOWED_UNITS = ["kg", "quintal", "dozen", "piece", "ton", "crate", "g", "L"] as const;
export type CropUnit = typeof ALLOWED_UNITS[number];

export function validateCropUnit(unit: any): CropUnit {
  if (!unit || !ALLOWED_UNITS.includes(unit)) {
    throw new AppError(`Unit must be one of: ${ALLOWED_UNITS.join(", ")}`, 400);
  }
  return unit as CropUnit;
}

/**
 * Structured delivery address interface & validation.
 */
export interface IDeliveryAddress {
  fullName: string;
  phone: string;
  street: string;
  district: string;
  state: string;
  pincode: string;
  landmark?: string;
  coordinates?: [number, number]; // [lng, lat]
}

export function validateDeliveryAddress(addr: any): IDeliveryAddress {
  if (!addr) {
    throw new AppError("Delivery address is required", 400);
  }

  // If a raw string was provided, wrap it into standard structure
  if (typeof addr === "string") {
    const trimmed = addr.trim();
    if (trimmed.length < 10) {
      throw new AppError("Please provide a complete delivery address (at least 10 characters)", 400);
    }
    return {
      fullName: "Customer",
      phone: "9876543210",
      street: trimmed,
      district: "Local District",
      state: "Maharashtra",
      pincode: "400001",
    };
  }

  if (typeof addr !== "object") {
    throw new AppError("Invalid delivery address format", 400);
  }

  const fullName = sanitizeString(addr.fullName, "Recipient Name", { minLen: 2, maxLen: 100 });
  const phone = validatePhone(addr.phone);
  const street = sanitizeString(addr.street || addr.address, "Street Address", { minLen: 5, maxLen: 300 });
  const district = sanitizeString(addr.district || addr.city, "City/District", { minLen: 2, maxLen: 100 });
  const state = sanitizeString(addr.state, "State", { minLen: 2, maxLen: 100 });
  const pincode = validatePinCode(addr.pincode);
  const landmark = addr.landmark ? sanitizeString(addr.landmark, "Landmark", { required: false, maxLen: 100 }) : undefined;

  let coordinates: [number, number] | undefined;
  if (addr.coordinates && Array.isArray(addr.coordinates) && addr.coordinates.length === 2) {
    const [lng, lat] = addr.coordinates.map(Number);
    if (!isNaN(lng) && !isNaN(lat) && lng >= -180 && lng <= 180 && lat >= -90 && lat <= 90) {
      coordinates = [lng, lat];
    }
  }

  return {
    fullName,
    phone,
    street,
    district,
    state,
    pincode,
    landmark,
    coordinates,
  };
}
