import { Link, Outlet } from "react-router-dom";
import { useAuth } from "react-oidc-context";
import { rolesDe } from "../auth";

export default function Layout() {
  const auth = useAuth();
  const perfil = auth.user?.profile;
  const rolesSalud = rolesDe(auth.user).filter((r) => r.startsWith("salud:") || r === "ciudadano");

  function manejarLogout() {
    // Cierra la sesión también en el Login Único (no solo en esta app).
    auth.signoutRedirect({ id_token_hint: auth.user?.id_token });
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-blue-700 text-white px-6 py-3 flex gap-6 flex-wrap items-center">
          <span className="font-bold">Módulo Salud</span>
          <Link to="/" className="hover:underline">Dashboard</Link>
          <Link to="/pacientes" className="hover:underline">Pacientes</Link>
          <Link to="/citas" className="hover:underline">Citas</Link>
          <Link to="/turnos" className="hover:underline">Turnos</Link>
          <Link to="/recursos" className="hover:underline">Recursos</Link>
          <Link to="/vacunacion" className="hover:underline">Vacunación</Link>
          <Link to="/expedientes" className="hover:underline">Expedientes</Link>
          <span className="ml-auto text-sm text-blue-100">
            {perfil?.name || perfil?.preferred_username}
            {rolesSalud.length > 0 && <span className="opacity-75"> · {rolesSalud.join(", ")}</span>}
          </span>
          <button onClick={manejarLogout} className="hover:underline text-sm">
            Cerrar sesión
          </button>
        </nav>
      <Outlet />
    </div>
  );
}
