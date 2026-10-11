import type { User, AuthResponse, LoginCredentials, SignupData } from "@/types/auth";

const MOCK_USERS: (User & { password: string })[] = [
  {
    id: "user_farmer_1",
    name: "Samuel Okafor",
    phone: "9876543210",
    email: "farmer@example.com",
    password: "password123",
    role: "farmer",
    createdAt: "2024-01-15T08:00:00Z",
  },
  {
    id: "user_buyer_1",
    name: "Amara Chen",
    phone: "9876543211",
    email: "buyer@example.com",
    password: "password123",
    role: "buyer",
    createdAt: "2024-02-10T09:00:00Z",
  },
  {
    id: "user_admin_1",
    name: "Admin User",
    phone: "9876543212",
    email: "admin@example.com",
    password: "admin123",
    role: "admin",
    createdAt: "2024-01-01T00:00:00Z",
  },
];

let mockUserStore = [...MOCK_USERS];

const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

export const mockAuthApi = {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    await delay(800);
    const user = mockUserStore.find(
      (u) => u.phone === credentials.phone && u.password === credentials.password
    );
    if (!user) {
      throw new Error("Invalid phone or password.");
    }
    const { password: _pw, ...safeUser } = user;
    return {
      user: safeUser,
      token: `mock_token_${safeUser.id}_${Date.now()}`,
    };
  },

  async signup(data: SignupData): Promise<AuthResponse> {
    await delay(900);
    const exists = mockUserStore.find((u) => u.phone === data.phone);
    if (exists) {
      throw new Error("An account with this phone number already exists.");
    }
    const newUser: User & { password: string } = {
      id: `user_${Date.now()}`,
      name: data.name,
      phone: data.phone,
      email: data.email,
      password: data.password,
      role: data.role,
      createdAt: new Date().toISOString(),
    };
    mockUserStore.push(newUser);
    const { password: _pw, ...safeUser } = newUser;
    return {
      user: safeUser,
      token: `mock_token_${safeUser.id}_${Date.now()}`,
    };
  },

  async getMe(token: string): Promise<User> {
    await delay(300);
    const userId = token.split("_")[2];
    const user = mockUserStore.find((u) => u.id === userId);
    if (!user) throw new Error("Session expired. Please log in again.");
    const { password: _pw, ...safeUser } = user;
    return safeUser;
  },
};
