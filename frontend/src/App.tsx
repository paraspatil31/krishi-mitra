import { RouterProvider } from "react-router";
import { AuthProvider } from "@/context/AuthContext";
import { router } from "./routes";
import { CartProvider } from "@/context/CartContext";

export default function App() {
  return (
    <AuthProvider>
      <CartProvider><RouterProvider router={router} /></CartProvider>
    </AuthProvider>
  );
}
