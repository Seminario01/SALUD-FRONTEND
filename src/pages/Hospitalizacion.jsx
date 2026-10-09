import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import client, { mensajeError } from "../api/client";
import useRoles from "../hooks/useRoles";
import usePacientesSeleccionables from "../hooks/usePacientesSeleccionables";
import DetalleHospitalizacion from "../components/DetalleHospitalizacion";
import { AREAS, ESTADO_CAMA, TIPOS_EGRESO, fechaHora, haceCuanto, textoDias } from "../utils/hospitalizacion";

const campo = "border rounded px-3 py-1.5 w-full";

function FormularioIngreso({ pacienteInicial, onCreado, onCerrar }) {
  const { pacientes } = usePacientesSeleccionables(true);
  const [pacienteId, setPacienteId] = useState(pacienteInicial || "");
  const [area, setArea] = useState(AREAS[0]);
  const [atenciones, setAtenciones] = useState([]);
  const [expedienteId, setExpedienteId] = useState("");
  const [diagnostico, setDiagnostico] = useState("");
  const [indicaciones, setIndicaciones] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!pacienteId) return;
    client.get(`/expedientes/${pacienteId}`).then((r) => setAtenciones(r.data.data)).catch(() => setAtenciones([]));
  }, [pacienteId]);

  function cambiarPaciente(valor) {
    setPacienteId(valor);
    setExpedienteId("");
    if (!valor) setAtenciones([]);
  }

  function elegirAtencion(valor) {
    setExpedienteId(valor);
    const atencion = atenciones.find((a) => String(a.id) === valor);
    if (atencion && !diagnostico) setDiagnostico(atencion.diagnostico);
  }

  function enviar(e) {
    e.preventDefault();
    setEnviando(true);
    setError(null);
    client
      .post("/hospitalizaciones", {
        paciente_id: Number(pacienteId), area, diagnostico, indicaciones,
        expediente_id: expedienteId ? Number(expedienteId) : undefined,
      })
      .then((r) => onCreado(`Ingreso ordenado para ${r.data.data.paciente}. Enfermería asignará la cama.`))
      .catch((err) => setError(mensajeError(err)))
      .finally(() => setEnviando(false));
  }

  return (
    <form onSubmit={enviar} className="bg-white border rounded-lg p-4 shadow-sm mb-6">
      <h2 className="font-bold text-gray-700 mb-3">Ordenar ingreso</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <label className="text-sm">Paciente *
          <select value={pacienteId} onChange={(e) => cambiarPaciente(e.target.value)} required className={campo}>
            <option value="">Seleccione...</option>
            {pacientes.map((p) => <option key={p.id} value={p.id}>{p.nombre_completo} (CUI {p.cui})</option>)}
          </select>
        </label>
        <label className="text-sm">Área *
          <select value={area} onChange={(e) => setArea(e.target.value)} className={campo}>
            {AREAS.map((a) => <option key={a}>{a}</option>)}
          </select>
        </label>
        <label className="text-sm">Atención del expediente
          <select value={expedienteId} onChange={(e) => elegirAtencion(e.target.value)} disabled={!pacienteId} className={campo}>
            <option value="">Sin asociar</option>
            {atenciones.map((a) => <option key={a.id} value={a.id}>{String(a.fecha_atencion).slice(0, 10)} — {a.diagnostico}</option>)}
          </select>
        </label>
        <label className="text-sm md:col-span-3">Diagnóstico de ingreso *
          <input value={diagnostico} onChange={(e) => setDiagnostico(e.target.value)} required maxLength={500} className={campo} />
        </label>
        <label className="text-sm md:col-span-3">Indicaciones
          <textarea value={indicaciones} onChange={(e) => setIndicaciones(e.target.value)} rows={2} maxLength={2000}
            placeholder="Tratamiento, dieta, controles" className={campo} />
        </label>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <button type="submit" disabled={enviando} className="bg-blue-700 text-white px-4 py-1.5 rounded hover:bg-blue-800 disabled:opacity-50">
          {enviando ? "Guardando..." : "Ordenar ingreso"}
        </button>
        <button type="button" onClick={onCerrar} className="px-4 py-1.5 rounded border hover:bg-gray-100">Cancelar</button>
        {error && <span className="text-sm text-red-600">{error}</span>}
      </div>
    </form>
  );
}

