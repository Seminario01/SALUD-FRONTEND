import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import client, { mensajeError } from "../api/client";
import { AREAS, ESTADO_HOSPITALIZACION, TIPOS_EGRESO, fechaHora, textoDias } from "../utils/hospitalizacion";

const campo = "border rounded px-3 py-1.5 w-full";

function SignosVitales({ nota }) {
  const signos = [
    nota.presion && `PA ${nota.presion}`,
    nota.temperatura != null && `T ${nota.temperatura.toFixed(1)} °C`,
    nota.frecuencia_cardiaca != null && `FC ${nota.frecuencia_cardiaca} lpm`,
    nota.saturacion != null && `SpO₂ ${nota.saturacion} %`,
  ].filter(Boolean);
  if (!signos.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5 mt-1.5">
      {signos.map((s) => (
        <span key={s} className="text-xs bg-slate-100 text-slate-700 rounded px-2 py-0.5 tabular-nums">{s}</span>
      ))}
    </div>
  );
}

function FormularioNota({ id, onGuardada }) {
  const VACIO = { nota: "", presion: "", temperatura: "", frecuencia_cardiaca: "", saturacion: "" };
  const [datos, setDatos] = useState(VACIO);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);
  const cambiar = (c) => (e) => setDatos((d) => ({ ...d, [c]: e.target.value }));

  function enviar(e) {
    e.preventDefault();
    setEnviando(true);
    setError(null);
    client
      .post(`/hospitalizaciones/${id}/notas`, datos)
      .then(() => { setDatos(VACIO); onGuardada(); })
      .catch((err) => setError(mensajeError(err)))
      .finally(() => setEnviando(false));
  }

  return (
    <form onSubmit={enviar} className="border rounded-lg p-3 bg-slate-50">
      <h4 className="text-sm font-semibold text-slate-700 mb-2">Nueva nota</h4>
      <textarea value={datos.nota} onChange={cambiar("nota")} required rows={2} maxLength={2000}
        placeholder="Evolución, cuidados o hallazgos" className={`${campo} bg-white`} aria-label="Nota" />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
        <label className="text-xs text-slate-600">Presión arterial
          <input value={datos.presion} onChange={cambiar("presion")} placeholder="120/80" className={`${campo} bg-white`} />
        </label>
        <label className="text-xs text-slate-600">Temperatura (°C)
          <input type="number" step="0.1" value={datos.temperatura} onChange={cambiar("temperatura")} className={`${campo} bg-white`} />
        </label>
        <label className="text-xs text-slate-600">Frec. cardiaca (lpm)
          <input type="number" value={datos.frecuencia_cardiaca} onChange={cambiar("frecuencia_cardiaca")} className={`${campo} bg-white`} />
        </label>
        <label className="text-xs text-slate-600">Saturación (%)
          <input type="number" value={datos.saturacion} onChange={cambiar("saturacion")} className={`${campo} bg-white`} />
        </label>
      </div>
      <div className="flex items-center gap-3 mt-2">
        <button type="submit" disabled={enviando} className="bg-blue-700 text-white text-sm px-4 py-1.5 rounded hover:bg-blue-800 disabled:opacity-50">
          {enviando ? "Guardando..." : "Guardar nota"}
        </button>
        {error && <span className="text-sm text-red-600">{error}</span>}
      </div>
    </form>
  );
}

function Traslado({ hosp, camas, onHecho }) {
  const [camaId, setCamaId] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);
  const disponibles = camas.filter((c) => c.estado === "DISPONIBLE");

  function trasladar(e) {
    e.preventDefault();
    setEnviando(true);
    setError(null);
    client
      .post(`/hospitalizaciones/${hosp.id}/asignar-cama`, { cama_id: Number(camaId) })
      .then((r) => { setCamaId(""); onHecho(r.data.message); })
      .catch((err) => setError(mensajeError(err)))
      .finally(() => setEnviando(false));
  }

  return (
    <form onSubmit={trasladar} className="flex flex-wrap items-end gap-2">
      <label className="text-sm flex-1 min-w-52">Trasladar a la cama
        <select value={camaId} onChange={(e) => setCamaId(e.target.value)} required className={campo}>
          <option value="">Seleccione...</option>
          {AREAS.map((area) => {
            const delArea = disponibles.filter((c) => c.area === area);
            return delArea.length ? (
              <optgroup key={area} label={area}>
                {delArea.map((c) => <option key={c.id} value={c.id}>{c.codigo}</option>)}
              </optgroup>
            ) : null;
          })}
        </select>
      </label>
      <button type="submit" disabled={enviando || !camaId} className="text-sm px-3 py-1.5 rounded border hover:bg-gray-100 disabled:opacity-50">
        {enviando ? "Trasladando..." : "Trasladar"}
      </button>
      {error && <span className="text-sm text-red-600 w-full">{error}</span>}
    </form>
  );
}

