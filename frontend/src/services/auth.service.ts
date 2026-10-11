import type { AuthResponse, LoginCredentials, SignupData, User } from "@/types/auth";
import { api } from "@/services/api";
type Wrapped<T> = { data: T };
export const authService = {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const r = await api.post<Wrapped<{ accessToken: string; user: User }>>("/auth/login", credentials);
    return { token: r.data.accessToken, user: r.data.user };
  },
  async signup(data: SignupData): Promise<AuthResponse> {
    const r = await api.post<Wrapped<{ accessToken: string; user: User }>>("/auth/signup", data);
    return { token: r.data.accessToken, user: r.data.user };
  },
  async refresh(): Promise<string> {
    const r = await api.post<Wrapped<{ accessToken: string }>>("/auth/refresh", {});
    return r.data.accessToken;
  },
  async getMe(token: string): Promise<User> {
    const r = await api.get<Wrapped<User>>("/auth/me", token);
    return r.data;
  },
  async updateProfile(data: Partial<User>): Promise<User> {
    const r = await api.patch<Wrapped<User>>("/auth/profile", data);
    return r.data;
  },
  async updateSettings(data: {
    settings?: import("@/types/auth").UserSettings;
    savedAddresses?: import("@/types/auth").SavedAddress[];
    buyerType?: import("@/types/auth").BuyerType;
  }): Promise<User> {
    const r = await api.patch<Wrapped<User>>("/auth/settings", data);
    return r.data;
  },
  async changePassword(currentPassword: string, newPassword: string): Promise<{ message: string }> {
    const r = await api.post<{ message: string }>("/auth/change-password", { currentPassword, newPassword });
    return r;
  },
  async deleteAccount(password: string): Promise<{ message: string }> {
    const r = await api.delete<{ message: string }>("/auth/account", { data: { password } });
    return r;
  },
  async reportIssue(data: { issueType?: string; description?: string; category?: string; subject?: string; message?: string }): Promise<{ message: string }> {
    const r = await api.post<{ message: string }>("/auth/support/report", data);
    return r;
  },
  async logout(): Promise<void> { await api.post("/auth/logout", {}); },
};