function OrdenPendiente({ orden, camas, permisos, clinico, onCambio }) {
  const [camaId, setCamaId] = useState("");
  const [anulando, setAnulando] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);
  const disponibles = camas.filter((c) => c.area === orden.area && c.estado === "DISPONIBLE");

  function accion(peticion, mensaje) {
    setEnviando(true);
    setError(null);
    peticion
      .then((r) => onCambio(mensaje ?? r.data.message))
      .catch((err) => setError(mensajeError(err)))
      .finally(() => setEnviando(false));
  }

  return (
    <article className="bg-white border border-yellow-300 rounded-lg p-4 shadow-sm" data-orden={orden.id}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-slate-800">{orden.paciente}</p>
          <p className="text-sm text-slate-500">
            {orden.area} · {orden.medico ? `Dr(a). ${orden.medico} · ` : ""}{haceCuanto(orden.fecha_orden)}
          </p>
          {clinico && <p className="text-sm text-slate-700 mt-1">{orden.diagnostico}</p>}
        </div>
        <span className="px-2 py-1 rounded text-xs font-medium bg-yellow-100 text-yellow-800">Pendiente de cama</span>
      </div>

      {(permisos.camas || permisos.ordenar) && (
        <div className="flex flex-wrap items-center gap-2 mt-3">
          {permisos.camas && (
            disponibles.length ? (
              <>
                <select value={camaId} onChange={(e) => setCamaId(e.target.value)} className="border rounded px-2 py-1.5 text-sm" aria-label={`Cama para ${orden.paciente}`}>
                  <option value="">Cama disponible...</option>
                  {disponibles.map((c) => <option key={c.id} value={c.id}>{c.codigo}</option>)}
                </select>
                <button onClick={() => accion(client.post(`/hospitalizaciones/${orden.id}/asignar-cama`, { cama_id: Number(camaId) }))}
                  disabled={!camaId || enviando} className="text-sm px-3 py-1.5 rounded bg-blue-700 text-white hover:bg-blue-800 disabled:opacity-50">
                  Asignar cama
                </button>
              </>
            ) : (
              <span className="text-sm text-red-700">Sin camas disponibles en {orden.area}</span>
            )
          )}
          {permisos.ordenar && !anulando && (
            <button onClick={() => setAnulando(true)} className="text-xs px-3 py-1.5 rounded border text-red-700 hover:bg-red-50 ml-auto">Anular orden</button>
          )}
          {permisos.ordenar && anulando && (
            <form className="flex flex-wrap items-center gap-2 ml-auto" onSubmit={(e) => {
              e.preventDefault();
              accion(client.post(`/hospitalizaciones/${orden.id}/anular`, { motivo }), `Orden de ${orden.paciente} anulada.`);
            }}>
              <input value={motivo} onChange={(e) => setMotivo(e.target.value)} required maxLength={255} placeholder="Motivo"
                className="border rounded px-2 py-1 text-sm w-56" aria-label="Motivo de la anulación" />
              <button type="submit" disabled={enviando} className="text-xs px-3 py-1.5 rounded border text-red-700 hover:bg-red-50">Confirmar</button>
              <button type="button" onClick={() => setAnulando(false)} className="text-xs px-3 py-1.5 rounded border hover:bg-gray-100">Cancelar</button>
            </form>
          )}
        </div>
      )}
      {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
    </article>
  );
}

