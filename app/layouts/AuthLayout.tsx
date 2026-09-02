import { Outlet, Navigate } from "react-router";
import { useAuth } from "../context/AuthContext";
import { Loader2 } from "lucide-react";
import MenuAppBar from "../ui/AppBar";

export default function AuthLayout() {
  const { user, isLoading } = useAuth();

  if (isLoading)
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center flex flex-col items-center">
          <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mb-3" />
          <p className="text-gray-600 font-medium">Menghubungkan ke Server...</p>
        </div>
      </div>
    );

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <MenuAppBar />
      <div className="p-3 sm:p-6">
        <Outlet />
      </div>
    </div>
  );
}
