import {
  createContext,
  useContext,
  useEffect,
  useState,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import type { Product } from "@/types/product";
import { useAuth } from "@/context/AuthContext";

export type CartItem = Pick<
  Product,
  "id" | "name" | "price" | "unit" | "farmerId" | "farmerName" | "images"
> & { quantity: number; maxQuantity?: number };

type CartContextType = {
  items: CartItem[];
  add: (p: Product, q?: number) => void;
  remove: (id: string) => void;
  update: (id: string, q: number) => void;
  increment: (id: string) => void;
  decrement: (id: string) => void;
  clear: () => void;
  clearFarmer: (farmerId: string) => void;
  total: number;
  count: number;
  farmerIds: string[];
  hasMultipleFarmers: boolean;
};

const Cart = createContext<CartContextType | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const { user, isLoading: authLoading } = useAuth();

  // Storage key is scoped to the specific logged-in user's unique ID, or "guest"
  const cartKey = useMemo(() => {
    return user?.id ? `fm_cart_user_${user.id}` : "fm_cart_guest";
  }, [user?.id]);

  // Track the active cart key currently loaded into React state
  const activeKeyRef = useRef<string>("");

  // Initialize from localStorage if key matches
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const initialKey = user?.id ? `fm_cart_user_${user.id}` : "fm_cart_guest";
      const raw = localStorage.getItem(initialKey);
      if (raw) return JSON.parse(raw);

      // Handle one-time migration of old global fm_cart
      const legacy = localStorage.getItem("fm_cart");
      if (legacy) {
        const parsed = JSON.parse(legacy);
        localStorage.setItem(initialKey, legacy);
        localStorage.removeItem("fm_cart");
        return parsed;
      }
      return [];
    } catch {
      return [];
    }
  });

  // When user changes (logging in, logging out, switching accounts), load that specific user's cart
  useEffect(() => {
    if (authLoading) return;

    let targetItems: CartItem[] = [];
    const saved = localStorage.getItem(cartKey);

    if (saved !== null) {
      try {
        targetItems = JSON.parse(saved);
      } catch {
        targetItems = [];
      }
    } else if (user?.id) {
      // If this user has no saved cart yet, but guest added items before logging in,
      // migrate the guest cart into this user's new cart
      const guestRaw = localStorage.getItem("fm_cart_guest");
      if (guestRaw && guestRaw !== "[]") {
        try {
          targetItems = JSON.parse(guestRaw);
          localStorage.setItem(cartKey, guestRaw);
          localStorage.removeItem("fm_cart_guest");
        } catch {
          targetItems = [];
        }
      }
    } else {
      // Check legacy cart for guest
      const legacy = localStorage.getItem("fm_cart");
      if (legacy) {
        try {
          targetItems = JSON.parse(legacy);
          localStorage.setItem(cartKey, legacy);
          localStorage.removeItem("fm_cart");
        } catch {
          targetItems = [];
        }
      }
    }

    setItems(targetItems);
    activeKeyRef.current = cartKey;
  }, [cartKey, authLoading, user?.id]);

  // Persist items whenever items or cartKey changes, ONLY if the active state matches cartKey
  useEffect(() => {
    if (authLoading) return;
    // Guard against race condition: never write previous user's items to new user's storage key
    if (activeKeyRef.current === cartKey) {
      localStorage.setItem(cartKey, JSON.stringify(items));
    }
  }, [items, cartKey, authLoading]);

  // Listen to multi-tab storage events for the active cartKey
  useEffect(() => {
    function handleStorage(e: StorageEvent) {
      if (e.key === cartKey && e.newValue !== null) {
        try {
          setItems(JSON.parse(e.newValue));
        } catch {
          // ignore corrupted data
        }
      }
    }
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [cartKey]);

  function add(p: Product, q = 1) {
    const pid = p.id || (p as any)._id;
    if (!pid) return;

    setItems((prev) => {
      const existing = prev.find((i) => i.id === pid);
      if (existing) {
        return prev.map((i) =>
          i.id === pid
            ? { ...i, quantity: Math.min(i.quantity + q, p.quantity) }
            : i
        );
      }
      return [
        ...prev,
        {
          id: pid,
          name: p.name,
          price: p.price,
          unit: p.unit,
          farmerId: p.farmerId,
          farmerName: p.farmerName,
          images: p.images || [],
          quantity: Math.min(q, p.quantity),
          maxQuantity: p.quantity,
        },
      ];
    });
  }

  function remove(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  function update(id: string, q: number) {
    if (q <= 0) return remove(id);
    setItems((prev) =>
      prev.map((i) =>
        i.id === id
          ? {
              ...i,
              quantity: i.maxQuantity ? Math.min(q, i.maxQuantity) : q,
            }
          : i
      )
    );
  }

  function increment(id: string) {
    setItems((prev) =>
      prev.map((i) => {
        if (i.id !== id) return i;
        const nextQty = i.quantity + 1;
        return {
          ...i,
          quantity: i.maxQuantity ? Math.min(nextQty, i.maxQuantity) : nextQty,
        };
      })
    );
  }

  function decrement(id: string) {
    setItems((prev) =>
      prev
        .map((i) => (i.id === id ? { ...i, quantity: i.quantity - 1 } : i))
        .filter((i) => i.quantity > 0)
    );
  }

  function clear() {
    setItems([]);
  }

  function clearFarmer(farmerId: string) {
    setItems((prev) => prev.filter((i) => i.farmerId !== farmerId));
  }

  const farmerIds = useMemo(() => {
    return Array.from(new Set(items.map((i) => i.farmerId).filter(Boolean)));
  }, [items]);

  const hasMultipleFarmers = farmerIds.length > 1;

  const total = useMemo(() => {
    return items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  }, [items]);

  const count = useMemo(() => {
    return items.reduce((sum, i) => sum + i.quantity, 0);
  }, [items]);

  return (
    <Cart.Provider
      value={{
        items,
        add,
        remove,
        update,
        increment,
        decrement,
        clear,
        clearFarmer,
        total,
        count,
        farmerIds,
        hasMultipleFarmers,
      }}
    >
      {children}
    </Cart.Provider>
  );
}

export function useCart() {
  const c = useContext(Cart);
  if (!c) throw new Error("useCart must be used inside CartProvider");
  return c;
}
