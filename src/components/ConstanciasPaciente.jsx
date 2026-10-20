import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import client, { mensajeError } from "../api/client";
import useRoles from "../hooks/useRoles";
import { useAvisos } from "./Avisos";

// Constancias de consulta e incapacidades (reposo) del paciente, en su ficha.
// El médico las emite; se imprimen con un QR que el patrono o el colegio verifica en línea.

const hoyISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const fechaDia = (t) => (t ? new Date(`${t.slice(0, 10)}T12:00:00`).toLocaleDateString("es-GT", { dateStyle: "medium" }) : "—");
const campo = "border rounded px-3 py-1.5 w-full";
const VACIA = () => ({ tipo: "INCAPACIDAD", expediente_id: "", dias_reposo: "3", desde: hoyISO(), con_diagnostico: false, diagnostico: "", observaciones: "" });

function FormularioConstancia({ pacienteId, atenciones, onEmitida, onCancelar }) {
  const [datos, setDatos] = useState(VACIA);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);
  const cambiar = (c, v) => setDatos((d) => ({ ...d, [c]: v }));
  const incapacidad = datos.tipo === "INCAPACIDAD";

  // Al elegir una atención, su diagnóstico queda listo (solo se imprime si el médico lo marca)
  function elegirAtencion(valor) {
    const a = atenciones.find((x) => String(x.id) === valor);
    setDatos((d) => ({ ...d, expediente_id: valor, diagnostico: a ? String(a.diagnostico || "").split("\n")[0].slice(0, 300) : d.diagnostico }));
  }

  function enviar(e) {
    e.preventDefault();
    setEnviando(true);
    setError(null);
    client
      .post("/constancias", {
        paciente_id: Number(pacienteId), tipo: datos.tipo,
        expediente_id: datos.expediente_id ? Number(datos.expediente_id) : undefined,
        ...(incapacidad ? { dias_reposo: Number(datos.dias_reposo), desde: datos.desde } : {}),
        diagnostico: datos.con_diagnostico ? datos.diagnostico : undefined,
        observaciones: datos.observaciones || undefined,
      })
      .then((r) => onEmitida(r.data.data, r.data.message))
      .catch((err) => setError(mensajeError(err)))
      .finally(() => setEnviando(false));
  }

  const hasta = incapacidad && datos.desde && Number(datos.dias_reposo) > 0
    ? (() => { const d = new Date(`${datos.desde}T12:00:00`); d.setDate(d.getDate() + Number(datos.dias_reposo) - 1); return d.toLocaleDateString("es-GT", { dateStyle: "long" }); })()
    : null;

  return (
    <form onSubmit={enviar} className="rounded-lg border bg-slate-50 p-3 mb-3 space-y-3">
      <fieldset className="flex flex-wrap gap-4 text-sm">
        <legend className="sr-only">Tipo de constancia</legend>
        {[["INCAPACIDAD", "Incapacidad (reposo)"], ["CONSULTA", "Constancia de consulta"]].map(([v, t]) => (
          <label key={v} className="flex items-center gap-2">
            <input type="radio" name="tipo" value={v} checked={datos.tipo === v} onChange={() => cambiar("tipo", v)} /> {t}
          </label>
        ))}
      </fieldset>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <label className="text-sm md:col-span-3">Atención
          <select value={datos.expediente_id} onChange={(e) => elegirAtencion(e.target.value)} className={campo}>
            <option value="">Consulta de hoy (sin asociar)</option>
            {atenciones.map((a) => <option key={a.id} value={a.id}>{String(a.fecha_atencion).slice(0, 10)} — {a.diagnostico}</option>)}
          </select>
        </label>
        {incapacidad && (
          <>
            <label className="text-sm">Días de reposo *
              <input type="number" min="1" max="60" required value={datos.dias_reposo} onChange={(e) => cambiar("dias_reposo", e.target.value)} className={campo} />
            </label>
            <label className="text-sm">Desde *
              <input type="date" required value={datos.desde} min={hoyISO()} onChange={(e) => cambiar("desde", e.target.value)} className={campo} />
            </label>
            <p className="text-sm text-slate-600 self-end pb-1.5">{hasta ? <>Hasta el <span className="font-medium">{hasta}</span> (inclusive)</> : null}</p>
          </>
        )}
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={datos.con_diagnostico} onChange={(e) => cambiar("con_diagnostico", e.target.checked)} />
        Imprimir el diagnóstico (solo con autorización del paciente)
      </label>
      {datos.con_diagnostico && (
        <input value={datos.diagnostico} onChange={(e) => cambiar("diagnostico", e.target.value)} maxLength={300} required
          aria-label="Diagnóstico que se imprime" placeholder="Diagnóstico" className={campo} />
      )}
      <label className="text-sm block">Observaciones
        <textarea value={datos.observaciones} onChange={(e) => cambiar("observaciones", e.target.value)} rows={2} maxLength={500}
          placeholder="Ej.: Puede reincorporarse a sus labores el lunes." className={campo} />
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={enviando} className="bg-blue-700 text-white px-4 py-1.5 rounded hover:bg-blue-800 disabled:opacity-50">
          {enviando ? "Emitiendo..." : "Emitir"}
        </button>
        <button type="button" onClick={onCancelar} className="px-4 py-1.5 rounded border hover:bg-gray-100">Cancelar</button>
        {error && <span className="text-sm text-red-600">{error}</span>}
      </div>
    </form>
  );
}

