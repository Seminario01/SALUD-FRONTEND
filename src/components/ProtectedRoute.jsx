import { Navigate, useLocation } from "react-router-dom";
import { useSyncExternalStore } from "react";
import { useAuth } from "react-oidc-context";
import { cargarPuestos, leerPuestos, suscribirPuestos } from "../utils/puestosAsignados";

export default function ProtectedRoute({ children }) {
  const auth = useAuth();
  const location = useLocation();
  const puestos = useSyncExternalStore(suscribirPuestos, leerPuestos);
  const sub = auth.user?.profile?.sub;

  if (auth.isLoading) return <p className="p-6">Cargando sesión...</p>;
  // Recuerda la página pedida para volver a ella después del Login Único
  if (!auth.isAuthenticated) {
    return <Navigate to="/login" replace state={{ desde: location.pathname + location.search }} />;
  }

  // Antes de mostrar el menú, los puestos que Administración le dio en Salud (si tiene)
  if (!(puestos.cargado && puestos.sub === sub)) {
    cargarPuestos(sub);
    return <p className="p-6">Cargando sesión...</p>;
  }

  return children;
}
