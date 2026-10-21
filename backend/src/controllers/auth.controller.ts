import { Request, Response, NextFunction } from "express";
import bcrypt from "bcrypt";
import User from "../models/User";
import { AppError } from "../utils/AppError";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../utils/jwt";
import { SignupInput, LoginInput, AuthResponse } from "../types/auth.types";
import { sendOtp, verifyOtp } from "../services/otp.service";
import { validatePhone, validateEmail, validatePassword, sanitizeString } from "../utils/validation";

const SALT_ROUNDS = 10;
const REFRESH_COOKIE_NAME = "refreshToken";
const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

/**
 * Sends an OTP to the given phone number for verification or login.
 */
export async function sendOtpHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const rawPhone = req.body.phone;
    const purpose = req.body.purpose || "verify_phone";

    const validPhone = validatePhone(rawPhone);

    // If purpose is login, ensure an account actually exists before sending OTP
    if (purpose === "login") {
      const existingUser = await User.findOne({ phone: validPhone });
      if (!existingUser) {
        throw new AppError("No account found with this mobile number. Please check your number or sign up first.", 404);
      }
    }

    const result = await sendOtp(validPhone, purpose);
    res.status(200).json({ data: result });
  } catch (err) {
    next(err);
  }
}

/**
 * Verifies an OTP code entered by the user.
 */
export async function verifyOtpHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { phone, otp, purpose = "verify_phone" } = req.body;

    if (!otp) {
      throw new AppError("Verification code (OTP) is required", 400);
    }

    const validPhone = validatePhone(phone);
    const result = await verifyOtp(validPhone, otp, purpose);

    // If purpose is login, log the user in immediately if account exists
    if (purpose === "login") {
      const user = await User.findOne({ phone: validPhone });
      if (!user) {
        throw new AppError("No account found with this mobile number. Please check your number or sign up first.", 404);
      }

      user.isPhoneVerified = true;
      await user.save();

      const payload = { sub: user.id, role: user.role, buyerType: user.buyerType };
      const accessToken = signAccessToken(payload);
      const refreshToken = signRefreshToken(payload);
      res.cookie(REFRESH_COOKIE_NAME, refreshToken, REFRESH_COOKIE_OPTIONS);

      const response: AuthResponse = {
        accessToken,
        user: {
          id: user.id,
          name: user.name,
          phone: user.phone,
          role: user.role,
          avatar: user.avatar,
          district: user.district,
          location: user.location,
          buyerType: user.buyerType,
          businessProfile: user.businessProfile,
          fpoProfile: user.fpoProfile,
          fpoId: user.fpoId,
          isVerifiedBuyer: user.isVerifiedBuyer,
          isPhoneVerified: true,
        } as any,
      };
      res.status(200).json({ data: response, message: "Logged in successfully via verified OTP" });
      return;
    }

    res.status(200).json({ data: result });
  } catch (err) {
    next(err);
  }
}

export async function signup(
  req: Request<{}, {}, SignupInput>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { name: rawName, phone: rawPhone, email: rawEmail, password: rawPassword, role, buyerType: rawBuyerType } = req.body;

    const name = sanitizeString(rawName, "Full Name", { minLen: 2, maxLen: 100 });
    const phone = validatePhone(rawPhone);
    const email = validateEmail(rawEmail);
    const password = validatePassword(rawPassword);

    if (!role || !["farmer", "buyer", "fpo"].includes(role)) {
      throw new AppError("Role must be 'farmer', 'buyer', or 'fpo'", 400);
    }

    let buyerType = undefined;
    if (role === "buyer") {
      buyerType = rawBuyerType === "business" ? "business" : "household";
    }

    let fpoProfile = undefined;
    if (role === "fpo") {
      const rawOrg = (req.body as any).fpoProfile || {};
      fpoProfile = {
        orgName: rawOrg.orgName || name,
        registrationNumber: rawOrg.registrationNumber,
        establishedYear: rawOrg.establishedYear,
        contactPerson: rawOrg.contactPerson || name,
        phone: rawOrg.phone || phone,
        officeAddress: rawOrg.officeAddress,
        district: rawOrg.district || (req.body as any).district,
        state: rawOrg.state || "Maharashtra",
        totalMembersCount: rawOrg.totalMembersCount || 0,
        commoditiesHandled: Array.isArray(rawOrg.commoditiesHandled) ? rawOrg.commoditiesHandled : [],
      };
    }

    const existing = await User.findOne({ phone });
    if (existing) {
      throw new AppError("An account with this phone number already exists", 409);
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const user = await User.create({
      name,
      phone,
      email,
      passwordHash,
      role,
      buyerType,
      fpoProfile,
      isPhoneVerified: true, // Marked verified if completed registration flow
    });

    const payload = { sub: user.id, role: user.role, buyerType: user.buyerType };
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    res.cookie(REFRESH_COOKIE_NAME, refreshToken, REFRESH_COOKIE_OPTIONS);

    const response: AuthResponse = {
      accessToken,
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        role: user.role,
        avatar: user.avatar,
        district: user.district,
        location: user.location,
        buyerType: user.buyerType,
        businessProfile: user.businessProfile,
        fpoProfile: user.fpoProfile,
        fpoId: user.fpoId,
        isVerifiedBuyer: user.isVerifiedBuyer,
        isPhoneVerified: user.isPhoneVerified,
      } as any,
    };
    res.status(201).json({ data: response });
  } catch (err) {
    next(err);
  }
}

