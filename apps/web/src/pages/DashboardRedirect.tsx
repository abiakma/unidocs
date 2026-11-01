import { Navigate } from "react-router";
import { homePathFor, useAuth } from "../auth/AuthProvider";
import { PageSkeleton } from "../components/Skeleton";

// The API redirects here after login; send each user to their own dashboard.
export function DashboardRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <PageSkeleton />;
  return <Navigate to={user ? homePathFor(user.roles) : "/login"} replace />;
}
