import { createContext, useContext, useEffect, useReducer, type ReactNode } from "react";
import type { User, LoginCredentials, SignupData } from "@/types/auth";
import { authService } from "@/services/auth.service";
import { setApiToken } from "@/services/api";
import { detectAndSyncLocation } from "@/utils/locationHelper";
import i18n from "@/i18n";

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

type AuthAction =
  | { type: "AUTH_INIT_START" }
  | { type: "AUTH_SUCCESS"; payload: { user: User; token: string } }
  | { type: "AUTH_FAILURE" }
  | { type: "UPDATE_AVATAR"; payload: string }
  | { type: "UPDATE_USER"; payload: User }
  | { type: "LOGOUT" };

function reducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case "AUTH_INIT_START":
      return { ...state, isLoading: true };
    case "AUTH_SUCCESS": {
      const savedAvatar = localStorage.getItem(`user_avatar_${action.payload.user.id}`);
      const user = savedAvatar
        ? { ...action.payload.user, avatar: savedAvatar }
        : action.payload.user;
      return {
        user,
        token: action.payload.token,
        isAuthenticated: true,
        isLoading: false,
      };
    }
    case "UPDATE_AVATAR":
      if (!state.user) return state;
      return {
        ...state,
        user: { ...state.user, avatar: action.payload },
      };
    case "UPDATE_USER":
      return {
        ...state,
        user: action.payload,
      };
    case "AUTH_FAILURE":
    case "LOGOUT":
      return { user: null, token: null, isAuthenticated: false, isLoading: false };
    default:
      return state;
  }
}

interface Value extends AuthState {
  login: (c: LoginCredentials) => Promise<void>;
  signup: (d: SignupData) => Promise<void>;
  logout: () => Promise<void>;
  updateAvatar: (avatarUrl: string) => void;
  refreshUser: () => Promise<void>;
  setSession: (user: User, token: string) => void;
  updateProfile: (data: Partial<User>) => Promise<User>;
  updateSettings: (data: {
    settings?: Partial<import("@/types/auth").UserSettings>;
    savedAddresses?: import("@/types/auth").SavedAddress[];
    buyerType?: import("@/types/auth").BuyerType;
  }) => Promise<User>;
  updateBuyerType: (buyerType: import("@/types/auth").BuyerType) => Promise<User>;
  updateBusinessProfile: (profile: import("@/types/auth").BusinessProfile) => Promise<User>;
}

const C = createContext<Value | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, {
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: true,
  });

  function syncUserLanguage(currentUser: User) {
    const lang = currentUser.preferredLanguage || currentUser.settings?.language;
    if (lang && ["en", "hi", "mr"].includes(lang) && i18n.language !== lang) {
      i18n.changeLanguage(lang);
    }
  }

  async function updateProfile(data: Partial<User>): Promise<User> {
    const updated = await authService.updateProfile(data);
    dispatch({ type: "UPDATE_USER", payload: updated });
    syncUserLanguage(updated);
    return updated;
  }

  async function updateSettings(data: {
    settings?: Partial<import("@/types/auth").UserSettings>;
    savedAddresses?: import("@/types/auth").SavedAddress[];
    buyerType?: import("@/types/auth").BuyerType;
  }): Promise<User> {
    const updated = await authService.updateSettings(data);
    dispatch({ type: "UPDATE_USER", payload: updated });
    syncUserLanguage(updated);
    return updated;
  }

  function autoSyncLocation(currentUser: User) {
    detectAndSyncLocation(currentUser, updateProfile)
      .then((detected) => {
        if (detected?.district && currentUser.district !== detected.district) {
          dispatch({
            type: "UPDATE_USER",
            payload: {
              ...currentUser,
              district: detected.district,
              location: { type: "Point", coordinates: [detected.lng, detected.lat] },
            },
          });
        }
      })
      .catch((err) => console.warn("Auto location sync notice:", err));
  }

  useEffect(() => {
    (async () => {
      try {
        dispatch({ type: "AUTH_INIT_START" });
        const token = await authService.refresh();
        const user = await authService.getMe(token);
        setApiToken(token);
        dispatch({ type: "AUTH_SUCCESS", payload: { token, user } });
        syncUserLanguage(user);

        // Auto-fetch location if missing from account
        if (!user.district || !user.location) {
          autoSyncLocation(user);
        }
      } catch {
        setApiToken(null);
        dispatch({ type: "AUTH_FAILURE" });
      }
    })();
  }, []);

  async function login(c: LoginCredentials) {
    dispatch({ type: "AUTH_INIT_START" });
    try {
      const r = await authService.login(c);
      setApiToken(r.token);
      dispatch({ type: "AUTH_SUCCESS", payload: { user: r.user, token: r.token } });
      syncUserLanguage(r.user);
      // Proactively detect location immediately upon login
      autoSyncLocation(r.user);
    } catch (e) {
      dispatch({ type: "AUTH_FAILURE" });
      throw e;
    }
  }

  async function signup(d: SignupData) {
    dispatch({ type: "AUTH_INIT_START" });
    try {
      const r = await authService.signup(d);
      setApiToken(r.token);
      dispatch({ type: "AUTH_SUCCESS", payload: { user: r.user, token: r.token } });
      syncUserLanguage(r.user);
      autoSyncLocation(r.user);
    } catch (e) {
      dispatch({ type: "AUTH_FAILURE" });
      throw e;
    }
  }

  async function logout() {
    try {
      await authService.logout();
    } finally {
      setApiToken(null);
      dispatch({ type: "LOGOUT" });
    }
  }

  async function refreshUser() {
    try {
      const token = await authService.refresh();
      const user = await authService.getMe(token);
      setApiToken(token);
      dispatch({ type: "AUTH_SUCCESS", payload: { token, user } });
    } catch {
      setApiToken(null);
      dispatch({ type: "AUTH_FAILURE" });
    }
  }

  function setSession(user: User, token: string) {
    setApiToken(token);
    dispatch({ type: "AUTH_SUCCESS", payload: { token, user } });
    autoSyncLocation(user);
  }

  function updateAvatar(avatarUrl: string) {
    if (state.user) {
      localStorage.setItem(`user_avatar_${state.user.id}`, avatarUrl);
      dispatch({ type: "UPDATE_AVATAR", payload: avatarUrl });
    }
  }

  async function updateBuyerType(buyerType: import("@/types/auth").BuyerType): Promise<User> {
    return updateProfile({ buyerType });
  }

  async function updateBusinessProfile(businessProfile: import("@/types/auth").BusinessProfile): Promise<User> {
    return updateProfile({ businessProfile });
  }

  return (
    <C.Provider
      value={{
        ...state,
        login,
        signup,
        logout,
        updateAvatar,
        refreshUser,
        setSession,
        updateProfile,
        updateSettings,
        updateBuyerType,
        updateBusinessProfile,
      }}
    >
      {children}
    </C.Provider>
  );
}

export function useAuth() {
  const v = useContext(C);
  if (!v) throw new Error("useAuth must be used inside AuthProvider");
  return v;
}
