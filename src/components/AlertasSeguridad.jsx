import { useEffect, useState } from "react";
import client from "../api/client";

const NIVEL = {
  ALTO: "bg-red-100 text-red-800",
  MEDIO: "bg-amber-100 text-amber-800",
  BAJO: "bg-slate-100 text-slate-700",
};

// Alertas activas que reporta Seguridad en el departamento del hospital (posibles heridos).
export default function AlertasSeguridad() {
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    client.get("/seguridad/alertas").then((r) => setDatos(r.data.data)).catch(() => setError(true));
  }, []);

  if (!datos && !error) return null;

  return (
    <div className="bg-white border rounded-lg p-5 shadow-sm mt-8">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-bold text-slate-700">Alertas de Seguridad{datos ? ` · ${datos.departamento}` : ""}</h2>
        <span className="text-xs text-slate-500">Módulo de Seguridad</span>
      </div>
      {error && <p className="text-sm text-slate-500">El módulo de Seguridad no está disponible en este momento.</p>}
      {datos?.alertas.length === 0 && <p className="text-sm text-slate-500">Sin alertas activas en la zona.</p>}
      <ul className="divide-y">
        {datos?.alertas.slice(0, 5).map((a) => (
          <li key={a.id} className="py-2 flex items-start justify-between gap-3 text-sm">
            <div>
              <p className="font-medium text-slate-800">{a.tipo} · {a.zona}</p>
              <p className="text-slate-600">{a.descripcion}</p>
            </div>
            <span className={`shrink-0 px-2 py-0.5 rounded text-xs font-medium ${NIVEL[a.nivel] ?? "bg-slate-100 text-slate-700"}`}>{a.nivel}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
