import { useEffect, useState } from "react";
import client from "../api/client";

export default function Vacunacion() {
  const [registros, setRegistros] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    client
      .get("/vacunacion")
      .then((res) => setRegistros(res.data.data))
      .catch((err) => setError(err.response?.data?.message || err.message))
      .finally(() => setCargando(false));
  }, []);

  if (cargando) return <p className="p-6">Cargando...</p>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-4">Vacunación</h1>

      {error && (
        <p className="mb-4 text-red-600 text-sm">
          No se pudieron cargar los registros de vacunación: {error}
        </p>
      )}

      {!error && registros.length === 0 && (
        <p className="text-gray-500 text-sm">No hay registros de vacunación.</p>
      )}

      {!error && registros.length > 0 && (
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b bg-gray-100">
              <th className="p-2">Paciente ID</th>
              <th className="p-2">Estudiante</th>
              <th className="p-2">Esquema completo</th>
              <th className="p-2">Pendientes</th>
            </tr>
          </thead>
          <tbody>
            {registros.map((v) => (
              <tr key={v.id} className="border-b hover:bg-gray-50">
                <td className="p-2">{v.paciente_id}</td>
                <td className="p-2">{v.es_estudiante ? "Sí" : "No"}</td>
                <td className="p-2">{v.esquema_completo ? "Sí" : "No"}</td>
                <td className="p-2">{v.vacunas_pendientes ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}