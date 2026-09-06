import { useEffect, useState } from "react";
import { expedientesMock } from "../mocks/expedientes";

export default function Expedientes() {
  const [registros, setRegistros] = useState([]);

  useEffect(() => {
    setRegistros(expedientesMock);
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-4">Expediente clínico</h1>
      <div className="space-y-3">
        {registros.map((e) => (
          <div key={e.id} className="bg-white border rounded-lg p-4 shadow-sm">
            <p className="text-sm text-gray-400">{e.fecha_atencion}</p>
            <p className="font-bold text-gray-700">{e.diagnostico}</p>
            <p className="text-sm text-gray-600">Tratamiento: {e.tratamiento}</p>
            {e.notas && <p className="text-sm text-gray-500 italic">Notas: {e.notas}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}