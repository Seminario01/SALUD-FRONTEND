import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import client, { mensajeError } from "../api/client";
import useRoles from "../hooks/useRoles";
import usePacientesSeleccionables from "../hooks/usePacientesSeleccionables";
import BuscadorPaciente from "../components/BuscadorPaciente";
import { useAvisos } from "../components/Avisos";
import { ESTADO_ORDEN, NIVEL, fueraDeRango, interpretar } from "../utils/laboratorio";

// Laboratorio clínico. El médico pide exámenes; Enfermería toma la muestra y registra los
// resultados (cada valor se marca en rojo si sale del rango normal, mientras se digita).
// El backend valida todo: valores imposibles, permisos y estados (routes/laboratorio.py).

const fecha = (t) => (t ? new Date(t).toLocaleString("es-GT", { dateStyle: "medium", timeStyle: "short" }) : "—");
const campo = "border rounded px-3 py-1.5 w-full";
const FILTROS = [["activas", "Por atender"], ["COMPLETADA", "Con resultados"], ["ANULADA", "Anuladas"], ["", "Todas"]];

function NuevaOrden({ catalogo, pacientes, pacienteInicial, onCreada }) {
  const [pacienteId, setPacienteId] = useState(pacienteInicial || "");
  const [elegidos, setElegidos] = useState([]);
  const [prioridad, setPrioridad] = useState("RUTINA");
  const [indicaciones, setIndicaciones] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);
  const porCategoria = useMemo(() => catalogo.reduce((g, e) => ({ ...g, [e.categoria]: [...(g[e.categoria] || []), e] }), {}), [catalogo]);
  const alternar = (c) => setElegidos((l) => (l.includes(c) ? l.filter((x) => x !== c) : [...l, c]));

  function enviar(e) {
    e.preventDefault();
    setEnviando(true);
    setError(null);
    client.post("/laboratorio/ordenes", { paciente_id: Number(pacienteId), examenes: elegidos, prioridad, indicaciones: indicaciones || undefined })
      .then((r) => { onCreada(r.data.message); setElegidos([]); setIndicaciones(""); setPrioridad("RUTINA"); })
      .catch((err) => setError(mensajeError(err)))
      .finally(() => setEnviando(false));
  }

  return (
    <form onSubmit={enviar} className="bg-white border rounded-lg p-4 shadow-sm mb-6">
      <h2 className="font-bold text-gray-700 mb-3">Pedir exámenes</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <label className="text-sm md:col-span-2">Paciente *
          <BuscadorPaciente pacientes={pacientes} valor={pacienteId} onCambio={setPacienteId} requerido />
        </label>
        <fieldset className="text-sm">
          <legend>Prioridad</legend>
          <div className="flex gap-4 mt-1.5">
            {[["RUTINA", "Rutina"], ["URGENTE", "Urgente"]].map(([v, t]) => (
              <label key={v} className="flex items-center gap-2">
                <input type="radio" name="prioridad" value={v} checked={prioridad === v} onChange={() => setPrioridad(v)} /> {t}
              </label>
            ))}
          </div>
        </fieldset>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
        {Object.entries(porCategoria).map(([categoria, examenes]) => (
          <fieldset key={categoria} className="rounded-lg border p-3">
            <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-500">{categoria}</legend>
            {examenes.map((ex) => (
              <label key={ex.codigo} className="flex items-start gap-2 py-0.5 text-sm">
                <input type="checkbox" className="mt-1" checked={elegidos.includes(ex.codigo)} onChange={() => alternar(ex.codigo)} />
                <span>{ex.nombre}</span>
              </label>
            ))}
          </fieldset>
        ))}
      </div>
      <label className="text-sm block mt-3">Indicaciones
        <input value={indicaciones} onChange={(e) => setIndicaciones(e.target.value)} maxLength={500} placeholder="Ej.: Ayuno de 8 horas" className={campo} />
      </label>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button type="submit" disabled={enviando || !pacienteId || !elegidos.length}
          className="bg-blue-700 text-white px-4 py-1.5 rounded hover:bg-blue-800 disabled:opacity-50">
          {enviando ? "Enviando..." : !elegidos.length ? "Pedir exámenes" : `Pedir ${elegidos.length} ${elegidos.length === 1 ? "examen" : "exámenes"}`}
        </button>
        {error && <span className="text-sm text-red-600">{error}</span>}
      </div>
    </form>
  );
}

