import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import client, { mensajeError } from "../api/client";
import { useAvisos } from "./Avisos";
import BuscadorCIE10 from "./BuscadorCIE10";
import useRoles from "../hooks/useRoles";
import { ESTADO_REFERENCIA, PRIORIDAD, cargarRed } from "../utils/red";

// Referencias del paciente a otros establecimientos de la red (en la ficha). El médico refiere
// (destino activo, prioridad, motivo, CIE-10 y resumen clínico) y se imprime la hoja de referencia.
const fecha = (t) => new Date(t).toLocaleString("es-GT", { dateStyle: "medium", timeStyle: "short" });
const campo = "border rounded px-2 py-1.5 text-sm w-full";

export default function ReferenciasPaciente({ pacienteId }) {
  const { puede } = useRoles();
  const avisos = useAvisos();
  const navigate = useNavigate();
  const [lista, setLista] = useState(null);
  const [red, setRed] = useState(null);
  const [abierto, setAbierto] = useState(false);
  const [depto, setDepto] = useState("");
  const [form, setForm] = useState({ establecimiento_id: "", prioridad: "NORMAL", motivo: "", resumen: "" });
  const [cie, setCie] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);

  const cargar = () => client.get(`/pacientes/${pacienteId}/referencias`).then((r) => setLista(r.data.data)).catch(() => setLista([]));
  useEffect(() => { cargar(); }, [pacienteId]);   // eslint-disable-line react-hooks/exhaustive-deps

  function abrir() {
    setAbierto(true);
    if (!red) cargarRed().then(setRed).catch((e) => setError(mensajeError(e)));
  }

  const activos = useMemo(() => (red?.establecimientos ?? []).filter((e) => e.estado_servicio === "ACTIVO"), [red]);
  const departamentos = useMemo(() => [...new Map(activos.filter((e) => e.codigo_municipio).map((e) => [e.codigo_municipio.slice(0, 2), e.departamento])).entries()]
    .sort((a, b) => a[0].localeCompare(b[0])), [activos]);
  const opciones = activos.filter((e) => !depto || e.codigo_municipio?.startsWith(depto));

  function referir(e) {
    e.preventDefault();
    setEnviando(true);
    setError(null);
    client.post("/referencias", { paciente_id: Number(pacienteId), ...form, establecimiento_id: Number(form.establecimiento_id),
      codigo_cie10: cie?.codigo, resumen: form.resumen.trim() || null })
      .then((r) => {
        avisos.exito(r.data.message);
        setAbierto(false);
        setForm({ establecimiento_id: "", prioridad: "NORMAL", motivo: "", resumen: "" });
        setCie(null);
        navigate(`/imprimir/referencia/${r.data.data.id}`);   // misma pestaña: la sesión es por pestaña
      })
      .catch((err) => setError(mensajeError(err)))
      .finally(() => setEnviando(false));
  }

  return (
    <section className="bg-white border rounded-lg p-4">
      <div className="flex items-center justify-between gap-3 mb-3">
        <h2 className="text-lg font-semibold">Referencias a otros establecimientos</h2>
        {puede("referencias.crear") && !abierto && (
          <button onClick={abrir} className="text-sm border rounded-lg px-3 py-1.5 hover:bg-slate-50">Referir</button>
        )}
      </div>

      {abierto && (
        <form onSubmit={referir} className="grid gap-3 sm:grid-cols-2 bg-slate-50 border rounded-lg p-3 mb-4">
          <label className="text-sm">Departamento
            <select value={depto} onChange={(e) => { setDepto(e.target.value); setForm({ ...form, establecimiento_id: "" }); }} className={campo}>
              <option value="">Todos</option>
              {departamentos.map(([c, n]) => <option key={c} value={c}>{n}</option>)}
            </select>
          </label>
          <label className="text-sm">Establecimiento
            <select value={form.establecimiento_id} onChange={(e) => setForm({ ...form, establecimiento_id: e.target.value })} required className={campo}>
              <option value="">{red ? "Elija el destino" : "Cargando la red..."}</option>
              {opciones.map((e) => <option key={e.id} value={e.id}>{e.nombre} — {e.municipio}</option>)}
            </select>
          </label>
          <label className="text-sm">Prioridad
            <select value={form.prioridad} onChange={(e) => setForm({ ...form, prioridad: e.target.value })} className={campo}>
              <option value="NORMAL">Normal</option>
              <option value="URGENTE">Urgente</option>
            </select>
          </label>
          <div className="text-sm">Diagnóstico (CIE-10, opcional)<BuscadorCIE10 valor={cie} onElegir={setCie} /></div>
          <label className="text-sm sm:col-span-2">Motivo de la referencia
            <input value={form.motivo} onChange={(e) => setForm({ ...form, motivo: e.target.value })} required minLength={5} maxLength={500}
              placeholder="Requiere valoración por cirugía" className={campo} />
          </label>
          <label className="text-sm sm:col-span-2">Resumen clínico para quien recibe (opcional)
            <textarea value={form.resumen} onChange={(e) => setForm({ ...form, resumen: e.target.value })} rows={3} maxLength={4000}
              placeholder="Evolución, signos vitales, tratamiento dado" className={campo} />
          </label>
          {error && <p className="sm:col-span-2 text-sm text-red-700" role="alert">{error}</p>}
          <div className="sm:col-span-2 flex gap-2">
            <button disabled={enviando} className="bg-blue-700 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-800 disabled:opacity-60">
              {enviando ? "Enviando..." : "Referir e imprimir la hoja"}
            </button>
            <button type="button" onClick={() => setAbierto(false)} className="px-4 py-2 rounded-lg border text-sm hover:bg-slate-50">Cancelar</button>
          </div>
        </form>
      )}

      {lista && lista.length === 0 && <p className="text-sm text-slate-500">No tiene referencias.</p>}
      {lista?.length > 0 && (
        <ul className="divide-y divide-slate-100">
          {lista.map((r) => (
            <li key={r.id} className="py-2 flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-medium">{r.establecimiento}
                  <span className={`ml-2 text-[11px] rounded-full px-2 py-0.5 ${ESTADO_REFERENCIA[r.estado].clase}`}>{ESTADO_REFERENCIA[r.estado].texto}</span>
                  {r.prioridad === "URGENTE" && <span className={`ml-1 text-[11px] rounded-full px-2 py-0.5 ${PRIORIDAD.URGENTE.clase}`}>Urgente</span>}
                </p>
                <p className="text-sm text-slate-600">{r.motivo}{r.diagnostico && ` · ${r.codigo_cie10 ? `${r.codigo_cie10} ` : ""}${r.diagnostico}`}</p>
                <p className="text-xs text-slate-500">{fecha(r.fecha)} · {r.medico_nombre || "—"}{r.nota_cierre && ` · ${r.nota_cierre}`}</p>
              </div>
              <Link to={`/imprimir/referencia/${r.id}`} className="text-sm text-blue-700 hover:underline">Hoja de referencia</Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
