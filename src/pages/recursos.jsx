import { useEffect, useState } from "react";
import { clientExterno } from "../api/client";

export default function Recursos() {
  const [recursos, setRecursos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    clientExterno.get("/recursos/disponibilidad")
      .then((res) => setRecursos(res.data.data))
      .catch((err) => setError(err.message))
      .finally(() => setCargando(false));
  }, []);

  if (cargando) return <p className="p-6">Cargando...</p>;
  if (error) return <p className="p-6 text-red-600">Error: {error}</p>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-4">Recursos hospitalarios</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {recursos.map((r, i) => (
          <div key={i} className="bg-white border rounded-lg p-4 shadow-sm">
            <h2 className="font-bold text-gray-700 capitalize">{r.tipo}</h2>
            <p className="text-2xl font-bold text-blue-700">
              {r.disponible} <span className="text-sm text-gray-400 font-normal">/ {r.total} disponibles</span>
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}