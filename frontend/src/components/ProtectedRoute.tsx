import { ReactElement } from "react";
import { Navigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import { UserRole } from "../types/api";

interface ProtectedRouteProps {
  role: UserRole;
  children: ReactElement;
}

export function ProtectedRoute({ role, children }: ProtectedRouteProps) {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to={`/${role === "caregiver" ? "caregiver" : "care-seeker"}/login`} replace />;
  }

  if (user.role !== role) {
    return <Navigate to="/" replace />;
  }

  return children;
}
