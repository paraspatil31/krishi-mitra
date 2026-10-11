export type StorageFacilityType =
  | "cold_storage"
  | "dry_warehouse"
  | "silo"
  | "ripening_chamber";

export interface StorageFacility {
  id: string;
  name: string;
  type: StorageFacilityType;
  district: string;
  state: string;
  address: string;
  pincode: string;
  location: {
    type: "Point";
    coordinates: [number, number]; // [lng, lat]
  };
  totalCapacity: number; // in Metric Tons (MT)
  availableCapacity: number; // in Metric Tons (MT)
  capacityUpdatedAt: string;
  temperatureRange?: string;
  pricePerTonPerMonth: number;
  amenities: string[];
  contactPhone: string;
  contactEmail?: string;
  operatingHours: string;
  wdraRegistered: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StorageFilterParams {
  district?: string;
  type?: string;
  search?: string;
  lat?: number;
  lng?: number;
  radiusKm?: number;
}
