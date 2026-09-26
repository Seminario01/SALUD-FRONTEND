import { Link } from "react-router-dom";

export default function NoEncontrado() {
  return (
    <div className="p-6 text-center py-20">
      <p className="text-6xl font-bold text-blue-700">404</p>
      <h1 className="text-xl font-bold mt-2">Página no encontrada</h1>
      <p className="text-slate-500 mt-1">La dirección no existe o ya no está disponible.</p>
      <Link to="/" className="inline-block mt-6 bg-blue-700 text-white px-4 py-2 rounded-lg hover:bg-blue-800">
        Volver al inicio
      </Link>
    </div>
  );
}
