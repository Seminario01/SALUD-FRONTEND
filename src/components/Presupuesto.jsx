import { useState } from "react";
import client, { mensajeError } from "../api/client";
import useRoles from "../hooks/useRoles";
import { useAvisos } from "./Avisos";

const quetzales = (v) => `Q${Number(v).toLocaleString("es-GT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// Presupuesto de servicio social del período (Jefatura, Administración y Auditoría lo ven).
// Barra de ejecución; Administración lo actualiza (PUT /presupuesto, permiso presupuesto.editar).
export default function Presupuesto({ presupuesto, onActualizado }) {
  const { puede } = useRoles();
  const avisos = useAvisos();
  const [editando, setEditando] = useState(false);
  const [form, setForm] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);
  const asignado = Number(presupuesto.monto_asignado) || 0;
  const ejecutado = Number(presupuesto.monto_ejecutado_servicio_social) || 0;
  const porcentaje = asignado ? Math.min(100, (ejecutado / asignado) * 100) : 0;

  function abrir() {
    setForm({ periodo: presupuesto.periodo, monto_asignado: String(asignado), monto_ejecutado_servicio_social: String(ejecutado) });
    setError(null);
    setEditando(true);
  }

  function guardar(e) {
    e.preventDefault();
    setEnviando(true);
    setError(null);
    client.put("/presupuesto", form)
      .then(() => { setEditando(false); avisos.exito(`Presupuesto ${form.periodo} actualizado.`); onActualizado?.(); })
      .catch((err) => setError(mensajeError(err)))
      .finally(() => setEnviando(false));
  }

  return (
    <section className="bg-white border rounded-lg p-4 shadow-sm max-w-xl">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500">Ejecutado en servicio social · {presupuesto.periodo}</p>
          <p className="text-3xl font-bold text-teal-700 tabular-nums">
            {quetzales(ejecutado)} <span className="text-sm text-slate-400 font-normal">de {quetzales(asignado)}</span>
          </p>
        </div>
        {puede("presupuesto.editar") && !editando && (
          <button onClick={abrir} className="text-sm border rounded-lg px-3 py-1.5 hover:bg-slate-50 shrink-0">Actualizar</button>
        )}
      </div>
      <div className="mt-3 h-2.5 rounded-full bg-slate-100 overflow-hidden" role="progressbar" aria-valuenow={Math.round(porcentaje)}
        aria-valuemin={0} aria-valuemax={100} aria-label="Porcentaje ejecutado">
        <div className={`h-full rounded-full ${porcentaje >= 90 ? "bg-amber-500" : "bg-teal-600"}`} style={{ width: `${porcentaje}%` }} />
      </div>
      <p className="mt-1 text-xs text-slate-500">
        {porcentaje.toFixed(1)} % ejecutado · disponible {quetzales(Math.max(0, asignado - ejecutado))}
        {porcentaje >= 90 && <span className="text-amber-700 font-medium"> · queda poco presupuesto</span>}
      </p>

      {editando && (
        <form onSubmit={guardar} className="mt-4 grid gap-3 sm:grid-cols-3 border-t pt-4">
          <label className="text-sm">Período
            <input value={form.periodo} onChange={(e) => setForm({ ...form, periodo: e.target.value })} required maxLength={20}
              placeholder="2026-Q4" className="w-full border rounded px-2 py-1.5" />
          </label>
          <label className="text-sm">Asignado (Q)
            <input value={form.monto_asignado} onChange={(e) => setForm({ ...form, monto_asignado: e.target.value })} required
              inputMode="decimal" className="w-full border rounded px-2 py-1.5 tabular-nums" />
          </label>
          <label className="text-sm">Ejecutado (Q)
            <input value={form.monto_ejecutado_servicio_social} onChange={(e) => setForm({ ...form, monto_ejecutado_servicio_social: e.target.value })}
              inputMode="decimal" className="w-full border rounded px-2 py-1.5 tabular-nums" />
          </label>
          <p className="sm:col-span-3 text-xs text-slate-500">Período: AAAA, AAAA-MM o AAAA-Q1 a Q4</p>
          {error && <p className="sm:col-span-3 text-sm text-red-700" role="alert">{error}</p>}
          <div className="sm:col-span-3 flex gap-2">
            <button disabled={enviando} className="bg-blue-700 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-800 disabled:opacity-60">
              {enviando ? "Guardando..." : "Guardar"}
            </button>
            <button type="button" onClick={() => setEditando(false)} className="px-4 py-2 rounded-lg border text-sm hover:bg-slate-50">Cancelar</button>
          </div>
        </form>
      )}
    </section>
  );
}
