import { createBrowserRouter } from "react-router";
import type { ReactElement } from "react";
import RootLayout from "@/components/layout/RootLayout";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import RoleRoute from "@/components/auth/RoleRoute";
import Home from "@/pages/Home";
import Login from "@/pages/Login";
import Signup from "@/pages/Signup";
import Products from "@/pages/Products";
import FarmerDashboard from "@/pages/farmer/Dashboard";
import FarmerListings from "@/pages/farmer/Listings";
import NewListing from "@/pages/farmer/NewListing";
import EditListing from "@/pages/farmer/EditListing";
import FarmerOrders from "@/pages/farmer/FarmerOrders";
import BuyerDashboard from "@/pages/buyer/Dashboard";
import AdminDashboard from "@/pages/admin/Dashboard";
import NotFound from "@/pages/NotFound";
import ProductDetails from "@/pages/ProductDetails";
import Cart from "@/pages/Cart";
import Checkout from "@/pages/Checkout";
import BuyerOrders from "@/pages/buyer/Orders";
import BuyerOrderDetails from "@/pages/buyer/OrderDetails";
import Weather from "@/pages/farmer/Weather";
import MandiPrices from "@/pages/MandiPrices";
import AdminUsers from "@/pages/admin/Users";
import AdminListings from "@/pages/admin/Listings";
import AdminOrders from "@/pages/admin/Orders";
import BuyerOffers from "@/pages/buyer/Offers";
import FarmerOffers from "@/pages/farmer/FarmerOffers";
import StorageDirectory from "@/pages/storage/StorageDirectory";
import MarketFinder from "@/pages/markets/MarketFinder";
import BusinessDashboard from "@/pages/business/BusinessDashboard";
import FarmerBulkDemands from "@/pages/farmer/FarmerBulkDemands";
import Settings from "@/pages/settings/Settings";
import FPODashboard from "@/pages/fpo/FPODashboard";
import FPOMembers from "@/pages/fpo/FPOMembers";
import FPOLots from "@/pages/fpo/FPOLots";
import FPOOffers from "@/pages/fpo/FPOOffers";
import FPOOrders from "@/pages/fpo/FPOOrders";
import ProvenanceVerification from "@/pages/provenance/ProvenanceVerification";
import CropDoctor from "@/pages/farmer/CropDoctor";

const ComingSoon = ({ title }: { title: string }) => (
  <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3 text-center px-4">
    <div className="rounded-full bg-[var(--secondary)] p-5">
      <span className="text-4xl">🚧</span>
    </div>
    <h1
      className="text-xl font-semibold text-[var(--foreground)]"
      style={{ fontFamily: "var(--font-heading)" }}
    >
      {title}
    </h1>
    <p className="text-sm text-[var(--muted-foreground)] max-w-xs">
      This page is part of a future phase and will be available soon.
    </p>
  </div>
);

function farmerGuard(element: ReactElement) {
  return (
    <ProtectedRoute>
      <RoleRoute roles={["farmer"]}>{element}</RoleRoute>
    </ProtectedRoute>
  );
}

function buyerGuard(element: ReactElement) {
  return (
    <ProtectedRoute>
      <RoleRoute roles={["buyer"]}>{element}</RoleRoute>
    </ProtectedRoute>
  );
}

function businessBuyerGuard(element: ReactElement) {
  return (
    <ProtectedRoute>
      <RoleRoute roles={["buyer"]} allowedBuyerTypes={["business"]}>
        {element}
      </RoleRoute>
    </ProtectedRoute>
  );
}

function fpoGuard(element: ReactElement) {
  return (
    <ProtectedRoute>
      <RoleRoute roles={["fpo"]}>{element}</RoleRoute>
    </ProtectedRoute>
  );
}

function wholesaleGuard(element: ReactElement) {
  return (
    <ProtectedRoute>
      <RoleRoute roles={["farmer", "admin", "buyer", "fpo"]} allowedBuyerTypes={["business"]}>
        {element}
      </RoleRoute>
    </ProtectedRoute>
  );
}

