let currentToken: string | null = null;
export function setApiToken(token: string | null) { currentToken = token; }
const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:5000/api";
interface RequestOptions extends RequestInit { token?: string; }
async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { token, headers: customHeaders, ...fetchOptions } = options;
  const headers = new Headers(customHeaders);
  if (fetchOptions.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  if (token ?? currentToken) headers.set("Authorization", `Bearer ${token ?? currentToken}`);
  const response = await fetch(`${API_BASE_URL}${endpoint}`, { ...fetchOptions, headers, credentials: "include" });
  const text = await response.text();
  const data = text ? JSON.parse(text) : {};
  if (!response.ok) throw new Error(data?.message ?? data?.error ?? `HTTP error ${response.status}`);
  return data as T;
}
export const api = {
  get: <T>(endpoint: string, token?: string) => request<T>(endpoint, { method: "GET", token }),
  post: <T>(endpoint: string, body: unknown = {}, token?: string) => request<T>(endpoint, { method: "POST", body: JSON.stringify(body), token }),
  put: <T>(endpoint: string, body: unknown, token?: string) => request<T>(endpoint, { method: "PUT", body: JSON.stringify(body), token }),
  patch: <T>(endpoint: string, body: unknown, token?: string) => request<T>(endpoint, { method: "PATCH", body: JSON.stringify(body), token }),
  delete: <T>(endpoint: string, bodyOrToken?: unknown, token?: string) => {
    if (typeof bodyOrToken === "string") {
      return request<T>(endpoint, { method: "DELETE", token: bodyOrToken });
    }
    const body = bodyOrToken !== undefined ? JSON.stringify((bodyOrToken as Record<string, unknown>)?.data ?? bodyOrToken) : undefined;
    return request<T>(endpoint, { method: "DELETE", body, token });
  },
};
