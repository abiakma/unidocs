import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router";
import type { RoleName } from "../api/types";
import { PageSkeleton } from "../components/Skeleton";
import { NotFoundPage } from "../pages/NotFoundPage";
import { useAuth } from "./AuthProvider";

// UI-level guard only. Every permission is enforced again by the API.
export function RequireRole({ roles, children }: { roles: RoleName[]; children: ReactNode }) {
  const { user, loading, hasRole } = useAuth();
  const location = useLocation();

  if (loading) return <PageSkeleton />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (!hasRole(...roles)) return <NotFoundPage />;
  return <>{children}</>;
}
