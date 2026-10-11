export type BulkRequirementStatus = "open" | "fulfilled" | "cancelled";
export type BulkUnit = "tons" | "quintals" | "crates" | "kg";

export interface Quotation {
  id?: string;
  _id?: string;
  farmerId: string;
  farmerName: string;
  farmerPhone: string;
  offeredPricePerUnit: number;
  availableQuantity: number;
  availableDate: string;
  notes?: string;
  createdAt: string;
}

export interface BulkRequirement {
  id: string;
  buyerId: {
    id: string;
    name: string;
    phone: string;
    businessProfile?: {
      businessName?: string;
      businessType?: string;
      gstin?: string;
      businessAddress?: string;
    };
  } | string;
  product: string;
  quantity: number;
  unit: BulkUnit;
  targetPricePerUnit?: number;
  requiredByDate: string;
  deliveryLocation: {
    address: string;
    district: string;
    state: string;
    pincode?: string;
  };
  status: BulkRequirementStatus;
  notes?: string;
  quotationsCount: number;
  quotations?: Quotation[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateBulkRequirementInput {
  product: string;
  quantity: number;
  unit: BulkUnit;
  targetPricePerUnit?: number;
  requiredByDate: string;
  deliveryLocation: {
    address: string;
    district: string;
    state?: string;
    pincode?: string;
  };
  notes?: string;
}

export interface SubmitQuotationInput {
  offeredPricePerUnit: number;
  availableQuantity: number;
  availableDate: string;
  notes?: string;
}
