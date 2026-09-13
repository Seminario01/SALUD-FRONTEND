import { Link, Outlet, useNavigate } from "react-router-dom";
import { cerrarSesion } from "../auth";

export default function Layout() {
  const navigate = useNavigate();

  function manejarLogout() {
    cerrarSesion();
    navigate("/login");
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
          <button onClick={manejarLogout} className="ml-auto hover:underline text-sm">
            Cerrar sesión
          </button>
        </nav>
      <Outlet />
    </div>
  );
}