function CensoArea({ area, camas, onElegir, seleccionada }) {
  const disponibles = camas.filter((c) => c.estado === "DISPONIBLE").length;
  return (
    <section className="mb-5" aria-label={`Camas de ${area}`}>
      <div className="flex items-baseline justify-between mb-2">
        <h3 className="font-semibold text-slate-700">{area}</h3>
        <p className="text-sm text-slate-500"><span className="font-semibold text-slate-700">{disponibles}</span> disponibles de {camas.length}</p>
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-2">
        {camas.map((c) => {
          const e = ESTADO_CAMA[c.estado] ?? ESTADO_CAMA.MANTENIMIENTO;
          return (
            <button key={c.id} onClick={() => onElegir(c)} data-cama={c.codigo}
              aria-label={`Cama ${c.codigo}: ${e.texto}${c.paciente ? `, ${c.paciente}` : ""}`}
              className={`text-left border rounded-lg px-2 py-1.5 min-h-16 transition hover:shadow ${e.tarjeta} ${seleccionada === c.id ? "ring-2 ring-blue-600" : ""}`}>
              <span className="block text-xs font-bold tabular-nums">{c.codigo}</span>
              <span className="block text-[11px] leading-tight truncate" title={c.paciente ?? c.observacion ?? e.texto}>
                {c.paciente ? c.paciente.split(" ").slice(0, 2).join(" ") : e.texto}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function AccionesCama({ cama, onCambio, onCerrar }) {
  const [observacion, setObservacion] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);
  const e = ESTADO_CAMA[cama.estado];

  function cambiar(estado) {
    setEnviando(true);
    setError(null);
    client
      .put(`/camas/${cama.id}`, { estado, observacion })
      .then(() => onCambio(`Cama ${cama.codigo}: ${ESTADO_CAMA[estado].texto.toLowerCase()}.`))
      .catch((err) => setError(mensajeError(err)))
      .finally(() => setEnviando(false));
  }

  const boton = "text-sm px-3 py-1.5 rounded border hover:bg-white disabled:opacity-50";
  return (
    <div className="flex flex-wrap items-center gap-2 bg-slate-50 border rounded-lg px-3 py-2 mb-5">
      <span className="text-sm font-semibold text-slate-700">Cama {cama.codigo}</span>
      <span className="text-sm text-slate-500">· {e.texto}{cama.observacion ? ` (${cama.observacion})` : ""}</span>
      <div className="flex flex-wrap items-center gap-2 ml-auto">
        {cama.estado === "LIMPIEZA" && <button disabled={enviando} onClick={() => cambiar("DISPONIBLE")} className={boton}>Marcar disponible</button>}
        {cama.estado === "MANTENIMIENTO" && <button disabled={enviando} onClick={() => cambiar("DISPONIBLE")} className={boton}>Habilitar</button>}
        {cama.estado !== "MANTENIMIENTO" && (
          <>
            <input value={observacion} onChange={(ev) => setObservacion(ev.target.value)} maxLength={200} placeholder="Motivo"
              className="border rounded px-2 py-1 text-sm w-48 bg-white" aria-label="Motivo del mantenimiento" />
            <button disabled={enviando} onClick={() => cambiar("MANTENIMIENTO")} className={boton}>Enviar a mantenimiento</button>
          </>
        )}
        <button onClick={onCerrar} className="text-sm px-2 py-1.5 rounded hover:bg-white" aria-label="Cerrar">✕</button>
      </div>
      {error && <p className="text-sm text-red-600 w-full">{error}</p>}
    </div>
  );
}

function AgregarCama({ onCreada }) {
  const [abierto, setAbierto] = useState(false);
  const [codigo, setCodigo] = useState("");
  const [area, setArea] = useState(AREAS[0]);
  const [error, setError] = useState(null);

  function enviar(e) {
    e.preventDefault();
    setError(null);
    client
      .post("/camas", { codigo, area })
      .then((r) => { setCodigo(""); setAbierto(false); onCreada(`Cama ${r.data.data.codigo} agregada a ${area}.`); })
      .catch((err) => setError(mensajeError(err)));
  }

  if (!abierto) return <button onClick={() => setAbierto(true)} className="text-sm px-3 py-1.5 rounded border hover:bg-gray-100">Agregar cama</button>;
  return (
    <form onSubmit={enviar} className="flex flex-wrap items-center gap-2">
      <input value={codigo} onChange={(e) => setCodigo(e.target.value)} required maxLength={20} placeholder="GEN-21" className="border rounded px-2 py-1 text-sm w-28" aria-label="Código de la cama" />
      <select value={area} onChange={(e) => setArea(e.target.value)} className="border rounded px-2 py-1 text-sm" aria-label="Área de la cama">
        {AREAS.map((a) => <option key={a}>{a}</option>)}
      </select>
      <button type="submit" className="text-sm px-3 py-1 rounded bg-blue-700 text-white hover:bg-blue-800">Agregar</button>
      <button type="button" onClick={() => setAbierto(false)} className="text-sm px-2 py-1 rounded border hover:bg-gray-100">Cancelar</button>
      {error && <span className="text-sm text-red-600 w-full">{error}</span>}
    </form>
  );
}

function Tarjeta({ titulo, valor, detalle, color }) {
  return (
    <div className="bg-white border rounded-lg p-4 shadow-sm">
      <p className="text-sm text-gray-500">{titulo}</p>
      <p className={`text-3xl font-bold ${color}`}>{valor}</p>
      {detalle && <p className="text-xs text-gray-400 mt-1">{detalle}</p>}
    </div>
  );
}

export default function Hospitalizacion() {
  const { puede } = useRoles();
  const [params] = useSearchParams();
  const permisos = {
    ordenar: puede("hospitalizacion.ordenar"),
    camas: puede("hospitalizacion.camas"),
    notas: puede("hospitalizacion.notas"),
    verPaciente: puede("pacientes.ver"),
  };
  const clinico = puede("expediente.ver");
  const gestionaCamas = permisos.camas || puede("recursos.gestionar");

  const [camas, setCamas] = useState([]);
  const [lista, setLista] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [aviso, setAviso] = useState(null);
  const [pestana, setPestana] = useState("curso");
  const [ordenando, setOrdenando] = useState(Boolean(params.get("paciente")));
  const [detalle, setDetalle] = useState(null);
  const [camaSel, setCamaSel] = useState(null);

  const cargar = useCallback(() => {
    Promise.all([client.get("/camas"), client.get("/hospitalizaciones")])
      .then(([c, h]) => { setCamas(c.data.data); setLista(h.data.data); setError(null); })
      .catch((err) => setError(mensajeError(err)))
      .finally(() => setCargando(false));
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  function cambio(mensaje) {
    setAviso(mensaje);
    setCamaSel(null);
    cargar();
  }

  function elegirCama(c) {
    if (c.hospitalizacion_id) { setDetalle(c.hospitalizacion_id); return; }
    if (gestionaCamas) setCamaSel(camaSel === c.id ? null : c.id);
  }

  if (cargando) return <p className="p-6">Cargando...</p>;
  if (error) return <p className="p-6 text-red-600">No se pudo cargar Hospitalización: {error}</p>;

  const pendientes = lista.filter((h) => h.estado === "PENDIENTE");
  const activos = lista.filter((h) => h.estado === "ACTIVO").sort((a, b) => String(a.cama).localeCompare(String(b.cama)));
  const egresos = lista.filter((h) => h.estado === "EGRESADO");
  const disponibles = camas.filter((c) => c.estado === "DISPONIBLE").length;
  const ocupadas = camas.filter((c) => c.estado === "OCUPADA").length;
  const cama = camas.find((c) => c.id === camaSel);

  const tab = (valor, texto) => (
    <button onClick={() => setPestana(valor)} role="tab" aria-selected={pestana === valor}
      className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${pestana === valor ? "border-blue-700 text-blue-700" : "border-transparent text-slate-500 hover:text-slate-700"}`}>
      {texto}
    </button>
  );

  return (
    <div className="p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h1 className="text-2xl font-bold text-gray-800">Hospitalización</h1>
        {permisos.ordenar && !ordenando && (
          <button onClick={() => { setOrdenando(true); setAviso(null); }} className="bg-blue-700 text-white px-4 py-1.5 rounded hover:bg-blue-800">Ordenar ingreso</button>
        )}
      </div>

      {ordenando && permisos.ordenar && (
        <FormularioIngreso pacienteInicial={params.get("paciente") ?? ""} onCerrar={() => setOrdenando(false)}
          onCreado={(m) => { setOrdenando(false); cambio(m); }} />
      )}
      {aviso && <p className="mb-4 text-sm text-green-800 bg-green-50 border border-green-200 rounded-lg px-3 py-2">{aviso}</p>}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Tarjeta titulo="Pacientes hospitalizados" valor={activos.length} color="text-blue-700" />
        <Tarjeta titulo="Órdenes pendientes de cama" valor={pendientes.length} color={pendientes.length ? "text-yellow-600" : "text-slate-700"} />
        <Tarjeta titulo="Camas disponibles" valor={<>{disponibles} <span className="text-sm text-gray-400 font-normal">/ {camas.length}</span></>} color="text-green-700" />
        <Tarjeta titulo="Ocupación" valor={`${camas.length ? Math.round((ocupadas * 100) / camas.length) : 0} %`} color="text-slate-700"
          detalle={`${ocupadas} ocupadas, ${camas.length - ocupadas - disponibles} en limpieza o mantenimiento`} />
      </div>

      <div className="border-b mb-5 flex" role="tablist">
        {tab("curso", "En curso")}
        {tab("egresos", `Egresos (${egresos.length})`)}
      </div>

      {pestana === "curso" && (
        <>
          {pendientes.length > 0 && (
            <section className="mb-6">
              <h2 className="text-lg font-bold text-gray-700 mb-3">Órdenes de ingreso pendientes</h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {pendientes.map((o) => (
                  <OrdenPendiente key={o.id} orden={o} camas={camas} permisos={permisos} clinico={clinico} onCambio={cambio} />
                ))}
              </div>
            </section>
          )}

          <section className="mb-6">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
              <h2 className="text-lg font-bold text-gray-700">Censo de camas</h2>
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
                {Object.entries(ESTADO_CAMA).map(([k, e]) => (
                  <span key={k} className="flex items-center gap-1.5"><span className={`h-2.5 w-2.5 rounded-full ${e.punto}`} />{e.texto}</span>
                ))}
                {puede("recursos.gestionar") && <AgregarCama onCreada={cambio} />}
              </div>
            </div>
            {cama && gestionaCamas && cama.estado !== "OCUPADA" && (
              <AccionesCama key={cama.id} cama={cama} onCambio={cambio} onCerrar={() => setCamaSel(null)} />
            )}
            {camas.length === 0 && <p className="text-sm text-slate-500">No hay camas registradas.</p>}
            {AREAS.map((area) => {
              const delArea = camas.filter((c) => c.area === area);
              return delArea.length ? <CensoArea key={area} area={area} camas={delArea} onElegir={elegirCama} seleccionada={camaSel} /> : null;
            })}
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-700 mb-3">Pacientes hospitalizados</h2>
            {activos.length === 0 ? <p className="text-sm text-slate-500">No hay pacientes hospitalizados.</p> : (
              <div className="bg-white border rounded-lg shadow-sm overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b bg-gray-100 text-sm">
                      <th className="p-2">Cama</th><th className="p-2">Paciente</th><th className="p-2">Área</th>
                      <th className="p-2">Ingreso</th><th className="p-2">Estancia</th>
                      {clinico && <th className="p-2">Diagnóstico</th>}
                      <th className="p-2">Médico</th><th className="p-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {activos.map((h) => (
                      <tr key={h.id} className="border-b last:border-0 hover:bg-gray-50">
                        <td className="p-2 font-semibold tabular-nums whitespace-nowrap">{h.cama}</td>
                        <td className="p-2 text-slate-800">{h.paciente}</td>
                        <td className="p-2 text-sm text-slate-600">{h.area}</td>
                        <td className="p-2 text-sm text-slate-600">{fechaHora(h.fecha_ingreso)}</td>
                        <td className="p-2 text-sm tabular-nums">{textoDias(h.dias_estancia)}</td>
                        {clinico && <td className="p-2 text-sm text-slate-700">{h.diagnostico}</td>}
                        <td className="p-2 text-sm text-slate-600 whitespace-nowrap">{h.medico ? `Dr(a). ${h.medico}` : "—"}</td>
                        <td className="p-2 text-right">
                          <button onClick={() => setDetalle(h.id)} className="text-xs px-2 py-1 rounded border hover:bg-gray-100 whitespace-nowrap">Ver detalle</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}

      {pestana === "egresos" && (
        egresos.length === 0 ? <p className="text-sm text-slate-500">No hay egresos registrados.</p> : (
          <div className="bg-white border rounded-lg shadow-sm overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b bg-gray-100 text-sm">
                  <th className="p-2">Paciente</th><th className="p-2">Área y cama</th><th className="p-2">Ingreso</th>
                  <th className="p-2">Egreso</th><th className="p-2">Estancia</th>
                  {clinico && <th className="p-2">Tipo de egreso</th>}
                  <th className="p-2"></th>
                </tr>
              </thead>
              <tbody>
                {egresos.map((h) => (
                  <tr key={h.id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="p-2 text-slate-800">{h.paciente}</td>
                    <td className="p-2 text-sm text-slate-600">{h.area} · {h.cama}</td>
                    <td className="p-2 text-sm text-slate-600">{fechaHora(h.fecha_ingreso)}</td>
                    <td className="p-2 text-sm text-slate-600">{fechaHora(h.fecha_egreso)}</td>
                    <td className="p-2 text-sm tabular-nums">{textoDias(h.dias_estancia)}</td>
                    {clinico && <td className="p-2 text-sm">{TIPOS_EGRESO[h.tipo_egreso] ?? "—"}</td>}
                    <td className="p-2 text-right">
                      <button onClick={() => setDetalle(h.id)} className="text-xs px-2 py-1 rounded border hover:bg-gray-100 whitespace-nowrap">Ver detalle</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {detalle && (
        <DetalleHospitalizacion id={detalle} camas={camas} permisos={permisos}
          onCerrar={() => setDetalle(null)} onCambio={cargar} />
      )}
    </div>
  );
}
