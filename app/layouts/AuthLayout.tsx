import { Outlet, Navigate } from "react-router";
import { useAuth } from "../context/AuthContext";

export default function AuthLayout() {
    const { user, isLoading } = useAuth();

    if (isLoading) return <div>Loading user...</div>;

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    return <Outlet />;
}