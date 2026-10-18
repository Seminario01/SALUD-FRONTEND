import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import client, { mensajeError } from "../api/client";
import usePacientesSeleccionables from "../hooks/usePacientesSeleccionables";
import useMedicos from "../hooks/useMedicos";
import BotonesExportar from "../components/Exportar";
import { BotonImprimir, EncabezadoImpreso, PieImpreso } from "../components/Impresion";

// Agenda semanal: las citas de lunes a domingo en una cuadrícula por hora, filtrada por médico.
// Cada cita lleva a su detalle. Las canceladas se pueden mostrar u ocultar.

const ESTADO = {
  pendiente: "border-amber-300 bg-amber-50 text-amber-900",
  confirmada: "border-emerald-300 bg-emerald-50 text-emerald-900",
  atendida: "border-blue-300 bg-blue-50 text-blue-900",
  cancelada: "border-slate-200 bg-slate-50 text-slate-400 line-through",
};

const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

function lunesDe(fecha) {
  const d = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
}

export default function Agenda() {
  const { pacientes } = usePacientesSeleccionables(true);
  const medicos = useMedicos(true);
  const [citas, setCitas] = useState(null);
  const [error, setError] = useState(null);
  const [lunes, setLunes] = useState(() => lunesDe(new Date()));
  const [medico, setMedico] = useState("");
  const [verCanceladas, setVerCanceladas] = useState(false);

  useEffect(() => {
    client.get("/citas").then((r) => setCitas(r.data.data)).catch((err) => setError(mensajeError(err)));
  }, []);

  const dias = useMemo(() => Array.from({ length: 7 }, (_, i) => {
    const d = new Date(lunes);
    d.setDate(d.getDate() + i);
    return { clave: iso(d), corto: d.toLocaleDateString("es-GT", { weekday: "short", day: "numeric" }), largo: d.toLocaleDateString("es-GT", { weekday: "long", day: "numeric", month: "long" }) };
  }), [lunes]);

  const nombre = (id) => pacientes.find((p) => p.id === id)?.nombre_completo ?? `Paciente ${id}`;
  const hoy = iso(new Date());
  const semana = (citas ?? []).filter((c) => {
    const dia = String(c.fecha_hora).slice(0, 10);
    if (dia < dias[0].clave || dia > dias[6].clave) return false;
    if (!verCanceladas && c.estado === "cancelada") return false;
    if (medico === "sin") return !c.medico_sub;
    return !medico || c.medico_sub === medico;
  }).sort((a, b) => String(a.fecha_hora).localeCompare(String(b.fecha_hora)));

  const hora = (c) => Number(String(c.fecha_hora).slice(11, 13));
  const horas = semana.length
    ? Array.from({ length: Math.max(...semana.map(hora), 17) - Math.min(...semana.map(hora), 7) + 1 }, (_, i) => Math.min(...semana.map(hora), 7) + i)
    : Array.from({ length: 11 }, (_, i) => 7 + i);
  const mover = (dias7) => setLunes((l) => { const d = new Date(l); d.setDate(d.getDate() + dias7); return d; });
  const rango = `${dias[0].largo} al ${dias[6].largo}`;
  const nombreMedico = medico === "sin" ? "Sin médico asignado" : medicos.find((m) => m.sub === medico)?.nombre;

  return (
    <div className="p-6 print:p-0">
      <EncabezadoImpreso titulo="Agenda semanal" detalle={`${rango}${nombreMedico ? ` · ${medico === "sin" ? nombreMedico : `Dr(a). ${nombreMedico}`}` : ""}`} />
      <div className="flex flex-wrap items-center justify-between gap-3 mb-1 print:hidden">
        <Link to="/citas" className="text-sm text-blue-700 hover:underline">← Citas</Link>
        <div className="flex flex-wrap items-center gap-2">
          <BotonesExportar nombre={`agenda_${dias[0].clave}`} titulo={`Agenda semanal · ${rango}`} filas={semana} columnas={[
            { titulo: "Día", valor: (c) => String(c.fecha_hora).slice(0, 10), ancho: 12 },
            { titulo: "Hora", valor: (c) => String(c.fecha_hora).slice(11, 16), ancho: 8 },
            { titulo: "Paciente", valor: (c) => nombre(c.paciente_id), ancho: 30 },
            { titulo: "Médico", valor: (c) => c.medico_nombre ?? "Por asignar", ancho: 24 },
            { titulo: "Motivo", valor: (c) => c.motivo ?? "", ancho: 30 },
            { titulo: "Estado", valor: (c) => c.estado, ancho: 12 },
          ]} />
          <BotonImprimir texto="Imprimir agenda / PDF" />
        </div>
      </div>
      <h1 className="text-2xl font-bold text-gray-800 print:hidden">Agenda semanal</h1>
      <p className="text-sm text-slate-500 mb-4 print:hidden first-letter:uppercase">{rango}</p>

      <div className="flex flex-wrap items-end gap-2 mb-4 print:hidden">
        <button onClick={() => mover(-7)} className="text-sm px-3 py-1.5 rounded border hover:bg-gray-100" aria-label="Semana anterior">← Anterior</button>
        <button onClick={() => setLunes(lunesDe(new Date()))} className="text-sm px-3 py-1.5 rounded border hover:bg-gray-100">Esta semana</button>
        <button onClick={() => mover(7)} className="text-sm px-3 py-1.5 rounded border hover:bg-gray-100" aria-label="Semana siguiente">Siguiente →</button>
        <label className="text-sm ml-2">Médico
          <select value={medico} onChange={(e) => setMedico(e.target.value)} className="border rounded px-2 py-1.5 block bg-white">
            <option value="">Todos los médicos</option>
            <option value="sin">Sin médico asignado</option>
            {medicos.map((m) => <option key={m.sub} value={m.sub}>Dr(a). {m.nombre}</option>)}
          </select>
        </label>
        <label className="text-sm flex items-center gap-2 pb-2">
          <input type="checkbox" checked={verCanceladas} onChange={(e) => setVerCanceladas(e.target.checked)} /> Ver canceladas
        </label>
        <span className="text-sm text-slate-500 ml-auto pb-2">{citas ? `${semana.length} cita(s) en la semana` : ""}</span>
      </div>

      {error && <p className="text-sm text-red-600">No se pudieron cargar las citas: {error}</p>}
      {!citas && !error && <p className="text-sm text-slate-500">Cargando...</p>}

      {citas && (
        <div className="overflow-x-auto bg-white border rounded-lg shadow-sm">
          <table className="w-full min-w-[900px] table-fixed border-collapse text-xs">
            <thead>
              <tr>
                <th className="w-14 border-b p-2" />
                {dias.map((d) => (
                  <th key={d.clave} className={`border-b border-l p-2 font-semibold capitalize ${d.clave === hoy ? "bg-blue-50 text-blue-800" : "text-slate-600"}`}>
                    {d.corto}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {horas.map((h) => (
                <tr key={h} className="align-top">
                  <th scope="row" className="border-t p-1.5 text-right font-normal tabular-nums text-slate-500">{String(h).padStart(2, "0")}:00</th>
                  {dias.map((d) => {
                    const aqui = semana.filter((c) => String(c.fecha_hora).startsWith(d.clave) && hora(c) === h);
                    return (
                      <td key={d.clave} className={`border-t border-l p-1 h-12 ${d.clave === hoy ? "bg-blue-50/40" : ""}`}>
                        <div className="space-y-1">
                          {aqui.map((c) => (
                            <Link key={c.id} to={`/citas/${c.id}`} title={`${nombre(c.paciente_id)} · ${c.motivo || "Consulta"} · ${c.estado}`}
                              className={`block rounded border px-1.5 py-1 leading-tight hover:shadow ${ESTADO[c.estado] ?? "bg-gray-50"}`}>
                              <span className="font-semibold tabular-nums">{String(c.fecha_hora).slice(11, 16)}</span>{" "}
                              <span className="truncate">{nombre(c.paciente_id)}</span>
                              {!medico && <span className="block truncate opacity-75">{c.medico_nombre ? `Dr(a). ${c.medico_nombre}` : "Sin médico"}</span>}
                            </Link>
                          ))}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex flex-wrap gap-3 mt-3 text-xs text-slate-600" aria-label="Colores por estado">
        {[["pendiente", "Pendiente"], ["confirmada", "Confirmada"], ["atendida", "Atendida"], ["cancelada", "Cancelada"]].map(([k, t]) => (
          <span key={k} className="inline-flex items-center gap-1.5"><span className={`inline-block h-3 w-3 rounded border ${ESTADO[k]}`} />{t}</span>
        ))}
      </div>
      <PieImpreso />
    </div>
  );
}
