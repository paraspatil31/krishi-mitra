import type { Order, OrderStatus } from "@/types/order";

const initialOrders: Order[] = [
  {
    id: "order_1",
    buyerId: "user_buyer_1",
    buyerName: "Amara Chen",
    farmerId: "user_farmer_1",
    farmerName: "Samuel Okafor",
    items: [
      {
        productId: "listing_1",
        productName: "Organic Heirloom Tomatoes",
        quantity: 5,
        unit: "kg",
        price: 4.5,
      },
      {
        productId: "listing_2",
        productName: "Fresh Garden Spinach",
        quantity: 3,
        unit: "bunch",
        price: 2.0,
      },
    ],
    total: 28.5,
    status: "delivered",
    deliveryAddress: "14 Parklands Road, Nairobi",
    createdAt: "2024-11-28T10:00:00Z",
    updatedAt: "2024-12-01T15:00:00Z",
  },
  {
    id: "order_2",
    buyerId: "user_buyer_1",
    buyerName: "Amara Chen",
    farmerId: "user_farmer_1",
    farmerName: "Samuel Okafor",
    items: [
      {
        productId: "listing_3",
        productName: "Raw Wildflower Honey",
        quantity: 2,
        unit: "500g jar",
        price: 12.0,
      },
    ],
    total: 24.0,
    status: "pending",
    deliveryAddress: "14 Parklands Road, Nairobi",
    createdAt: "2024-12-05T09:30:00Z",
    updatedAt: "2024-12-05T09:30:00Z",
  },
];

let store: Order[] = initialOrders.map((o) => ({ ...o }));

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const mockOrderApi = {
  async getByFarmer(farmerId: string): Promise<Order[]> {
    await delay(450);
    return store.filter((o) => o.farmerId === farmerId);
  },

  async getByBuyer(buyerId: string): Promise<Order[]> {
    await delay(450);
    return store.filter((o) => o.buyerId === buyerId);
  },

  async getById(id: string): Promise<Order> {
    await delay(280);
    const order = store.find((o) => o.id === id);
    if (!order) throw new Error("Order not found.");
    return { ...order };
  },

  async updateStatus(id: string, status: OrderStatus): Promise<Order> {
    await delay(500);
    const idx = store.findIndex((o) => o.id === id);
    if (idx === -1) throw new Error("Order not found.");
    store[idx] = { ...store[idx], status, updatedAt: new Date().toISOString() };
    return { ...store[idx] };
  },
};
