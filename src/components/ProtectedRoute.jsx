import { Navigate } from "react-router-dom";
import { useAuth } from "react-oidc-context";

export default function ProtectedRoute({ children }) {
  const auth = useAuth();

  if (auth.isLoading) return <p className="p-6">Cargando sesión...</p>;
  if (!auth.isAuthenticated) return <Navigate to="/login" replace />;

  return children;
}
