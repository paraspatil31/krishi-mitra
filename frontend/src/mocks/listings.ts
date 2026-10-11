import type { Listing, ProductCategory } from "@/types/product";

const initialListings: Listing[] = [
  {
    id: "listing_1",
    farmerId: "user_farmer_1",
    farmerName: "Samuel Okafor",
    name: "Organic Heirloom Tomatoes",
    category: "vegetables",
    description:
      "Sun-ripened heirloom tomatoes grown without pesticides. Rich, complex flavor with a perfect balance of sweetness and acidity. Picked at peak ripeness and delivered within 24 hours of harvest.",
    price: 4.5,
    unit: "kg",
    quantity: 120,
    location: "Nairobi, Kenya",
    images: [
      "https://images.unsplash.com/photo-1518977822534-7049a61ee0c2?w=600&h=400&fit=crop&auto=format",
    ],
    harvestDate: "2024-12-01",
    createdAt: "2024-11-20T10:00:00Z",
    isActive: true,
    status: "active",
  },
  {
    id: "listing_2",
    farmerId: "user_farmer_1",
    farmerName: "Samuel Okafor",
    name: "Fresh Garden Spinach",
    category: "vegetables",
    description:
      "Tender baby spinach leaves harvested at peak freshness. Perfect for salads, smoothies, or sautéing. No chemicals used, irrigated with natural spring water.",
    price: 2.0,
    unit: "bunch",
    quantity: 80,
    location: "Eldoret, Kenya",
    images: [
      "https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=600&h=400&fit=crop&auto=format",
    ],
    harvestDate: "2024-12-05",
    createdAt: "2024-11-25T08:00:00Z",
    isActive: true,
    status: "active",
  },
  {
    id: "listing_3",
    farmerId: "user_farmer_1",
    farmerName: "Samuel Okafor",
    name: "Raw Wildflower Honey",
    category: "other",
    description:
      "Pure unfiltered honey from free-range hives set in indigenous wildflower meadows at high altitude. Cold-extracted to preserve natural enzymes and antioxidants.",
    price: 12.0,
    unit: "500g jar",
    quantity: 40,
    location: "Meru, Kenya",
    images: [
      "https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=600&h=400&fit=crop&auto=format",
    ],
    harvestDate: "2024-11-15",
    createdAt: "2024-11-18T12:00:00Z",
    isActive: true,
    status: "active",
  },
  {
    id: "listing_4",
    farmerId: "user_farmer_1",
    farmerName: "Samuel Okafor",
    name: "Purple Sweet Potatoes",
    category: "vegetables",
    description:
      "Naturally purple sweet potatoes with a rich, nutty flavour. High in anthocyanin antioxidants. Grown in volcanic soil, excellent for roasting or mashing.",
    price: 3.0,
    unit: "kg",
    quantity: 200,
    location: "Nakuru, Kenya",
    images: [
      "https://images.unsplash.com/photo-1596727362302-b8d891c42ab8?w=600&h=400&fit=crop&auto=format",
    ],
    harvestDate: "2024-12-10",
    createdAt: "2024-12-01T09:00:00Z",
    isActive: false,
    status: "draft",
  },
  {
    id: "listing_5",
    farmerId: "user_farmer_1",
    farmerName: "Samuel Okafor",
    name: "White Maize (Dried)",
    category: "grains",
    description:
      "Traditionally sun-dried white maize. Ideal for ugali, porridge, or milling. Grown without synthetic fertilizers, stored in airtight grain bags immediately after drying.",
    price: 1.2,
    unit: "kg",
    quantity: 0,
    location: "Kitale, Kenya",
    images: [
      "https://images.unsplash.com/photo-1601593346740-925612772716?w=600&h=400&fit=crop&auto=format",
    ],
    harvestDate: "2024-10-20",
    createdAt: "2024-10-25T07:00:00Z",
    isActive: false,
    status: "sold_out",
  },
];

// Mutable in-memory store — simulates a database table for this session
let store: Listing[] = initialListings.map((l) => ({ ...l }));

export type ListingFormData = {
  name: string;
  category: ProductCategory;
  description: string;
  price: number;
  unit: string;
  quantity: number;
  location: string;
  harvestDate: string;
  status: "draft" | "active";
};

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const mockListingApi = {
  async getByFarmer(farmerId: string): Promise<Listing[]> {
    await delay(450);
    return store.filter((l) => l.farmerId === farmerId);
  },

  async getById(id: string): Promise<Listing> {
    await delay(280);
    const listing = store.find((l) => l.id === id);
    if (!listing) throw new Error("Listing not found.");
    return { ...listing };
  },

  async create(
    data: ListingFormData,
    farmer: { id: string; name: string }
  ): Promise<Listing> {
    await delay(700);
    const newListing: Listing = {
      ...data,
      id: `listing_${Date.now()}`,
      farmerId: farmer.id,
      farmerName: farmer.name,
      images: [],
      isActive: data.status === "active",
      createdAt: new Date().toISOString(),
    };
    store.push(newListing);
    return { ...newListing };
  },

  async update(id: string, data: Partial<ListingFormData>): Promise<Listing> {
    await delay(600);
    const idx = store.findIndex((l) => l.id === id);
    if (idx === -1) throw new Error("Listing not found.");
    const updated: Listing = {
      ...store[idx],
      ...data,
      isActive: (data.status ?? store[idx].status) === "active",
    };
    store[idx] = updated;
    return { ...updated };
  },

  async delete(id: string): Promise<void> {
    await delay(450);
    const idx = store.findIndex((l) => l.id === id);
    if (idx === -1) throw new Error("Listing not found.");
    store.splice(idx, 1);
  },
};