export default function ConstanciasPaciente({ pacienteId, atenciones = [] }) {
  const { puede } = useRoles();
  const avisos = useAvisos();
  const [lista, setLista] = useState(null);
  const [nueva, setNueva] = useState(false);
  const [anulando, setAnulando] = useState(null);     // { id, motivo }
  const [recien, setRecien] = useState(null);         // la que se acaba de emitir: lista para imprimir

  const cargar = useCallback(() => {
    client.get("/constancias", { params: { paciente_id: pacienteId } }).then((r) => setLista(r.data.data)).catch(() => setLista([]));
  }, [pacienteId]);
  useEffect(() => { cargar(); }, [cargar]);

  function anular(e) {
    e.preventDefault();
    client.post(`/constancias/${anulando.id}/anular`, { motivo: anulando.motivo })
      .then((r) => { avisos.exito(r.data.message); setAnulando(null); cargar(); })
      .catch((err) => avisos.error(mensajeError(err)));
  }

  return (
    <section className="bg-white border rounded-lg p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3 mb-3">
        <h2 className="font-bold text-slate-700">Constancias e incapacidades</h2>
        {puede("constancias.emitir") && !nueva && (
          <button onClick={() => setNueva(true)} className="no-imprimir text-sm text-blue-700 hover:underline">+ Emitir constancia</button>
        )}
      </div>
      {nueva && (
        <FormularioConstancia pacienteId={pacienteId} atenciones={atenciones} onCancelar={() => setNueva(false)}
          onEmitida={(c, mensaje) => { setNueva(false); avisos.exito(mensaje); cargar(); setRecien(c.id); }} />
      )}
      {lista === null && <p className="text-sm text-slate-400">Cargando...</p>}
      {lista?.length === 0 && !nueva && <p className="text-sm text-slate-500">Sin constancias emitidas.</p>}
      {lista?.length > 0 && (
        <ul className="divide-y text-sm">
          {lista.slice(0, 8).map((c) => (
            <li key={c.id} className={`py-2 flex flex-wrap items-center gap-x-3 gap-y-1 ${recien === c.id ? "bg-green-50 -mx-2 px-2 rounded" : ""}`}>
              <span className="font-medium tabular-nums">No. {c.id}</span>
              <span>{c.tipo === "INCAPACIDAD" ? `Incapacidad · ${c.dias_reposo} día(s), del ${fechaDia(c.desde)} al ${fechaDia(c.hasta)}` : `Constancia de consulta · ${fechaDia(c.fecha_atencion)}`}</span>
              <span className="text-slate-500">{c.medico ? `Dr(a). ${c.medico}` : ""}</span>
              {c.estado === "ANULADA" && <span className="px-2 py-0.5 rounded text-xs bg-red-100 text-red-800" title={c.motivo_anulacion}>anulada</span>}
              <span className="ml-auto flex gap-3 no-imprimir">
                <Link to={`/imprimir/constancia/${c.id}`} className={recien === c.id
                  ? "text-xs px-3 py-1 rounded bg-blue-700 text-white hover:bg-blue-800" : "text-xs text-blue-700 hover:underline"}>Imprimir</Link>
                {c.estado === "VIGENTE" && puede("constancias.anular") && anulando?.id !== c.id && (
                  <button onClick={() => setAnulando({ id: c.id, motivo: "" })} className="text-xs text-red-700 hover:underline">Anular</button>
                )}
              </span>
              {anulando?.id === c.id && (
                <form onSubmit={anular} className="w-full flex flex-wrap items-center gap-2 no-imprimir">
                  <input value={anulando.motivo} onChange={(e) => setAnulando({ ...anulando, motivo: e.target.value })} minLength={5} maxLength={255}
                    required aria-label={`Motivo para anular la constancia No. ${c.id}`} placeholder="Motivo de la anulación" className="border rounded px-2 py-1 text-sm flex-1 min-w-48" />
                  <button type="submit" className="text-xs px-3 py-1.5 rounded bg-red-700 text-white hover:bg-red-800">Anular</button>
                  <button type="button" onClick={() => setAnulando(null)} className="text-xs px-3 py-1.5 rounded border hover:bg-gray-100">Cancelar</button>
                </form>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