export async function login(
  req: Request<{}, {}, LoginInput>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const rawIdentifier = req.body.identifier || req.body.phone || req.body.email;
    const { password } = req.body;

    if (!rawIdentifier || !password) {
      throw new AppError("Phone/Email and password are required", 400);
    }

    const trimmed = String(rawIdentifier).trim();
    const isEmail = trimmed.includes("@");

    // Generic error for account enumeration protection
    const invalidCredentialsError = new AppError("Invalid phone number or password", 401);

    let user: any = null;

    if (isEmail) {
      let email: string | undefined;
      try {
        email = validateEmail(trimmed);
      } catch {
        throw invalidCredentialsError;
      }
      if (!email) {
        throw invalidCredentialsError;
      }

      const candidates = await User.find({ email: email.toLowerCase() });
      if (!candidates || candidates.length === 0) {
        throw invalidCredentialsError;
      }

      for (const candidate of candidates) {
        const isMatch = await candidate.comparePassword(password);
        if (isMatch) {
          user = candidate;
          break;
        }
      }

      if (!user) {
        throw invalidCredentialsError;
      }
    } else {
      let phone: string;
      try {
        phone = validatePhone(trimmed);
      } catch {
        throw invalidCredentialsError;
      }

      user = await User.findOne({ phone });
      if (!user) {
        throw invalidCredentialsError;
      }

      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        throw invalidCredentialsError;
      }
    }

    const payload = { sub: user.id, role: user.role, buyerType: user.buyerType };
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    res.cookie(REFRESH_COOKIE_NAME, refreshToken, REFRESH_COOKIE_OPTIONS);

    const response: AuthResponse = {
      accessToken,
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        role: user.role,
        avatar: user.avatar,
        district: user.district,
        location: user.location,
        buyerType: user.buyerType,
        businessProfile: user.businessProfile,
        fpoProfile: user.fpoProfile,
        fpoId: user.fpoId,
        isVerifiedBuyer: user.isVerifiedBuyer,
        isPhoneVerified: user.isPhoneVerified,
      } as any,
    };
    res.status(200).json({ data: response });
  } catch (err) {
    next(err);
  }
}

