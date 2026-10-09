import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import client from "../api/client";

// Farmacia en el panel: recetas por despachar y medicamentos bajo el mínimo.
export default function ResumenFarmacia({ verRecetas }) {
  const [pendientes, setPendientes] = useState(null);
  const [bajos, setBajos] = useState(null);

  useEffect(() => {
    if (verRecetas) {
      client.get("/recetas", { params: { estado: "PENDIENTE" } }).then((r) => setPendientes(r.data.data)).catch(() => setPendientes([]));
    }
    client.get("/medicamentos", { params: { bajo_minimo: 1 } }).then((r) => setBajos(r.data.data)).catch(() => setBajos([]));
  }, [verRecetas]);

  if (bajos === null) return null;

  return (
    <div className={`grid grid-cols-1 ${verRecetas ? "lg:grid-cols-2" : ""} gap-4 mt-8`}>
      {verRecetas && (
        <div className="bg-white border rounded-lg p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-slate-700">Recetas por despachar</h2>
            <Link to="/recetas" className="text-sm text-blue-700 hover:underline">Ver recetas →</Link>
          </div>
          {pendientes === null && <p className="text-sm text-slate-400">Cargando...</p>}
          {pendientes?.length === 0 && <p className="text-sm text-slate-500">No hay recetas pendientes.</p>}
          <ul className="divide-y">
            {pendientes?.slice(0, 5).map((r) => {
              const falta = r.items.some((it) => it.existencia !== null && it.cantidad > it.existencia);
              return (
                <li key={r.id} className="py-2 flex items-start justify-between gap-3 text-sm">
                  <div>
                    <p className="font-medium text-slate-800">No. {r.id} · {r.paciente}</p>
                    <p className="text-slate-500">{r.items.map((it) => `${it.medicamento} ×${it.cantidad}`).join(", ")}</p>
                  </div>
                  {falta && <span className="shrink-0 px-2 py-0.5 rounded text-xs bg-red-100 text-red-800">Sin existencia</span>}
                </li>
              );
            })}
          </ul>
          {pendientes?.length > 5 && <p className="text-xs text-slate-400 mt-2">y {pendientes.length - 5} más.</p>}
        </div>
      )}
      <div className="bg-white border rounded-lg p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-slate-700">Medicamentos bajo el mínimo</h2>
          <Link to="/inventario" className="text-sm text-blue-700 hover:underline">Ver inventario →</Link>
        </div>
        {bajos.length === 0 && <p className="text-sm text-slate-500">Todas las existencias están sobre el mínimo.</p>}
        <ul className="space-y-2">
          {bajos.slice(0, 6).map((m) => {
            const porcentaje = Math.min(100, Math.round((m.existencia / Math.max(1, m.stock_minimo)) * 100));
            return (
              <li key={m.id} className="text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-700">{m.nombre}{m.presentacion ? <span className="text-slate-400"> — {m.presentacion}</span> : null}</span>
                  <span className="tabular-nums text-slate-600">{m.existencia} / {m.stock_minimo}</span>
                </div>
                <div className="h-1.5 bg-slate-100 rounded mt-1">
                  <div className={`h-1.5 rounded ${m.existencia === 0 ? "bg-red-600" : "bg-amber-500"}`} style={{ width: `${Math.max(porcentaje, 2)}%` }} />
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