function Egreso({ hosp, onHecho }) {
  const [abierto, setAbierto] = useState(false);
  const [tipo, setTipo] = useState("ALTA");
  const [resumen, setResumen] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);

  function egresar(e) {
    e.preventDefault();
    setEnviando(true);
    setError(null);
    client
      .post(`/hospitalizaciones/${hosp.id}/egreso`, { tipo_egreso: tipo, resumen })
      .then((r) => onHecho(r.data.message))
      .catch((err) => setError(mensajeError(err)))
      .finally(() => setEnviando(false));
  }

  if (!abierto) {
    return <button onClick={() => setAbierto(true)} className="text-sm px-4 py-1.5 rounded bg-green-700 text-white hover:bg-green-800">Dar egreso</button>;
  }
  return (
    <form onSubmit={egresar} className="border rounded-lg p-3 bg-green-50 border-green-200 space-y-2">
      <h4 className="text-sm font-semibold text-slate-700">Egreso</h4>
      <label className="text-sm block">Tipo de egreso
        <select value={tipo} onChange={(e) => setTipo(e.target.value)} className={`${campo} bg-white`}>
          {Object.entries(TIPOS_EGRESO).map(([v, t]) => <option key={v} value={v}>{t}</option>)}
        </select>
      </label>
      <label className="text-sm block">Resumen de egreso
        <textarea value={resumen} onChange={(e) => setResumen(e.target.value)} required rows={3} maxLength={2000}
          placeholder="Evolución, tratamiento al egreso y seguimiento" className={`${campo} bg-white`} />
      </label>
      <div className="flex items-center gap-2">
        <button type="submit" disabled={enviando} className="text-sm px-4 py-1.5 rounded bg-green-700 text-white hover:bg-green-800 disabled:opacity-50">
          {enviando ? "Registrando..." : "Confirmar egreso"}
        </button>
        <button type="button" onClick={() => setAbierto(false)} className="text-sm px-3 py-1.5 rounded border hover:bg-white">Cancelar</button>
        {error && <span className="text-sm text-red-600">{error}</span>}
      </div>
    </form>
  );
}

