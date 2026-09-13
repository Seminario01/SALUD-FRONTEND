import { useEffect, useState } from "react";
import { clientExterno } from "../api/client";

export default function Recursos() {
  const [establecimientos, setEstablecimientos] = useState([]);
  const [mensaje, setMensaje] = useState("");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    clientExterno.get("/establecimientos/disponibilidad")
      .then((res) => {
        setEstablecimientos(res.data.establecimientos || []);
        setMensaje(res.data.mensaje || "");
      })
      .catch((err) => setError(err.message))
      .finally(() => setCargando(false));
  }, []);

  if (cargando) return <p className="p-6">Cargando...</p>;
  if (error) return <p className="p-6 text-red-600">Error: {error}</p>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-1">Establecimientos de salud</h1>
      {mensaje && <p className="text-gray-500 text-sm mb-4">{mensaje}</p>}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {establecimientos.map((e, i) => (
          <div key={i} className="bg-white border rounded-lg p-4 shadow-sm">
            <h2 className="font-bold text-gray-700">{e.nombreEstablecimiento}</h2>
            <p className="text-sm text-gray-500 capitalize">{e.tipoEstablecimiento}</p>
            <p className="text-sm text-gray-500">{e.direccion}</p>
            <p className="text-sm text-gray-500">{e.municipio}, {e.departamento}</p>
            <p className="text-sm text-gray-500">{e.telefono}</p>
            <p className="text-xs text-gray-400 mt-2">
              {e.estadoServicio} · {e.tipoAtencionDisponible}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}