import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import client, { mensajeError } from "../api/client";
import usePacientesSeleccionables from "../hooks/usePacientesSeleccionables";
import BotonesExportar from "../components/Exportar";
import { BotonImprimir, EncabezadoImpreso, PieImpreso } from "../components/Impresion";

// Recordatorio de citas: las citas de un día (mañana por defecto) con el teléfono del paciente,
// para llamarle o escribirle por WhatsApp. "Avisado" se guarda solo en este navegador.

const CLAVE = "salud.recordatorios.avisados";
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const manana = () => { const d = new Date(); d.setDate(d.getDate() + 1); return iso(d); };
const diaLargo = (dia) => new Date(`${dia}T12:00:00`).toLocaleDateString("es-GT", { weekday: "long", day: "numeric", month: "long" });

function leerAvisados() {
  try { return JSON.parse(localStorage.getItem(CLAVE) || "{}"); } catch { return {}; }
}

// Teléfono de Guatemala (8 dígitos) a formato internacional para WhatsApp
function whatsapp(telefono) {
  const d = String(telefono ?? "").replace(/\D/g, "");
  if (d.length === 8) return `502${d}`;
  if (d.length === 11 && d.startsWith("502")) return d;
  return null;
}

export default function Recordatorios() {
  const { pacientes } = usePacientesSeleccionables(true);
  const [citas, setCitas] = useState(null);
  const [error, setError] = useState(null);
  const [dia, setDia] = useState(manana());
  const [avisados, setAvisados] = useState(leerAvisados);

  useEffect(() => {
    client.get("/citas").then((r) => setCitas(r.data.data)).catch((err) => setError(mensajeError(err)));
  }, []);

  function marcar(id, valor) {
    const nuevo = { ...avisados };
    if (valor) nuevo[id] = new Date().toISOString(); else delete nuevo[id];
    setAvisados(nuevo);
    try { localStorage.setItem(CLAVE, JSON.stringify(nuevo)); } catch { /* sin almacenamiento */ }
  }

  const paciente = (id) => pacientes.find((p) => p.id === id);
  const delDia = (citas ?? [])
    .filter((c) => String(c.fecha_hora).startsWith(dia) && (c.estado === "pendiente" || c.estado === "confirmada"))
    .sort((a, b) => String(a.fecha_hora).localeCompare(String(b.fecha_hora)))
    .map((c) => ({ ...c, p: paciente(c.paciente_id) }));
  const faltan = delDia.filter((c) => !avisados[c.id]).length;

  const mensaje = (c) => {
    const hora = String(c.fecha_hora).slice(11, 16);
    return `Buen día, ${c.p?.nombre_completo ?? ""}. Le recordamos su cita en el Módulo de Salud el ${diaLargo(dia)} a las ${hora}`
      + `${c.medico_nombre ? ` con Dr(a). ${c.medico_nombre}` : ""}. Si no puede asistir, por favor avísenos.`;
  };

  return (
    <div className="p-6 max-w-5xl print:p-0">
      <EncabezadoImpreso titulo="Recordatorio de citas" detalle={diaLargo(dia)} />
      <div className="flex flex-wrap items-center justify-between gap-3 mb-1 print:hidden">
        <Link to="/citas" className="text-sm text-blue-700 hover:underline">← Citas</Link>
        <div className="flex flex-wrap items-center gap-2">
          <BotonesExportar nombre={`recordatorio_citas_${dia}`} titulo={`Recordatorio de citas · ${diaLargo(dia)}`} filas={delDia} columnas={[
            { titulo: "Hora", valor: (c) => String(c.fecha_hora).slice(11, 16), ancho: 8 },
            { titulo: "Paciente", valor: (c) => c.p?.nombre_completo ?? "", ancho: 32 },
            { titulo: "Teléfono", valor: (c) => c.p?.telefono ?? "", ancho: 14 },
            { titulo: "Médico", valor: (c) => c.medico_nombre ?? "", ancho: 24 },
            { titulo: "Motivo", valor: (c) => c.motivo ?? "", ancho: 32 },
            { titulo: "Estado", valor: (c) => c.estado, ancho: 12 },
            { titulo: "Avisado", valor: (c) => (avisados[c.id] ? "Sí" : "No"), ancho: 10 },
          ]} />
          <BotonImprimir texto="Imprimir lista / PDF" />
        </div>
      </div>
      <h1 className="text-2xl font-bold text-gray-800 print:hidden">Recordatorio de citas</h1>
      <p className="text-sm text-slate-500 mb-4 print:hidden">
        Citas pendientes y confirmadas del día, con el teléfono del paciente para llamarle o escribirle.
      </p>

      <div className="flex flex-wrap items-end gap-3 mb-4 print:hidden">
        <label className="text-sm">Día
          <input type="date" value={dia} onChange={(e) => e.target.value && setDia(e.target.value)} className="border rounded px-3 py-1.5 block" />
        </label>
        <button onClick={() => setDia(iso(new Date()))} className="text-sm px-3 py-1.5 rounded border hover:bg-gray-100">Hoy</button>
        <button onClick={() => setDia(manana())} className="text-sm px-3 py-1.5 rounded border hover:bg-gray-100">Mañana</button>
        {citas && delDia.length > 0 && (
          <span className="text-sm text-slate-600 ml-auto">
            {delDia.length} cita(s) · <span className={faltan ? "text-amber-700 font-medium" : "text-green-700 font-medium"}>
              {faltan ? `faltan ${faltan} por avisar` : "todos avisados"}</span>
          </span>
        )}
      </div>

      {error && <p className="text-sm text-red-600">No se pudieron cargar las citas: {error}</p>}
      {!citas && !error && <p className="text-sm text-slate-500">Cargando...</p>}
      {citas && delDia.length === 0 && <p className="text-sm text-slate-500">No hay citas pendientes ni confirmadas para el {diaLargo(dia)}.</p>}

      {delDia.length > 0 && (
        <div className="bg-white border rounded-lg shadow-sm overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b bg-gray-50 text-slate-600">
                <th className="p-2 font-medium">Hora</th>
                <th className="p-2 font-medium">Paciente</th>
                <th className="p-2 font-medium">Teléfono</th>
                <th className="p-2 font-medium">Médico / motivo</th>
                <th className="p-2 font-medium print:hidden">Avisar</th>
                <th className="p-2 font-medium">Avisado</th>
              </tr>
            </thead>
            <tbody>
              {delDia.map((c) => {
                const wa = whatsapp(c.p?.telefono);
                return (
                  <tr key={c.id} className={`border-b last:border-0 align-top ${avisados[c.id] ? "bg-green-50/50" : ""}`}>
                    <td className="p-2 font-semibold tabular-nums">{String(c.fecha_hora).slice(11, 16)}</td>
                    <td className="p-2">
                      <Link to={`/citas/${c.id}`} className="text-blue-700 hover:underline font-medium">{c.p?.nombre_completo ?? `Paciente ${c.paciente_id}`}</Link>
                      <span className="block text-xs text-slate-500">Cita No. {c.id} · {c.estado}</span>
                    </td>
                    <td className="p-2 tabular-nums whitespace-nowrap">{c.p?.telefono || <span className="text-slate-400">Sin teléfono</span>}</td>
                    <td className="p-2 text-slate-600">
                      {c.medico_nombre && <span className="block">Dr(a). {c.medico_nombre}</span>}
                      {c.motivo || "Consulta"}
                    </td>
                    <td className="p-2 whitespace-nowrap print:hidden">
                      {c.p?.telefono && (
                        <a href={`tel:${String(c.p.telefono).replace(/\s/g, "")}`} className="text-xs px-2 py-1 rounded border hover:bg-gray-100 mr-1">Llamar</a>
                      )}
                      {wa && (
                        <a href={`https://wa.me/${wa}?text=${encodeURIComponent(mensaje(c))}`} target="_blank" rel="noopener noreferrer"
                          onClick={() => marcar(c.id, true)}
                          className="text-xs px-2 py-1 rounded border border-green-700 text-green-800 hover:bg-green-50">WhatsApp</a>
                      )}
                    </td>
                    <td className="p-2">
                      <label className="inline-flex items-center gap-1.5 text-xs">
                        <input type="checkbox" checked={!!avisados[c.id]} onChange={(e) => marcar(c.id, e.target.checked)} className="print:hidden" />
                        <span className="hidden print:inline">{avisados[c.id] ? "Sí" : "☐"}</span>
                        <span className="print:hidden">{avisados[c.id] ? "Sí" : "No"}</span>
                      </label>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-xs text-slate-400 mt-3 print:hidden">
        La marca "Avisado" se guarda solo en esta computadora. Al abrir WhatsApp se marca sola.
      </p>
      <PieImpreso />
    </div>
  );
}
