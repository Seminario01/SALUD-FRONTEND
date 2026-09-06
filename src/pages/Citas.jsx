import { useEffect, useState } from "react";
import client from "../api/client";

const colores = {
  pendiente: "bg-yellow-100 text-yellow-800",
  confirmada: "bg-green-100 text-green-800",
  atendida: "bg-blue-100 text-blue-800",
  cancelada: "bg-red-100 text-red-800",
};

export default function Citas() {
  const [citas, setCitas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    client
      .get("/citas")
      .then((res) => setCitas(res.data.data))
      .catch((err) => {
        // Si el backend responde 401/403, probablemente falte el token de Cognito
        // (todavía no hay User Pool configurado) o el usuario no tiene permiso.
        setError(err.response?.data?.message || err.message);
      })
      .finally(() => setCargando(false));
  }, []);

  if (cargando) return <p className="p-6">Cargando...</p>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-4">Citas médicas</h1>

      {error && (
        <p className="mb-4 text-red-600 text-sm">
          No se pudieron cargar las citas: {error}
        </p>
      )}

      {!error && citas.length === 0 && (
        <p className="text-gray-500 text-sm">No hay citas registradas.</p>
      )}

      {!error && citas.length > 0 && (
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b bg-gray-100">
              <th className="p-2">Fecha y hora</th>
              <th className="p-2">Estado</th>
            </tr>
          </thead>
          <tbody>
            {citas.map((c) => (
              <tr key={c.id} className="border-b hover:bg-gray-50">
                <td className="p-2">{c.fecha_hora}</td>
                <td className="p-2">
                  <span className={`px-2 py-1 rounded text-sm ${colores[c.estado] ?? "bg-gray-100 text-gray-800"}`}>
                    {c.estado}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}