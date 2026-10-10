import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import client from "../api/client";

const NOMBRES = { educacion: "Educación", seguridad: "Seguridad", tributario: "Tributario" };
const ESTILO = {
  conectado: { punto: "bg-green-500", texto: "Conectado" },
  no_disponible: { punto: "bg-red-500", texto: "No disponible" },
  no_configurado: { punto: "bg-slate-400", texto: "No configurado" },
};

// Muestra si el backend de Salud logra comunicarse con los otros módulos.
export default function EstadoIntegraciones() {
  const [estado, setEstado] = useState(null);

  useEffect(() => {
    client
      .get("/integraciones/estado")
      .then((res) => setEstado(res.data.data))
      .catch(() => setEstado(false));
  }, []);

  if (estado === false) return null;

  return (
    <div className="bg-white border rounded-lg p-4 shadow-sm mt-8">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-bold text-slate-700">Integración con otros módulos</h2>
        <Link to="/integraciones" className="text-sm text-blue-700 hover:underline">Ver detalle y bitácora →</Link>
      </div>
      {!estado && <p className="text-sm text-slate-400">Verificando conexión...</p>}
      {estado && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {Object.entries(NOMBRES).map(([clave, nombre]) => {
            const e = estado[clave] ?? { estado: "no_configurado" };
            const estilo = ESTILO[e.estado] ?? ESTILO.no_disponible;
            return (
              <div key={clave} className="flex items-center gap-3 rounded-lg bg-slate-50 px-3 py-2">
                <span className={`h-2.5 w-2.5 rounded-full ${estilo.punto}`} />
                <div className="leading-tight">
                  <p className="text-sm font-medium text-slate-700">{nombre}</p>
                  <p className="text-xs text-slate-500">
                    {estilo.texto}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
