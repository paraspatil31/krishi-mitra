import { Navigate } from "react-router";
import { useAuth } from "@/context/AuthContext";
import Spinner from "@/components/common/Spinner";
import type { ReactNode } from "react";
import type { UserRole, BuyerType } from "@/types/auth";

interface RoleRouteProps {
  roles: UserRole[];
  allowedBuyerTypes?: BuyerType[];
  children: ReactNode;
}

export default function RoleRoute({ roles, allowedBuyerTypes, children }: RoleRouteProps) {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!user || !roles.includes(user.role)) {
    const destination =
      user?.role === "buyer"
        ? user?.buyerType === "business"
          ? "/business/dashboard"
          : "/buyer/dashboard"
        : user?.role === "farmer"
        ? "/farmer/dashboard"
        : user?.role === "fpo"
        ? "/fpo/dashboard"
        : "/";
    return <Navigate to={destination} replace />;
  }

  // If user is a buyer, enforce allowedBuyerTypes if specified
  if (user.role === "buyer" && allowedBuyerTypes && allowedBuyerTypes.length > 0) {
    const currentBuyerType = user.buyerType || "household";
    if (!allowedBuyerTypes.includes(currentBuyerType)) {
      const destination =
        currentBuyerType === "business" ? "/business/dashboard" : "/products";
      return <Navigate to={destination} replace />;
    }
  }

  return <>{children}</>;
}