export async function refresh(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const token = req.cookies[REFRESH_COOKIE_NAME];
    if (!token) {
      throw new AppError("Refresh token missing", 401);
    }

    const payload = verifyRefreshToken(token);
    const user = await User.findById(payload.sub);
    if (!user) {
      throw new AppError("User no longer exists", 401);
    }

    const newPayload = { sub: user.id, role: user.role, buyerType: user.buyerType };
    const newAccessToken = signAccessToken(newPayload);
    const newRefreshToken = signRefreshToken(newPayload);

    res.cookie(REFRESH_COOKIE_NAME, newRefreshToken, REFRESH_COOKIE_OPTIONS);

    res.status(200).json({
      data: {
        accessToken: newAccessToken,
        user: {
          id: user.id,
          name: user.name,
          phone: user.phone,
          role: user.role,
          avatar: user.avatar,
          buyerType: user.buyerType,
          businessProfile: user.businessProfile,
          fpoProfile: user.fpoProfile,
          fpoId: user.fpoId,
          isVerifiedBuyer: user.isVerifiedBuyer,
          isPhoneVerified: user.isPhoneVerified,
        } as any,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function me(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError("Unauthorized", 401);
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      throw new AppError("User not found", 404);
    }

    res.status(200).json({
      data: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        buyerType: user.buyerType,
        businessProfile: user.businessProfile,
        isVerifiedBuyer: user.isVerifiedBuyer,
        isPhoneVerified: user.isPhoneVerified,
        district: user.district,
        location: user.location,
        farmProfile: user.farmProfile,
        fpoProfile: user.fpoProfile,
        fpoId: user.fpoId,
        preferredLanguage: user.preferredLanguage || "en",
        savedAddresses: user.savedAddresses || [],
        settings: user.settings,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function updateProfile(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.id;
    const { name, email, preferredLanguage, avatar, district, location, buyerType, businessProfile, farmProfile } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      throw new AppError("User not found", 404);
    }

    if (name !== undefined) {
      user.name = sanitizeString(name, "Full Name", { minLen: 2, maxLen: 100 });
    }
    if (email !== undefined) {
      user.email = email && email.trim() ? validateEmail(email) : undefined;
    }
    if (preferredLanguage && ["en", "hi", "mr"].includes(preferredLanguage)) {
      user.preferredLanguage = preferredLanguage;
    }
    if (avatar !== undefined) {
      user.avatar = avatar;
    }
    if (district !== undefined) {
      user.district = district;
    }
    if (location && Array.isArray(location.coordinates) && location.coordinates.length === 2) {
      user.location = {
        type: "Point",
        coordinates: [Number(location.coordinates[0]), Number(location.coordinates[1])],
      };
    }

    // Allow switching buyerType for buyers
    if (user.role === "buyer" && buyerType && ["household", "business"].includes(buyerType)) {
      user.buyerType = buyerType;
    }

    // Allow updating businessProfile if provided
    if (businessProfile && typeof businessProfile === "object") {
      user.businessProfile = {
        ...user.businessProfile,
        businessName: businessProfile.businessName ? sanitizeString(businessProfile.businessName, "Business Name", { minLen: 2, maxLen: 120 }) : user.businessProfile?.businessName,
        businessType: businessProfile.businessType || user.businessProfile?.businessType,
        gstin: businessProfile.gstin ? sanitizeString(businessProfile.gstin, "GSTIN", { minLen: 15, maxLen: 15 }).toUpperCase() : user.businessProfile?.gstin,
        businessAddress: businessProfile.businessAddress ? sanitizeString(businessProfile.businessAddress, "Business Address", { minLen: 5, maxLen: 250 }) : user.businessProfile?.businessAddress,
        contactPerson: businessProfile.contactPerson ? sanitizeString(businessProfile.contactPerson, "Contact Person", { minLen: 2, maxLen: 80 }) : user.businessProfile?.contactPerson,
        phone: businessProfile.phone ? sanitizeString(businessProfile.phone, "Phone", { minLen: 10, maxLen: 15 }) : user.businessProfile?.phone,
        preferredProducts: Array.isArray(businessProfile.preferredProducts) ? businessProfile.preferredProducts : user.businessProfile?.preferredProducts,
        typicalPurchaseQuantity: businessProfile.typicalPurchaseQuantity || user.businessProfile?.typicalPurchaseQuantity,
      };
    }

    // Allow updating farmProfile if provided (for farmers)
    if (farmProfile && typeof farmProfile === "object") {
      user.farmProfile = {
        ...user.farmProfile,
        farmName: farmProfile.farmName ? sanitizeString(farmProfile.farmName, "Farm Name", { minLen: 2, maxLen: 120 }) : user.farmProfile?.farmName,
        farmAddress: farmProfile.farmAddress ? sanitizeString(farmProfile.farmAddress, "Farm Address", { minLen: 3, maxLen: 250 }) : user.farmProfile?.farmAddress,
        landSizeAcres: typeof farmProfile.landSizeAcres === "number" ? farmProfile.landSizeAcres : user.farmProfile?.landSizeAcres,
        primaryCrops: Array.isArray(farmProfile.primaryCrops) ? farmProfile.primaryCrops : user.farmProfile?.primaryCrops,
        organicCertified: typeof farmProfile.organicCertified === "boolean" ? farmProfile.organicCertified : user.farmProfile?.organicCertified,
      };
    }

    // Allow updating fpoProfile if provided (for FPOs)
    const rawFPO = (req.body as any).fpoProfile;
    if (rawFPO && typeof rawFPO === "object") {
      user.fpoProfile = {
        ...user.fpoProfile,
        orgName: rawFPO.orgName ? sanitizeString(rawFPO.orgName, "FPO Organization Name", { minLen: 2, maxLen: 150 }) : (user.fpoProfile?.orgName || user.name),
        registrationNumber: rawFPO.registrationNumber || user.fpoProfile?.registrationNumber,
        establishedYear: typeof rawFPO.establishedYear === "number" ? rawFPO.establishedYear : user.fpoProfile?.establishedYear,
        contactPerson: rawFPO.contactPerson ? sanitizeString(rawFPO.contactPerson, "Contact Person", { minLen: 2, maxLen: 100 }) : user.fpoProfile?.contactPerson,
        phone: rawFPO.phone || user.fpoProfile?.phone,
        officeAddress: rawFPO.officeAddress ? sanitizeString(rawFPO.officeAddress, "Office Address", { minLen: 3, maxLen: 250 }) : user.fpoProfile?.officeAddress,
        district: rawFPO.district || user.fpoProfile?.district,
        state: rawFPO.state || user.fpoProfile?.state || "Maharashtra",
        totalMembersCount: typeof rawFPO.totalMembersCount === "number" ? rawFPO.totalMembersCount : user.fpoProfile?.totalMembersCount,
        commoditiesHandled: Array.isArray(rawFPO.commoditiesHandled) ? rawFPO.commoditiesHandled : user.fpoProfile?.commoditiesHandled,
      };
    }

    await user.save();

    res.status(200).json({
      data: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        district: user.district,
        location: user.location,
        preferredLanguage: user.preferredLanguage || "en",
        buyerType: user.buyerType,
        businessProfile: user.businessProfile,
        farmProfile: user.farmProfile,
        savedAddresses: user.savedAddresses || [],
        settings: user.settings,
        isVerifiedBuyer: user.isVerifiedBuyer,
        isPhoneVerified: user.isPhoneVerified,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function updateSettings(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.id;
    const { settings, savedAddresses, buyerType } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      throw new AppError("User not found", 404);
    }

    // Role cannot be changed, but buyerType can switch for buyers
    if (user.role === "buyer" && buyerType && ["household", "business"].includes(buyerType)) {
      user.buyerType = buyerType;
    }

    if (Array.isArray(savedAddresses)) {
      user.savedAddresses = savedAddresses;
    }

    if (settings && typeof settings === "object") {
      if (settings.language && ["en", "hi", "mr"].includes(settings.language)) {
        user.preferredLanguage = settings.language;
      }
      user.settings = {
        ...user.settings,
        ...settings,
        notifications: {
          ...user.settings?.notifications,
          ...settings.notifications,
        },
        farmerPreferences: {
          ...user.settings?.farmerPreferences,
          ...settings.farmerPreferences,
        },
        procurementPreferences: {
          ...user.settings?.procurementPreferences,
          ...settings.procurementPreferences,
        },
      };
      user.markModified("settings");
    }

    await user.save();

    res.status(200).json({
      data: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        district: user.district,
        location: user.location,
        preferredLanguage: user.preferredLanguage || "en",
        buyerType: user.buyerType,
        businessProfile: user.businessProfile,
        farmProfile: user.farmProfile,
        savedAddresses: user.savedAddresses || [],
        settings: user.settings,
        isVerifiedBuyer: user.isVerifiedBuyer,
        isPhoneVerified: user.isPhoneVerified,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function changePassword(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.id;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      throw new AppError("Current password and new password are required", 400);
    }

    if (typeof newPassword !== "string" || newPassword.length < 6) {
      throw new AppError("New password must be at least 6 characters long", 400);
    }

    const user = await User.findById(userId);
    if (!user) {
      throw new AppError("User not found", 404);
    }

    const isValid = await user.comparePassword(currentPassword);
    if (!isValid) {
      throw new AppError("Current password is incorrect", 400);
    }

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.status(200).json({
      message: "Password changed successfully",
    });
  } catch (err) {
    next(err);
  }
}

export async function deleteAccount(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.id;
    const { password } = req.body;

    if (!password) {
      throw new AppError("Password is required to confirm account deletion", 400);
    }

    const user = await User.findById(userId);
    if (!user) {
      throw new AppError("User not found", 404);
    }

    const isValid = await user.comparePassword(password);
    if (!isValid) {
      throw new AppError("Incorrect password", 400);
    }

    user.isActive = false;
    await user.save();

    res.clearCookie(REFRESH_COOKIE_NAME, REFRESH_COOKIE_OPTIONS);

    res.status(200).json({
      message: "Account has been deactivated and scheduled for deletion.",
    });
  } catch (err) {
    next(err);
  }
}

export async function reportIssue(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.id;
    const issueType = req.body.issueType || req.body.category || "General";
    const description =
      req.body.description ||
      (req.body.subject && req.body.message
        ? `[${req.body.subject}] ${req.body.message}`
        : req.body.message || req.body.subject);

    if (!issueType || !description) {
      throw new AppError("Issue category/subject and description are required", 400);
    }

    console.log(`[SUPPORT TICKET] User ${userId} reported [${issueType}]: ${description}`);

    res.status(200).json({
      message: "Your issue report has been submitted to KrishiBazaar support team.",
    });
  } catch (err) {
    next(err);
  }
}

export async function logout(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    res.clearCookie(REFRESH_COOKIE_NAME, REFRESH_COOKIE_OPTIONS);
    res.status(200).json({ message: "Logged out successfully" });
  } catch (err) {
    next(err);
  }
}
