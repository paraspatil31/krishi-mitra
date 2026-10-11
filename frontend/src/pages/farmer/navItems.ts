export interface NavSectionItem {
  label: string;
  href?: string;
  icon: string;
  action?: "profile" | "settings";
}

export interface NavSection {
  title?: string;
  items: NavSectionItem[];
}

export const FARMER_NAV_SECTIONS: NavSection[] = [
  {
    items: [
      { label: "Dashboard", href: "/farmer/dashboard", icon: "🏠" },
    ],
  },
  {
    title: "SELL & MANAGE",
    items: [
      { label: "My Listings", href: "/farmer/listings", icon: "📦" },
      { label: "Orders & Dispatch", href: "/farmer/orders", icon: "📋" },
      { label: "Price Offers", href: "/farmer/offers", icon: "💰" },
      { label: "Buyer Requirements", href: "/farmer/bulk-demands", icon: "🏢" },
    ],
  },
  {
    title: "MARKET INSIGHTS",
    items: [
      { label: "Mandi Prices", href: "/mandi-prices", icon: "📈" },
      { label: "Nearby Markets", href: "/markets/nearby", icon: "📍" },
      { label: "Cold Storage", href: "/storage-facilities", icon: "❄️" },
      { label: "Weather Advisory", href: "/farmer/weather", icon: "🌦️" },
      { label: "Crop Doctor", href: "/crop-doctor", icon: "🌿" },
    ],
  },
  {
    title: "ACCOUNT",
    items: [
      { label: "Profile", icon: "👤", action: "profile" },
      { label: "Settings", href: "/settings", icon: "⚙️" },
    ],
  },
];

// Flat export for backward compatibility
export const FARMER_NAV = FARMER_NAV_SECTIONS.flatMap((s) =>
  s.items.filter((item): item is NavSectionItem & { href: string } => Boolean(item.href))
);
