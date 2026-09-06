import { useState } from "react";
import client from "../api/client";

export default function Expedientes() {
  // El backend expone GET /expedientes/<paciente_id>, o sea el expediente
  // de UN paciente a la vez (no existe un listado general, y tiene sentido:
  // un expediente clínico es información sensible, ligada siempre a un paciente).
  const [pacienteId, setPacienteId] = useState("");
  const [registros, setRegistros] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);

  function buscarExpediente(e) {
    e.preventDefault();
    if (!pacienteId) return;

    setCargando(true);
    setError(null);
    setRegistros(null);

    client
      .get(`/expedientes/${pacienteId}`)
      .then((res) => setRegistros(res.data.data))
      .catch((err) => setError(err.response?.data?.message || err.message))
      .finally(() => setCargando(false));
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-4">Expediente clínico</h1>

      <form onSubmit={buscarExpediente} className="flex gap-2 items-center mb-6">
        <input
          type="number"
          value={pacienteId}
          onChange={(e) => setPacienteId(e.target.value)}
          placeholder="ID del paciente"
          className="border rounded px-3 py-1 w-40"
        />
        <button
          type="submit"
          className="bg-blue-700 text-white px-4 py-1 rounded hover:bg-blue-800"
        >
          Ver expediente
        </button>
      </form>

      {cargando && <p className="text-gray-500 text-sm">Cargando...</p>}

      {error && (
        <p className="text-red-600 text-sm">{error}</p>
      )}

      {registros && registros.length === 0 && (
        <p className="text-gray-500 text-sm">Este paciente no tiene registros en su expediente.</p>
      )}

      {registros && registros.length > 0 && (
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
      )}
    </div>
  );
}