import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export function AdminRoute() {
  const { user, authed, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-gray-500 dark:text-gray-400">
        Loading…
      </div>
    );
  }
  if (!authed) return <Navigate to="/" replace />;
  if (user?.accountType !== "admin") return <Navigate to="/" replace />;
  return <Outlet />;
}
