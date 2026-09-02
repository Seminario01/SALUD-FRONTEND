import { Link, Outlet } from "react-router-dom";

export default function Layout() {
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-blue-700 text-white px-6 py-3 flex gap-6 flex-wrap">
          <span className="font-bold">Módulo Salud</span>
          <Link to="/" className="hover:underline">Dashboard</Link>
          <Link to="/pacientes" className="hover:underline">Pacientes</Link>
          <Link to="/citas" className="hover:underline">Citas</Link>
          <Link to="/turnos" className="hover:underline">Turnos</Link>
          <Link to="/recursos" className="hover:underline">Recursos</Link>
          <Link to="/vacunacion" className="hover:underline">Vacunación</Link>
          <Link to="/expedientes" className="hover:underline">Expedientes</Link>
        </nav>
      <Outlet />
    </div>
  );
}