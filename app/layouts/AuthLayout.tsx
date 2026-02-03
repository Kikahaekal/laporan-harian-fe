import { Outlet, Navigate } from "react-router";
import { useAuth } from "../context/AuthContext";
import { CircularProgress } from "@mui/material";
import MenuAppBar from "../ui/AppBar";

export default function AuthLayout() {
  const { user, isLoading } = useAuth();

  if (isLoading)
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <CircularProgress />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <MenuAppBar />
      <div className="p-6">
        <Outlet />
      </div>
    </div>
  );
}
