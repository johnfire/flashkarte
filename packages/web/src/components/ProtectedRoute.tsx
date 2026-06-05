import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { VerifyBanner } from "./VerifyBanner";

export function ProtectedRoute() {
  const { authed, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-gray-500">
        Loading…
      </div>
    );
  }
  if (!authed) return <Navigate to="/login" replace />;
  return (
    <>
      <VerifyBanner />
      <Outlet />
    </>
  );
}
