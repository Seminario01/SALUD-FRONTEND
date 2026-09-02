import { Link, Outlet } from "react-router-dom";

export default function Layout() {
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-blue-700 text-white px-6 py-3 flex gap-6">
        <span className="font-bold">Módulo Salud</span>
        <Link to="/" className="hover:underline">Dashboard</Link>
        <Link to="/pacientes" className="hover:underline">Pacientes</Link>
        <Link to="/citas" className="hover:underline">Citas</Link>
      </nav>
      <Outlet />
    </div>
  );
}