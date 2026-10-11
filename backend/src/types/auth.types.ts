import { UserRole, BuyerType, IBusinessProfile, IFPOProfile } from "../models/User";

export interface SignupInput {
  name: string;
  phone: string;
  email?: string;
  password: string;
  role: UserRole;
  buyerType?: BuyerType;
  fpoProfile?: IFPOProfile;
}

export interface LoginInput {
  phone: string;
  password: string;
}

export interface JwtPayload {
  sub: string; // user id
  role: UserRole;
  buyerType?: BuyerType;
}

export interface AuthResponse {
  accessToken: string;
  user: {
    id: string;
    name: string;
    phone: string;
    role: UserRole;
    buyerType?: BuyerType;
    businessProfile?: IBusinessProfile;
    fpoProfile?: IFPOProfile;
    fpoId?: string;
    avatar?: string;
    district?: string;
    location?: { type: "Point"; coordinates: [number, number] };
    preferredLanguage?: string;
    isVerifiedBuyer?: boolean;
    isPhoneVerified?: boolean;
  };
}