function adminGuard(element: ReactElement) {
  return (
    <ProtectedRoute>
      <RoleRoute roles={["admin"]}>{element}</RoleRoute>
    </ProtectedRoute>
  );
}

export const router = createBrowserRouter([
  {
    path: "/",
    Component: RootLayout,
    children: [
      { index: true, Component: Home },
      { path: "products", Component: Products },
      { path: "products/:id", Component: ProductDetails },
      { path: "verify/:listingId", Component: ProvenanceVerification },
      { path: "login", Component: Login },
      { path: "signup", Component: Signup },

      // ── Wholesale Intelligence & Logistics (Farmer + Business Buyers) ──
      { path: "mandi-prices", element: wholesaleGuard(<MandiPrices />) },
      { path: "storage-facilities", element: wholesaleGuard(<StorageDirectory />) },
      { path: "markets", element: wholesaleGuard(<MarketFinder />) },
      { path: "markets/nearby", element: wholesaleGuard(<MarketFinder />) },

      // ── Farmer ──────────────────────────────────────────────────────────
      { path: "farmer/dashboard", element: farmerGuard(<FarmerDashboard />) },
      { path: "farmer/listings", element: farmerGuard(<FarmerListings />) },
      { path: "farmer/listings/new", element: farmerGuard(<NewListing />) },
      { path: "farmer/listings/:id/edit", element: farmerGuard(<EditListing />) },
      { path: "farmer/orders", element: farmerGuard(<FarmerOrders />) },
      { path: "farmer/offers", element: farmerGuard(<FarmerOffers />) },
      { path: "farmer/weather", element: farmerGuard(<Weather />) },
      { path: "farmer/bulk-demands", element: farmerGuard(<FarmerBulkDemands />) },
      { path: "farmer/crop-doctor", element: farmerGuard(<CropDoctor />) },
      {
        path: "crop-doctor",
        element: (
          <ProtectedRoute>
            <CropDoctor />
          </ProtectedRoute>
        ),
      },

      // ── FPO (Farmer Producer Organization) ──────────────────────────────
      { path: "fpo/dashboard", element: fpoGuard(<FPODashboard />) },
      { path: "fpo/members", element: fpoGuard(<FPOMembers />) },
      { path: "fpo/lots", element: fpoGuard(<FPOLots />) },
      { path: "fpo/offers", element: fpoGuard(<FPOOffers />) },
      { path: "fpo/orders", element: fpoGuard(<FPOOrders />) },

      // ── Buyer ────────────────────────────────────────────────────────────
      { path: "buyer/dashboard", element: buyerGuard(<BuyerDashboard />) },
      { path: "buyer/orders", element: buyerGuard(<BuyerOrders />) },
      { path: "buyer/orders/:id", element: buyerGuard(<BuyerOrderDetails />) },
      { path: "buyer/offers", element: buyerGuard(<BuyerOffers />) },
      { path: "cart", element: buyerGuard(<Cart />) },
      { path: "checkout", element: buyerGuard(<Checkout />) },

      // ── Business / Bulk Buyer ────────────────────────────────────────────
      { path: "business/dashboard", element: businessBuyerGuard(<BusinessDashboard />) },

      // ── Admin ─────────────────────────────────────────────────────────────
      { path: "admin/dashboard", element: adminGuard(<AdminDashboard />) },
      { path: "admin/users", element: adminGuard(<AdminUsers />) },
      { path: "admin/listings", element: adminGuard(<AdminListings />) },
      { path: "admin/orders", element: adminGuard(<AdminOrders />) },

      // ── Settings (All Authenticated Roles) ──────────────────────────────
      {
        path: "settings",
        element: (
          <ProtectedRoute>
            <Settings />
          </ProtectedRoute>
        ),
      },

      { path: "*", Component: NotFound },
    ],
  },
]);
