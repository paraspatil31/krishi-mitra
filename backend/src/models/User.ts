import { Schema, model, Document, Model } from "mongoose";
import bcrypt from "bcrypt";

export type UserRole = "farmer" | "buyer" | "admin" | "fpo";
export type BuyerType = "household" | "business";

export interface IFPOProfile {
  orgName: string;
  registrationNumber?: string;
  establishedYear?: number;
  contactPerson?: string;
  phone?: string;
  officeAddress?: string;
  district?: string;
  state?: string;
  totalMembersCount?: number;
  commoditiesHandled?: string[];
}

export interface IBusinessProfile {
  businessName?: string;
  businessType?: string;
  gstin?: string;
  businessAddress?: string;
  contactPerson?: string;
  phone?: string;
  preferredProducts?: string[];
  typicalPurchaseQuantity?: string;
}

export interface IFarmProfile {
  farmName?: string;
  farmAddress?: string;
  landSizeAcres?: number;
  primaryCrops?: string[];
  organicCertified?: boolean;
}

export interface ISavedAddress {
  _id?: any;
  label?: string;
  fullName: string;
  phone: string;
  street: string;
  district: string;
  state: string;
  pincode: string;
  landmark?: string;
  isDefault?: boolean;
  coordinates?: [number, number]; // [lng, lat]
}

export interface INotificationPreferences {
  orderUpdates?: boolean;
  buyerRequirements?: boolean;
  priceOffers?: boolean;
  mandiUpdates?: boolean;
  weatherAlerts?: boolean;
  dispatchUpdates?: boolean;
  promotional?: boolean;
  quotationUpdates?: boolean;
  storageAvailability?: boolean;
  deliveryUpdates?: boolean;
}

export interface IProcurementPreferences {
  preferredProducts?: string[];
  typicalPurchaseQuantity?: string;
  quantityUnit?: "kg" | "Quintal" | "Ton";
  preferredDeliveryLocations?: string[];
  procurementFrequency?: "Weekly" | "Monthly" | "As Required";
}

export interface IFarmerPreferences {
  preferredCrops?: string[];
  preferredMarket?: string;
  preferredUnit?: "kg" | "Quintal" | "Ton";
}

export interface IUserSettings {
  currency?: string;
  distanceUnit?: string;
  quantityUnit?: "kg" | "Quintal" | "Ton";
  marketplaceView?: "grid" | "list";
  profileVisibility?: "public" | "private";
  notifications?: INotificationPreferences;
  farmerPreferences?: IFarmerPreferences;
  procurementPreferences?: IProcurementPreferences;
}

export interface IUser extends Document {
  name: string;
  phone: string;
  email?: string;
  passwordHash: string;
  role: UserRole;
  buyerType?: BuyerType;
  businessProfile?: IBusinessProfile;
  farmProfile?: IFarmProfile;
  fpoProfile?: IFPOProfile;
  fpoId?: string; // If farmer is associated with an FPO
  avatar?: string;
  isVerifiedBuyer?: boolean;
  isPhoneVerified?: boolean;
  isActive?: boolean;
  verificationDetails?: {
    verifiedAt?: Date;
    verifiedBy?: string;
    notes?: string;
  };
  location?: {
    type: "Point";
    coordinates: [number, number]; // [lng, lat]
  };
  district?: string;
  preferredLanguage?: "en" | "hi" | "mr";
  savedAddresses?: ISavedAddress[];
  settings?: IUserSettings;
  createdAt: Date;
  comparePassword(candidate: string): Promise<boolean>;
}

interface IUserModel extends Model<IUser> {}

