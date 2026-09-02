import { useEffect, useState } from "react";
import { recursosMock } from "../mocks/recursos";

export default function Recursos() {
  const [recursos, setRecursos] = useState([]);

  useEffect(() => {
    setRecursos(recursosMock);
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-4">Recursos hospitalarios</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {recursos.map((r) => (
          <div key={r.id} className="bg-white border rounded-lg p-4 shadow-sm">
            <h2 className="font-bold text-gray-700 capitalize">{r.tipo}</h2>
            <p className="text-sm text-gray-500 mb-2">{r.descripcion}</p>
            <p className="text-2xl font-bold text-blue-700">
              {r.disponible} <span className="text-sm text-gray-400 font-normal">/ {r.total} disponibles</span>
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}