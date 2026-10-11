export type UserRole = "farmer" | "buyer" | "admin" | "fpo";
export type BuyerType = "household" | "business";

export interface FPOProfile {
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

export interface BusinessProfile {
  businessName?: string;
  businessType?: string; // Restaurant, Hotel, Wholesaler, Retailer, Processor, Exporter, Other
  gstin?: string;
  businessAddress?: string;
  contactPerson?: string;
  phone?: string;
  preferredProducts?: string[];
  typicalPurchaseQuantity?: string;
}

export interface FarmProfile {
  farmName?: string;
  farmAddress?: string;
  landSizeAcres?: number;
  primaryCrops?: string[];
  organicCertified?: boolean;
}

export interface SavedAddress {
  _id?: string;
  id?: string;
  label?: string; // "Home", "Office", "Warehouse", etc.
  fullName?: string;
  phone: string;
  street: string;
  district: string;
  state: string;
  pincode: string;
  landmark?: string;
  isDefault?: boolean;
  coordinates?: [number, number]; // [lng, lat]
}

export interface NotificationPreferences {
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
  email?: boolean;
  sms?: boolean;
  inApp?: boolean;
  priceAlerts?: boolean;
  bulkDemandAlerts?: boolean;
  marketing?: boolean;
}

export interface ProcurementPreferences {
  preferredProducts?: string[];
  typicalPurchaseQuantity?: string;
  quantityUnit?: "kg" | "Quintal" | "Ton";
  preferredDeliveryLocations?: string[];
  procurementFrequency?: "Weekly" | "Monthly" | "As Required";
  preferredCategories?: string[];
  autoNotifyMatchingListings?: boolean;
  preferredPaymentTerm?: string;
  minOrderQuantityKg?: number;
}

export interface FarmerPreferences {
  preferredCrops?: string[];
  preferredMarket?: string;
  preferredUnit?: "kg" | "Quintal" | "Ton";
  defaultListingCategory?: string;
  lowStockThresholdKg?: number;
  notifyOnNewOffers?: boolean;
  autoAcceptOffers?: boolean;
}

export interface UserSettings {
  currency?: string;
  distanceUnit?: string;
  quantityUnit?: "kg" | "Quintal" | "Ton";
  marketplaceView?: "grid" | "list";
  profileVisibility?: "public" | "private";
  language?: string;
  unit?: string;
  dateFormat?: string;
  privacy?: {
    profileVisibility?: string;
    showExactLocation?: boolean;
    showPhoneNumber?: boolean;
    showPhone?: boolean;
    showLocation?: boolean;
  };
  notifications?: NotificationPreferences;
  farmerPreferences?: FarmerPreferences;
  procurementPreferences?: ProcurementPreferences;
}

export interface User {
  id: string;
  name: string;
  phone: string;
  email?: string;
  role: UserRole;
  buyerType?: BuyerType;
  businessProfile?: BusinessProfile;
  farmProfile?: FarmProfile;
  fpoProfile?: FPOProfile;
  fpoId?: string;
  avatar?: string;
  district?: string;
  location?: {
    type: "Point";
    coordinates: [number, number]; // [lng, lat]
  };
  preferredLanguage?: "en" | "hi" | "mr";
  savedAddresses?: SavedAddress[];
  settings?: UserSettings;
  isVerifiedBuyer?: boolean;
  isPhoneVerified?: boolean;
  createdAt?: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface LoginCredentials {
  phone: string;
  password: string;
}

export interface SignupData {
  name: string;
  phone: string;
  email?: string;
  password: string;
  role: Exclude<UserRole, "admin">;
  buyerType?: BuyerType;
  fpoProfile?: FPOProfile;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}
