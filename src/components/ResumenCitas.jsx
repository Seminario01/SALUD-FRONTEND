import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import client from "../api/client";
import usePacientesSeleccionables from "../hooks/usePacientesSeleccionables";

// Citas de hoy + distribución por estado (solo personal de Salud).
const ESTADOS = [
  { clave: "pendiente", texto: "Pendientes", color: "bg-amber-400" },
  { clave: "confirmada", texto: "Confirmadas", color: "bg-emerald-500" },
  { clave: "atendida", texto: "Atendidas", color: "bg-blue-600" },
  { clave: "cancelada", texto: "Canceladas", color: "bg-slate-400" },
];

function hoyISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function ResumenCitas() {
  const { pacientes } = usePacientesSeleccionables(true);
  const [citas, setCitas] = useState(null);

  useEffect(() => {
    client.get("/citas").then((r) => setCitas(r.data.data)).catch(() => setCitas([]));
  }, []);

  if (citas === null) return null;
  const nombre = (id) => pacientes.find((p) => p.id === id)?.nombre_completo ?? `Paciente ${id}`;
  const hoy = hoyISO();
  const deHoy = citas
    .filter((c) => String(c.fecha_hora).startsWith(hoy) && c.estado !== "cancelada")
    .sort((a, b) => String(a.fecha_hora).localeCompare(String(b.fecha_hora)));
  const conteo = Object.fromEntries(ESTADOS.map((e) => [e.clave, citas.filter((c) => c.estado === e.clave).length]));
  const maximo = Math.max(1, ...Object.values(conteo));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-8">
      <div className="bg-white border rounded-lg p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-slate-700">Citas de hoy</h2>
          <Link to="/citas" className="text-sm text-blue-700 hover:underline">Ver todas →</Link>
        </div>
        {deHoy.length === 0 && <p className="text-sm text-slate-500">No hay citas para hoy.</p>}
        <ul className="divide-y divide-slate-100">
          {deHoy.slice(0, 6).map((c) => (
            <li key={c.id} className="py-2 flex items-center gap-3 text-sm">
              <span className="font-semibold tabular-nums text-slate-800 w-14">{String(c.fecha_hora).slice(11, 16)}</span>
              <Link to={`/pacientes/${c.paciente_id}`} className="flex-1 text-blue-700 hover:underline truncate">{nombre(c.paciente_id)}</Link>
              <span className="text-slate-500 truncate max-w-[40%]">{c.motivo || "Consulta"}</span>
            </li>
          ))}
        </ul>
        {deHoy.length > 6 && <p className="text-xs text-slate-400 mt-2">y {deHoy.length - 6} más</p>}
      </div>

      <div className="bg-white border rounded-lg p-5 shadow-sm">
        <h2 className="font-bold text-slate-700 mb-4">Citas por estado</h2>
        <div className="space-y-3" role="list">
          {ESTADOS.map((e) => (
            <div key={e.clave} role="listitem" className="grid grid-cols-[6.5rem_1fr_2.5rem] items-center gap-3 text-sm"
              title={`${e.texto}: ${conteo[e.clave]} cita(s)`}>
              <span className="text-slate-600">{e.texto}</span>
              <div className="h-3 rounded-full bg-slate-100 overflow-hidden">
                <div className={`h-full rounded-full ${e.color}`} style={{ width: `${(conteo[e.clave] / maximo) * 100}%` }} />
              </div>
              <span className="text-right font-semibold tabular-nums text-slate-800">{conteo[e.clave]}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-slate-400 mt-4">Total: {citas.length} cita(s)</p>
      </div>
    </div>
  );
}
