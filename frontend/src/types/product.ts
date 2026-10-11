export type ProductCategory =
  | "vegetables"
  | "fruits"
  | "grains"
  | "dairy"
  | "meat"
  | "herbs"
  | "other";

export interface Product {
  id: string;
  name: string;
  category: ProductCategory;
  description: string;
  price: number;
  unit: string;
  quantity: number;
  location: string;
  images: string[];
  farmerId: string;
  farmerName: string;
  fpoId?: string;
  memberFarmerId?: string;
  memberFarmerName?: string;
  qualityGrade?: string;
  harvestDate: string;
  createdAt: string;
  isActive: boolean;
}

export interface Listing extends Product {
  status: "draft" | "active" | "sold_out" | "archived";
}