// Formulario de resultados de una orden en proceso: todos sus exámenes, con el rango a la vista
function Resultados({ orden, catalogo, onGuardada, onCerrar }) {
  const avisos = useAvisos();
  const inicial = () => Object.fromEntries(orden.examenes.map((e) => [e.codigo,
    Object.fromEntries((e.resultados || []).map((r) => [r.clave, r.valor ?? ""]))]));
  const [valores, setValores] = useState(inicial);
  const [observaciones, setObservaciones] = useState(orden.observaciones || "");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);
  const examen = (codigo) => catalogo.find((c) => c.codigo === codigo);
  const cambiar = (codigo, clave, v) => setValores((x) => ({ ...x, [codigo]: { ...x[codigo], [clave]: v } }));
  const completos = orden.examenes.every((e) => examen(e.codigo)?.parametros.every((p) => valores[e.codigo]?.[p.clave] !== ""
    && valores[e.codigo]?.[p.clave] !== undefined));

  function guardar(completar) {
    setEnviando(true);
    setError(null);
    client.put(`/laboratorio/ordenes/${orden.id}/resultados`, { resultados: valores, observaciones: observaciones || undefined, completar })
      .then((r) => { (r.data.data.fuera_de_rango ? avisos.error : avisos.exito)(r.data.message); onGuardada(); if (completar) onCerrar(); })
      .catch((err) => setError(mensajeError(err)))
      .finally(() => setEnviando(false));
  }

  return (
    <div className="mt-3 border-t pt-3 space-y-4">
      {orden.examenes.map((e) => {
        const ex = examen(e.codigo);
        if (!ex) return null;
        return (
          <fieldset key={e.codigo}>
            <legend className="text-sm font-semibold text-slate-700 mb-1">{ex.nombre}</legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {ex.parametros.map((p) => {
                const v = valores[e.codigo]?.[p.clave] ?? "";
                const nivel = interpretar(p, v);
                const fuera = fueraDeRango(nivel);
                const id = `res-${orden.id}-${e.codigo}-${p.clave}`;
                return (
                  <div key={p.clave} className={`rounded border px-2 py-1.5 ${fuera ? "border-red-300 bg-red-50" : ""}`}>
                    <label htmlFor={id} className="flex justify-between gap-2 text-xs text-slate-600">
                      <span className="font-medium">{p.nombre}</span>
                      <span className="text-slate-400">Ref.: {p.referencia}</span>
                    </label>
                    <div className="flex items-center gap-2 mt-0.5">
                      {p.tipo === "opcion" ? (
                        <select id={id} value={v} onChange={(x) => cambiar(e.codigo, p.clave, x.target.value)} className="border rounded px-2 py-1 text-sm flex-1">
                          <option value="">—</option>
                          {p.opciones.map((o) => <option key={o} value={o}>{o}</option>)}
                        </select>
                      ) : (
                        <input id={id} inputMode="decimal" value={v} onChange={(x) => cambiar(e.codigo, p.clave, x.target.value)}
                          className="border rounded px-2 py-1 text-sm w-28 tabular-nums" />
                      )}
                      {p.unidad && <span className="text-xs text-slate-500">{p.unidad}</span>}
                      {fuera && <span className="ml-auto text-xs font-semibold text-red-700">{NIVEL[nivel].texto} {NIVEL[nivel].flecha}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </fieldset>
        );
      })}
      <label className="text-sm block">Observaciones del laboratorio
        <textarea value={observaciones} onChange={(e) => setObservaciones(e.target.value)} rows={2} maxLength={2000} className={campo} />
      </label>
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={() => guardar(false)} disabled={enviando} className="px-4 py-1.5 rounded border hover:bg-gray-100 disabled:opacity-50">Guardar avance</button>
        <button onClick={() => guardar(true)} disabled={enviando || !completos} title={completos ? "" : "Faltan resultados"}
          className="px-4 py-1.5 rounded bg-green-700 text-white hover:bg-green-800 disabled:opacity-50">Guardar y entregar resultados</button>
        <button onClick={onCerrar} className="px-4 py-1.5 rounded border hover:bg-gray-100">Cerrar</button>
        {error && <span className="text-sm text-red-600">{error}</span>}
      </div>
    </div>
  );
}

function TarjetaOrden({ orden, catalogo, onCambio }) {
  const { puede } = useRoles();
  const avisos = useAvisos();
  const [abierta, setAbierta] = useState(false);
  const [anulando, setAnulando] = useState(null);
  const estado = ESTADO_ORDEN[orden.estado] ?? { texto: orden.estado, clase: "bg-gray-100" };
  const activa = orden.estado === "PENDIENTE" || orden.estado === "EN_PROCESO";

  function muestra() {
    client.post(`/laboratorio/ordenes/${orden.id}/muestra`)
      .then((r) => { avisos.exito(r.data.message); onCambio(); })
      .catch((err) => avisos.error(mensajeError(err)));
  }
  function anular(e) {
    e.preventDefault();
    client.post(`/laboratorio/ordenes/${orden.id}/anular`, { motivo: anulando })
      .then((r) => { avisos.exito(r.data.message); setAnulando(null); onCambio(); })
      .catch((err) => avisos.error(mensajeError(err)));
  }

  return (
    <article className={`bg-white border rounded-lg p-4 shadow-sm ${orden.prioridad === "URGENTE" && activa ? "border-l-4 border-l-red-500" : ""}`} data-orden={orden.id}>
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-slate-800">
            Orden No. {orden.id} · <Link to={`/pacientes/${orden.paciente_id}`} className="text-blue-700 hover:underline">{orden.paciente ?? `Paciente ${orden.paciente_id}`}</Link>
            {orden.prioridad === "URGENTE" && <span className="ml-2 px-2 py-0.5 rounded text-xs bg-red-100 text-red-800 align-middle">URGENTE</span>}
          </p>
          <p className="text-xs text-slate-500">{fecha(orden.fecha)}{orden.medico ? ` · Dr(a). ${orden.medico}` : ""}</p>
        </div>
        <span className={`px-2 py-1 rounded text-xs font-medium ${estado.clase}`}>{estado.texto}</span>
      </header>
      <p className="text-sm text-slate-700 mt-2">{orden.examenes.map((e) => e.nombre).join(" · ")}</p>
      {orden.indicaciones && <p className="text-sm text-slate-500">Indicaciones: {orden.indicaciones}</p>}
      {orden.estado === "EN_PROCESO" && <p className="text-xs text-blue-800 mt-1">Muestra tomada el {fecha(orden.fecha_muestra)}{orden.muestra_por ? ` por ${orden.muestra_por}` : ""}</p>}
      {orden.estado === "COMPLETADA" && (
        <p className={`text-sm mt-1 ${orden.fuera_de_rango ? "text-red-700 font-medium" : "text-green-800"}`}>
          {orden.fuera_de_rango ? `⚠ ${orden.fuera_de_rango} resultado(s) fuera de rango` : "Todos los resultados dentro de lo normal"} · {fecha(orden.fecha_resultado)}
        </p>
      )}
      {orden.estado === "ANULADA" && <p className="text-xs text-red-700 mt-1">Anulada: {orden.motivo_anulacion}</p>}

      <footer className="flex flex-wrap items-center gap-2 mt-3">
        {orden.estado === "PENDIENTE" && puede("laboratorio.procesar") && (
          <button onClick={muestra} className="text-sm px-3 py-1.5 rounded bg-blue-700 text-white hover:bg-blue-800">Tomar muestra</button>
        )}
        {orden.estado === "EN_PROCESO" && puede("laboratorio.procesar") && !abierta && (
          <button onClick={() => setAbierta(true)} className="text-sm px-3 py-1.5 rounded bg-green-700 text-white hover:bg-green-800">Registrar resultados</button>
        )}
        {orden.estado !== "ANULADA" && (
          <Link to={`/imprimir/laboratorio/${orden.id}`} className="text-sm px-3 py-1.5 rounded border hover:bg-gray-100">
            {orden.estado === "COMPLETADA" ? "Ver e imprimir resultados" : "Imprimir orden"}
          </Link>
        )}
        {activa && puede("laboratorio.anular") && anulando === null && (
          <button onClick={() => setAnulando("")} className="text-sm px-3 py-1.5 rounded border text-red-700 hover:bg-red-50">Anular</button>
        )}
      </footer>
      {anulando !== null && (
        <form onSubmit={anular} className="flex flex-wrap items-center gap-2 mt-2">
          <input value={anulando} onChange={(e) => setAnulando(e.target.value)} minLength={5} maxLength={255} required
            aria-label={`Motivo para anular la orden No. ${orden.id}`} placeholder="Motivo de la anulación" className="border rounded px-2 py-1 text-sm flex-1 min-w-48" />
          <button type="submit" className="text-xs px-3 py-1.5 rounded bg-red-700 text-white hover:bg-red-800">Anular</button>
          <button type="button" onClick={() => setAnulando(null)} className="text-xs px-3 py-1.5 rounded border hover:bg-gray-100">Cancelar</button>
        </form>
      )}
      {abierta && <Resultados orden={orden} catalogo={catalogo} onGuardada={onCambio} onCerrar={() => setAbierta(false)} />}
    </article>
  );
}

export default function Laboratorio() {
  const { puede } = useRoles();
  const avisos = useAvisos();
  const [params] = useSearchParams();
  const ordena = puede("laboratorio.ordenar");
  const { pacientes } = usePacientesSeleccionables(ordena);
  const [catalogo, setCatalogo] = useState([]);
  const [ordenes, setOrdenes] = useState(null);
  const [error, setError] = useState(null);
  const [filtro, setFiltro] = useState("activas");

  useEffect(() => {
    client.get("/laboratorio/examenes").then((r) => setCatalogo(r.data.data)).catch((err) => setError(mensajeError(err)));
  }, []);
  const cargar = useCallback(() => {
    client.get("/laboratorio/ordenes").then((r) => { setOrdenes(r.data.data); setError(null); })
      .catch((err) => setError(mensajeError(err)));
  }, []);
  useEffect(() => { cargar(); }, [cargar]);

  const visibles = (ordenes ?? []).filter((o) => (filtro === "activas" ? ["PENDIENTE", "EN_PROCESO"].includes(o.estado) : !filtro || o.estado === filtro));
  const cuenta = (f) => (ordenes ?? []).filter((o) => (f === "activas" ? ["PENDIENTE", "EN_PROCESO"].includes(o.estado) : !f || o.estado === f)).length;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-1">Laboratorio</h1>
      <p className="text-sm text-slate-500 mb-4">
        El médico pide los exámenes, Enfermería toma la muestra y registra los resultados. Lo que sale del rango normal se marca en rojo.
      </p>
      {ordena && catalogo.length > 0 && (
        <NuevaOrden catalogo={catalogo} pacientes={pacientes} pacienteInicial={params.get("paciente")} onCreada={(m) => { avisos.exito(m); cargar(); }} />
      )}
      <div className="flex flex-wrap gap-2 mb-4" role="group" aria-label="Filtrar órdenes">
        {FILTROS.map(([v, t]) => (
          <button key={v || "todas"} onClick={() => setFiltro(v)} aria-pressed={filtro === v}
            className={`px-3 py-1.5 text-sm rounded-full border ${filtro === v ? "bg-blue-700 text-white border-blue-700" : "bg-white hover:bg-slate-100"}`}>
            {t} <span className="opacity-75">({cuenta(v)})</span>
          </button>
        ))}
      </div>
      {error && <p className="text-sm text-red-600 mb-4">No se pudo cargar el laboratorio: {error}</p>}
      {ordenes === null && !error && <p className="text-sm text-slate-400">Cargando...</p>}
      {ordenes && visibles.length === 0 && <p className="text-sm text-slate-500">No hay órdenes en esta lista.</p>}
      <div className="space-y-3">
        {visibles.slice(0, 50).map((o) => <TarjetaOrden key={o.id} orden={o} catalogo={catalogo} onCambio={cargar} />)}
      </div>
    </div>
  );
}
