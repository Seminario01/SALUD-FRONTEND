import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "react-oidc-context";

export default function ProtectedRoute({ children }) {
  const auth = useAuth();
  const location = useLocation();

  if (auth.isLoading) return <p className="p-6">Cargando sesión...</p>;
  // Recuerda la página pedida para volver a ella después del Login Único
  if (!auth.isAuthenticated) {
    return <Navigate to="/login" replace state={{ desde: location.pathname + location.search }} />;
  }

  return children;
}