const userSchema = new Schema<IUser>({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100,
  },
  phone: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
  },
  passwordHash: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ["farmer", "buyer", "admin", "fpo"],
    required: true,
  },
  buyerType: {
    type: String,
    enum: ["household", "business"],
    default: function (this: any) {
      return this.role === "buyer" ? "household" : undefined;
    },
  },
  businessProfile: {
    businessName: { type: String, trim: true },
    businessType: { type: String, trim: true },
    gstin: { type: String, trim: true },
    businessAddress: { type: String, trim: true },
    contactPerson: { type: String, trim: true },
    phone: { type: String, trim: true },
    preferredProducts: [{ type: String, trim: true }],
    typicalPurchaseQuantity: { type: String, trim: true },
  },
  farmProfile: {
    farmName: { type: String, trim: true },
    farmAddress: { type: String, trim: true },
    landSizeAcres: { type: Number, min: 0 },
    primaryCrops: [{ type: String, trim: true }],
    organicCertified: { type: Boolean, default: false },
  },
  fpoProfile: {
    orgName: { type: String, trim: true },
    registrationNumber: { type: String, trim: true },
    establishedYear: { type: Number },
    contactPerson: { type: String, trim: true },
    phone: { type: String, trim: true },
    officeAddress: { type: String, trim: true },
    district: { type: String, trim: true },
    state: { type: String, default: "Maharashtra" },
    totalMembersCount: { type: Number, default: 0 },
    commoditiesHandled: [{ type: String, trim: true }],
  },
  fpoId: {
    type: String,
    index: true,
  },
  avatar: {
    type: String,
    trim: true,
  },
  isVerifiedBuyer: {
    type: Boolean,
    default: false,
  },
  isPhoneVerified: {
    type: Boolean,
    default: false,
  },
  verificationDetails: {
    verifiedAt: { type: Date },
    verifiedBy: { type: String },
    notes: { type: String },
  },
  location: {
    type: {
      type: String,
      enum: ["Point"],
    },
    coordinates: {
      type: [Number], // [lng, lat]
    },
  },
  district: {
    type: String,
    trim: true,
  },
  preferredLanguage: {
    type: String,
    enum: ["en", "hi", "mr"],
    default: "en",
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  savedAddresses: [
    {
      label: { type: String, trim: true },
      fullName: { type: String, required: true, trim: true },
      phone: { type: String, required: true, trim: true },
      street: { type: String, required: true, trim: true },
      district: { type: String, required: true, trim: true },
      state: { type: String, default: "Maharashtra" },
      pincode: { type: String, required: true, trim: true },
      landmark: { type: String, trim: true },
      isDefault: { type: Boolean, default: false },
      coordinates: { type: [Number] },
    },
  ],
  settings: {
    currency: { type: String, default: "INR" },
    distanceUnit: { type: String, default: "km" },
    quantityUnit: { type: String, enum: ["kg", "Quintal", "Ton"], default: "kg" },
    marketplaceView: { type: String, enum: ["grid", "list"], default: "grid" },
    profileVisibility: { type: String, enum: ["public", "private"], default: "public" },
    notifications: {
      orderUpdates: { type: Boolean, default: true },
      buyerRequirements: { type: Boolean, default: true },
      priceOffers: { type: Boolean, default: true },
      mandiUpdates: { type: Boolean, default: true },
      weatherAlerts: { type: Boolean, default: true },
      dispatchUpdates: { type: Boolean, default: true },
      promotional: { type: Boolean, default: false },
      quotationUpdates: { type: Boolean, default: true },
      storageAvailability: { type: Boolean, default: true },
      deliveryUpdates: { type: Boolean, default: true },
    },
    farmerPreferences: {
      preferredCrops: [{ type: String, trim: true }],
      preferredMarket: { type: String, trim: true },
      preferredUnit: { type: String, enum: ["kg", "Quintal", "Ton"], default: "kg" },
    },
    procurementPreferences: {
      preferredProducts: [{ type: String, trim: true }],
      typicalPurchaseQuantity: { type: String, trim: true },
      quantityUnit: { type: String, enum: ["kg", "Quintal", "Ton"], default: "Ton" },
      preferredDeliveryLocations: [{ type: String, trim: true }],
      procurementFrequency: { type: String, enum: ["Weekly", "Monthly", "As Required"], default: "As Required" },
    },
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Geo index for proximity search
userSchema.index({ location: "2dsphere" });
userSchema.index({ role: 1, buyerType: 1 });

// Never let password hash leak; ensure virtual id exists
userSchema.set("toJSON", {
  virtuals: true,
  transform: (_doc, ret) => {
    const { passwordHash, _id, __v, ...user } = ret;
    user.id = _doc._id.toString();
    return user;
  },
});

userSchema.set("toObject", {
  virtuals: true,
  transform: (_doc, ret) => {
    const { passwordHash, _id, __v, ...user } = ret;
    user.id = _doc._id.toString();
    return user;
  },
});

userSchema.methods.comparePassword = async function (
  candidate: string
): Promise<boolean> {
  return bcrypt.compare(candidate, this.passwordHash);
};

const User = model<IUser, IUserModel>("User", userSchema);

export default User;