// Panel lateral con el detalle de una hospitalización: datos, notas y acciones según el puesto.
export default function DetalleHospitalizacion({ id, camas, permisos, onCerrar, onCambio }) {
  const [hosp, setHosp] = useState(null);
  const [error, setError] = useState(null);
  const [aviso, setAviso] = useState(null);

  const cargar = useCallback(() => {
    client
      .get(`/hospitalizaciones/${id}`)
      .then((r) => { setHosp(r.data.data); setError(null); })
      .catch((err) => setError(mensajeError(err)));
  }, [id]);

  useEffect(() => { cargar(); }, [cargar]);

  useEffect(() => {
    const cerrarConEscape = (e) => { if (e.key === "Escape") onCerrar(); };
    window.addEventListener("keydown", cerrarConEscape);
    return () => window.removeEventListener("keydown", cerrarConEscape);
  }, [onCerrar]);

  function hecho(mensaje) {
    setAviso(mensaje);
    cargar();
    onCambio();
  }

  const estado = hosp && (ESTADO_HOSPITALIZACION[hosp.estado] ?? { texto: hosp.estado, clase: "bg-gray-100" });
  const activo = hosp?.estado === "ACTIVO";

  return (
    <div className="fixed inset-0 z-30 flex justify-end" role="dialog" aria-modal="true" aria-label="Detalle de hospitalización">
      <div className="absolute inset-0 bg-slate-900/40" onClick={onCerrar} />
      <aside className="relative h-full w-full max-w-2xl bg-white shadow-xl overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-5 py-3 flex items-start justify-between gap-3 z-10">
          <div>
            <h2 className="text-lg font-bold text-slate-800">{hosp?.paciente ?? "Hospitalización"}</h2>
            {hosp && (
              <p className="text-sm text-slate-500">
                {hosp.cama ? `Cama ${hosp.cama} · ` : ""}{hosp.area}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {estado && <span className={`px-2 py-1 rounded text-xs font-medium ${estado.clase}`}>{estado.texto}</span>}
            <button onClick={onCerrar} className="rounded p-1.5 hover:bg-slate-100" aria-label="Cerrar">
              <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M5 5l10 10M15 5L5 15" /></svg>
            </button>
          </div>
        </div>

        <div className="p-5 space-y-5">
          {error && <p className="text-sm text-red-600">{error}</p>}
          {!hosp && !error && <p className="text-sm text-slate-400">Cargando...</p>}
          {aviso && <p className="text-sm text-green-800 bg-green-50 border border-green-200 rounded-lg px-3 py-2">{aviso}</p>}

          {hosp && (
            <>
              <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                <div><dt className="text-slate-500">Orden de ingreso</dt><dd className="text-slate-800">{fechaHora(hosp.fecha_orden)}</dd></div>
                <div><dt className="text-slate-500">Ingreso a cama</dt><dd className="text-slate-800">{fechaHora(hosp.fecha_ingreso)}</dd></div>
                <div><dt className="text-slate-500">Estancia</dt><dd className="text-slate-800">{textoDias(hosp.dias_estancia)}</dd></div>
                <div><dt className="text-slate-500">Médico</dt><dd className="text-slate-800">{hosp.medico ? `Dr(a). ${hosp.medico}` : "—"}</dd></div>
              </dl>

              {"diagnostico" in hosp && (
                <section className="space-y-1">
                  <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Diagnóstico de ingreso</h3>
                  <p className="text-slate-800">{hosp.diagnostico}</p>
                  {hosp.indicaciones && <p className="text-sm text-slate-600"><span className="font-medium">Indicaciones:</span> {hosp.indicaciones}</p>}
                </section>
              )}

              {hosp.estado === "EGRESADO" && "resumen_egreso" in hosp && (
                <section className="border rounded-lg p-3 bg-green-50 border-green-200 text-sm">
                  <p className="font-semibold text-green-900">{hosp.tipo_egreso_texto} · {fechaHora(hosp.fecha_egreso)}</p>
                  <p className="text-slate-700 mt-1">{hosp.resumen_egreso}</p>
                  {hosp.egresado_por && <p className="text-xs text-slate-500 mt-1">Dr(a). {hosp.egresado_por}</p>}
                </section>
              )}

              {activo && (permisos.ordenar || permisos.camas) && (
                <section className="space-y-3">
                  {permisos.camas && <Traslado hosp={hosp} camas={camas} onHecho={hecho} />}
                  {permisos.ordenar && <Egreso hosp={hosp} onHecho={hecho} />}
                </section>
              )}

              {"notas" in hosp && (
                <section className="space-y-3">
                  <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Notas y signos vitales</h3>
                  {activo && permisos.notas && <FormularioNota id={hosp.id} onGuardada={() => hecho("Nota registrada.")} />}
                  {hosp.notas.length === 0 && <p className="text-sm text-slate-500">Sin notas registradas.</p>}
                  <ol className="space-y-3">
                    {hosp.notas.map((n) => (
                      <li key={n.id} className={`border-l-4 pl-3 ${n.puesto === "Médico" ? "border-blue-300" : "border-emerald-300"}`}>
                        <p className="text-xs text-slate-500">{fechaHora(n.fecha)} · {n.puesto}{n.autor ? ` · ${n.autor}` : ""}</p>
                        <p className="text-sm text-slate-800">{n.nota}</p>
                        <SignosVitales nota={n} />
                      </li>
                    ))}
                  </ol>
                </section>
              )}

              {permisos.verPaciente && (
                <Link to={`/pacientes/${hosp.paciente_id}`} className="inline-block text-sm text-blue-700 hover:underline">Ver ficha del paciente →</Link>
              )}
            </>
          )}
        </div>
      </aside>
    </div>
  );
}
