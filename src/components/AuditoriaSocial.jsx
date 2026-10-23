import { useEffect, useState } from "react";
import client from "../api/client";

// Tarjeta de Auditoría Social en Integraciones (GET /integraciones/auditoria): si el servicio para
// Auditoría está operativo y si Auditoría ya lo consumió (última consulta real).
const fecha = (t) => new Date(t).toLocaleString("es-GT", { dateStyle: "medium", timeStyle: "short" });

export function TarjetaAuditoria() {
  const [panel, setPanel] = useState(null);
  useEffect(() => { client.get("/integraciones/auditoria").then((r) => setPanel(r.data.data)).catch(() => setPanel(false)); }, []);

  const operativo = panel?.operativo;
  const exitosa = panel?.ultima_exitosa;
  return (
    <div className="bg-white border rounded-lg p-5 flex flex-col gap-3">
      <h2 className="font-bold text-slate-800 text-lg">Auditoría Social</h2>
      <p className="flex items-center gap-2 text-sm text-slate-600">
        <span className={`h-2.5 w-2.5 rounded-full ${panel === null ? "bg-slate-300" : operativo ? "bg-green-500" : "bg-red-500"}`} />
        {panel === null ? "Verificando..." : operativo ? "Servicio operativo" : "Servicio no disponible"}
      </p>
      {panel && (
        <dl className="grid grid-cols-2 gap-2">
          <div className="rounded-lg bg-slate-50 px-3 py-2 col-span-2">
            <dt className="text-[11px] text-slate-500">Consumo</dt>
            <dd className="font-semibold text-slate-800">{exitosa ? `Última consulta: ${fecha(exitosa.fecha)}` : "Aún no consumido"}</dd>
          </div>
          <div className="rounded-lg bg-slate-50 px-3 py-2">
            <dt className="text-[11px] text-slate-500">Consultas (7 días)</dt>
            <dd className="font-semibold text-slate-800 tabular-nums">{panel.exitosas_7_dias}</dd>
          </div>
          <div className="rounded-lg bg-slate-50 px-3 py-2">
            <dt className="text-[11px] text-slate-500">Rechazadas (7 días)</dt>
            <dd className={`font-semibold tabular-nums ${panel.rechazadas_7_dias ? "text-amber-700" : "text-slate-800"}`}>{panel.rechazadas_7_dias}</dd>
          </div>
        </dl>
      )}
      {panel?.rechazos?.length > 0 && (
        <ul className="text-xs text-slate-600 space-y-1">
          {panel.rechazos.slice(0, 3).map((r) => <li key={r.motivo}>• {r.explicacion} ({r.veces})</li>)}
        </ul>
      )}
      <div className="text-sm">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Le consulta a Salud</p>
        <ul className="mt-1 text-slate-700 list-disc list-inside">
          {(panel?.servicios ?? [{ nombre: "Tablero de Auditoría (indicadores por rango)" }, { nombre: "Indicadores agregados" }, { nombre: "Ejecución presupuestaria" }])
            .map((s) => <li key={s.nombre}>{s.nombre}</li>)}
        </ul>
      </div>
    </div>
  );
}
