import { useCallback, useEffect, useMemo, useState } from "react";
import client, { mensajeError } from "../api/client";
import useRoles from "../hooks/useRoles";
import usePacientesSeleccionables from "../hooks/usePacientesSeleccionables";
import usePaginacion from "../hooks/usePaginacion";
import BuscadorPaciente from "../components/BuscadorPaciente";
import Paginacion from "../components/Paginacion";
import PanelPaciente from "../components/PanelPaciente";
import BotonesExportar from "../components/Exportar";
import { QuitarFiltros, RangoEdad, SelectFiltro, campoFiltro } from "../components/Filtros";
import { coincidePaciente, edadDe, enRangoEdad, sinTildes } from "../utils/filtros";
import { Link } from "react-router-dom";
import { useAvisos } from "../components/Avisos";

const formatoFechaHora = (texto) => {
  const f = new Date(String(texto).replace(" ", "T"));
  return isNaN(f) ? texto : f.toLocaleString("es-GT", { dateStyle: "medium", timeStyle: "short" });
};

const Si = ({ valor }) => (
  <span className={`px-2 py-0.5 rounded text-sm ${valor ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}`}>
    {valor ? "Sí" : "No"}
  </span>
);

function datosDe(registro) {
  return {
    es_estudiante: registro?.es_estudiante ?? false,
    esquema_completo: registro?.esquema_completo ?? false,
    vacunas_pendientes: registro?.vacunas_pendientes ?? "",
  };
}

function FormularioVacunacion({ pacientes, registros, seleccionInicial, onGuardado }) {
  const buscar = (id) => registros.find((r) => String(r.paciente_id) === String(id));
  // seleccionInicial viene del botón "Editar"; el padre cambia la "key" para
  // reiniciar este formulario con los datos de ese paciente.
  const [pacienteId, setPacienteId] = useState(seleccionInicial ? String(seleccionInicial) : "");
  const [datos, setDatos] = useState(() => datosDe(buscar(seleccionInicial)));
  const existente = buscar(pacienteId);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);
  const avisos = useAvisos();

  function elegirPaciente(id) {
    setPacienteId(id);
    setDatos(datosDe(buscar(id)));
    setError(null);
    setEducacion(null);
  }

  // --- Consulta al módulo de Educación: ¿el paciente es estudiante? ---
  const [educacion, setEducacion] = useState(null);
  const cui = pacientes.find((p) => String(p.id) === String(pacienteId))?.cui;

  function verificarEducacion() {
    setEducacion({ cargando: true });
    client
      .get(`/educacion/estudiantes/${encodeURIComponent(cui)}`)
      .then((res) => {
        const d = res.data.data;
        setEducacion({ datos: d });
        setDatos((actual) => ({ ...actual, es_estudiante: Boolean(d.esEstudiante) }));
      })
      .catch((err) => setEducacion({ error: mensajeError(err) }));
  }

  function enviar(e) {
    e.preventDefault();
    setEnviando(true);
    setError(null);
    const peticion = existente
      ? client.put(`/vacunacion/${pacienteId}`, datos)
      : client.post("/vacunacion", { paciente_id: Number(pacienteId), ...datos });
    peticion
      .then(() => {
        avisos.exito(existente ? "Registro actualizado." : "Registro de vacunación creado.");
        onGuardado();
      })
      .catch((err) => setError(mensajeError(err)))
      .finally(() => setEnviando(false));
  }

  const campo = "border rounded px-3 py-1.5 w-full";
  return (
    <form onSubmit={enviar} className="bg-white border rounded-lg p-4 shadow-sm mb-6">
      <h2 className="font-bold text-gray-700 mb-3">
        {existente ? "Actualizar vacunación" : "Registrar vacunación"}
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
        <label className="text-sm">
          Paciente *
          <BuscadorPaciente pacientes={pacientes} valor={pacienteId} onCambio={elegirPaciente} requerido />
        </label>
        <label className="text-sm flex items-center gap-2 pb-2">
          <input
            type="checkbox"
            checked={datos.es_estudiante}
            onChange={(e) => setDatos({ ...datos, es_estudiante: e.target.checked })}
          />
          Es estudiante
          {pacienteId && (
            <button
              type="button"
              onClick={verificarEducacion}
              disabled={!cui || educacion?.cargando}
              title={cui ? "Consultar al módulo de Educación" : "El paciente no tiene CUI registrado"}
              className="ml-2 text-xs px-2 py-0.5 rounded border hover:bg-gray-100 disabled:opacity-40"
            >
              {educacion?.cargando ? "Consultando..." : "Verificar en Educación"}
            </button>
          )}
        </label>
        <label className="text-sm flex items-center gap-2 pb-2">
          <input
            type="checkbox"
            checked={datos.esquema_completo}
            onChange={(e) => setDatos({ ...datos, esquema_completo: e.target.checked })}
          />
          Esquema completo
        </label>
        {educacion && !educacion.cargando && (
          <p className={`text-sm md:col-span-3 rounded-lg px-3 py-2 ${educacion.error ? "bg-slate-50 text-slate-600" : educacion.datos?.esEstudiante ? "bg-blue-50 text-blue-800" : "bg-slate-50 text-slate-600"}`}>
            {educacion.error
              ? educacion.error
              : educacion.datos.esEstudiante
                ? `Educación: estudiante de ${educacion.datos.establecimiento ?? "—"} · ${educacion.datos.grado ?? ""} ${educacion.datos.seccion ? `sección ${educacion.datos.seccion}` : ""} · jornada ${educacion.datos.jornada ?? "—"}`
                : "Educación: el CUI no corresponde a un estudiante activo."}
          </p>
        )}
        <label className="text-sm md:col-span-3">
          Vacunas pendientes
          <input
            value={datos.vacunas_pendientes}
            onChange={(e) => setDatos({ ...datos, vacunas_pendientes: e.target.value })}
            maxLength={2000}
            placeholder="Ej.: Refuerzo COVID, Influenza"
            className={campo}
          />
        </label>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <button
          type="submit"
          disabled={enviando || !pacienteId}
          className="bg-blue-700 text-white px-4 py-1.5 rounded hover:bg-blue-800 disabled:opacity-50"
        >
          {enviando ? "Guardando..." : existente ? "Actualizar" : "Registrar"}
        </button>
        {error && <span className="text-sm text-red-600">{error}</span>}
      </div>
    </form>
  );
}

// ---------- Vista del ciudadano: solo su propio registro ----------
function MiVacunacion() {
  const { pacientes, aviso } = usePacientesSeleccionables(false);
  const [registro, setRegistro] = useState(undefined);
  const miId = pacientes[0]?.id;

  useEffect(() => {
    if (!miId) return;
    client
      .get(`/vacunacion/${miId}`)
      .then((res) => setRegistro(res.data.data))
      .catch(() => setRegistro(null));
  }, [miId]);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-4">Mi vacunación</h1>
      {aviso && <p className="text-sm text-gray-600 bg-yellow-50 border border-yellow-200 rounded p-3">{aviso}</p>}
      {registro === null && <p className="text-gray-500 text-sm">Todavía no tiene registro de vacunación.</p>}
      {registro && (
        <div className="bg-white border rounded-lg p-4 shadow-sm max-w-md space-y-2 text-sm">
          <p>Esquema completo: <Si valor={registro.esquema_completo} /></p>
          <p>Estudiante: {registro.es_estudiante ? "Sí" : "No"}</p>
          <p>Vacunas pendientes: {registro.vacunas_pendientes || "Ninguna"}</p>
        </div>
      )}
    </div>
  );
}

export default function Vacunacion() {
  const { puede } = useRoles();
  if (!puede("vacunacion.ver")) return <MiVacunacion />;
  return <VacunacionPersonal registra={puede("vacunacion.registrar")} anula={puede("vacunacion.anular")} />;
}

const SIN_FILTROS = { texto: "", edadDesde: "", edadHasta: "", genero: "", estudiante: "", esquema: "", pendiente: "" };

const ESQUEMAS = [
  ["completo", "Completo"],
  ["incompleto", "Incompleto"],
  ["sin_registro", "Sin registro de vacunación"],
];

function cumpleFiltros({ paciente, registro }, f) {
  if (!coincidePaciente(paciente, f.texto)) return false;
  if (!enRangoEdad(paciente?.fecha_nacimiento, f.edadDesde, f.edadHasta)) return false;
  if (f.genero && paciente?.genero !== f.genero) return false;
  if (f.esquema === "sin_registro") return !registro;
  if (!registro) return false;
  if (f.esquema === "completo" && !registro.esquema_completo) return false;
  if (f.esquema === "incompleto" && registro.esquema_completo) return false;
  if (f.estudiante && registro.es_estudiante !== (f.estudiante === "si")) return false;
  if (f.pendiente && !sinTildes(registro.vacunas_pendientes).includes(sinTildes(f.pendiente).trim())) return false;
  return true;
}

function Resumen({ etiqueta, valor, activo, onClick }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={activo}
      className={`rounded-lg border px-3 py-2 text-left min-w-28 ${activo ? "border-blue-700 ring-2 ring-blue-200 bg-blue-50" : "bg-white hover:bg-slate-50"}`}>
      <span className="block text-xs text-slate-500">{etiqueta}</span>
      <span className="block text-xl font-semibold tabular-nums text-slate-800">{valor}</span>
    </button>
  );
}

function VacunacionPersonal({ registra, anula }) {
  const { pacientes } = usePacientesSeleccionables(true);
  const [registros, setRegistros] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [errorAccion, setErrorAccion] = useState(null);
  const [editar, setEditar] = useState(null);
  const [f, setF] = useState(SIN_FILTROS);
  const [abierto, setAbierto] = useState(null);   // paciente_id del panel de detalle
  const cerrarPanel = useCallback(() => setAbierto(null), []);

  const cargar = useCallback(() => {
    client
      .get("/vacunacion")
      .then((res) => {
        setRegistros(res.data.data);
        setError(null);
      })
      .catch((err) => setError(mensajeError(err)))
      .finally(() => setCargando(false));
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const porId = useMemo(() => new Map(pacientes.map((p) => [p.id, p])), [pacientes]);
  const nombre = (id) => porId.get(id)?.nombre_completo ?? `ID ${id}`;
  const avisos = useAvisos();

  // Cada fila: el paciente y su registro (o null si se buscan los que no tienen registro)
  const filas = useMemo(() => {
    const conRegistro = registros.map((r) => ({ id: r.paciente_id, paciente: porId.get(r.paciente_id), registro: r }));
    const conId = new Set(registros.map((r) => r.paciente_id));
    const sinRegistro = pacientes.filter((p) => !conId.has(p.id)).map((p) => ({ id: p.id, paciente: p, registro: null }));
    const todas = f.esquema === "sin_registro" ? sinRegistro : conRegistro;
    return todas
      .filter((fila) => cumpleFiltros(fila, f))
      // Por nombre; los registros sin paciente en la lista van al final
      .sort((a, b) => (!a.paciente - !b.paciente)
        || (a.paciente?.nombre_completo ?? "").localeCompare(b.paciente?.nombre_completo ?? "", "es"));
  }, [registros, pacientes, porId, f]);
  const pag = usePaginacion(filas, 15, JSON.stringify(f));
  const hayFiltros = Object.values(f).some(Boolean);
  const cambiar = (c) => setF((actual) => ({ ...actual, ...c }));

  const totales = useMemo(() => ({
    todos: registros.length,
    completos: registros.filter((r) => r.esquema_completo).length,
    incompletos: registros.filter((r) => !r.esquema_completo).length,
    sinRegistro: Math.max(0, pacientes.length - new Set(registros.map((r) => r.paciente_id)).size),
  }), [registros, pacientes]);

  function editarPaciente(id) {
    setAbierto(null);
    setEditar(id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function eliminar(r) {
    const si = await avisos.confirmar({
      titulo: `¿Anular el registro de vacunación de ${nombre(r.paciente_id)}?`,
      mensaje: ["Use esta opción solo si el registro se creó por error.", "Se borra el registro del paciente y no se puede deshacer."],
      confirmar: "Sí, anular", peligro: true,
    });
    if (!si) return;
    setErrorAccion(null);
    setAbierto(null);
    client.delete(`/vacunacion/${r.paciente_id}`)
      .then(() => { avisos.exito(`Registro de vacunación de ${nombre(r.paciente_id)} anulado.`); cargar(); })
      .catch((err) => setErrorAccion(mensajeError(err)));
  }

  if (cargando) return <p className="p-6">Cargando...</p>;

  const filaAbierta = abierto !== null && {
    paciente: porId.get(abierto),
    registro: registros.find((r) => r.paciente_id === abierto) ?? null,
  };
  const boton = "text-xs px-2 py-1 rounded border hover:bg-gray-100";
  const constancia = (id) => (
    <Link to={`/imprimir/vacunacion/${id}`} className="inline-flex items-center gap-1 text-xs text-blue-700 hover:underline whitespace-nowrap">
      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v7H6z" /></svg> PDF
    </Link>
  );

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-4">Vacunación</h1>

      {registra ? (
        <FormularioVacunacion
          key={editar ?? "nuevo"}
          pacientes={pacientes}
          registros={registros}
          seleccionInicial={editar}
          onGuardado={cargar}
        />
      ) : null}

      {error && <p className="mb-4 text-red-600 text-sm">No se pudieron cargar los registros: {error}</p>}
      {errorAccion && <p className="mb-4 text-red-600 text-sm">{errorAccion}</p>}

      {!error && (
        <>
          <div className="flex flex-wrap gap-2 mb-4">
            <Resumen etiqueta="Con registro" valor={totales.todos} activo={!f.esquema} onClick={() => cambiar({ esquema: "" })} />
            <Resumen etiqueta="Esquema completo" valor={totales.completos} activo={f.esquema === "completo"} onClick={() => cambiar({ esquema: "completo" })} />
            <Resumen etiqueta="Esquema incompleto" valor={totales.incompletos} activo={f.esquema === "incompleto"} onClick={() => cambiar({ esquema: "incompleto" })} />
            <Resumen etiqueta="Sin registro" valor={totales.sinRegistro} activo={f.esquema === "sin_registro"} onClick={() => cambiar({ esquema: "sin_registro" })} />
          </div>

          <div className="flex flex-wrap items-end gap-3 mb-3">
            <label className="text-sm">Buscar
              <input value={f.texto} onChange={(e) => cambiar({ texto: e.target.value })} placeholder="Nombre o DPI"
                className={`${campoFiltro} w-52`} />
            </label>
            <RangoEdad desde={f.edadDesde} hasta={f.edadHasta} onCambio={({ desde, hasta }) => cambiar({ edadDesde: desde, edadHasta: hasta })} />
            <SelectFiltro etiqueta="Género" valor={f.genero} onCambio={(v) => cambiar({ genero: v })}
              opciones={[["F", "Femenino"], ["M", "Masculino"]]} />
            <SelectFiltro etiqueta="Esquema" valor={f.esquema} onCambio={(v) => cambiar({ esquema: v })} opciones={ESQUEMAS} />
            {f.esquema !== "sin_registro" && (
              <>
                <SelectFiltro etiqueta="Estudiante" valor={f.estudiante} onCambio={(v) => cambiar({ estudiante: v })}
                  opciones={[["si", "Sí"], ["no", "No"]]} />
                <label className="text-sm">Vacuna pendiente
                  <input value={f.pendiente} onChange={(e) => cambiar({ pendiente: e.target.value })} placeholder="Ej.: VPH, Td"
                    className={`${campoFiltro} w-36`} />
                </label>
              </>
            )}
            <QuitarFiltros visible={hayFiltros} onQuitar={() => setF(SIN_FILTROS)} />
            <span className="text-sm text-slate-500 ml-auto">{filas.length} paciente(s)</span>
            <BotonesExportar nombre="vacunacion" titulo="Vacunación" filas={filas} columnas={[
              { titulo: "Paciente", valor: (x) => x.paciente?.nombre_completo ?? `ID ${x.id}`, ancho: 32 },
              { titulo: "DPI", valor: (x) => x.paciente?.cui ?? "", ancho: 16 },
              { titulo: "Edad", valor: (x) => edadDe(x.paciente?.fecha_nacimiento) ?? "", ancho: 7 },
              { titulo: "Estudiante", valor: (x) => (x.registro ? (x.registro.es_estudiante ? "Sí" : "No") : ""), ancho: 11 },
              { titulo: "Esquema completo", valor: (x) => (x.registro ? (x.registro.esquema_completo ? "Sí" : "No") : "Sin registro"), ancho: 16 },
              { titulo: "Vacunas pendientes", valor: (x) => x.registro?.vacunas_pendientes ?? "", ancho: 40 },
            ]} />
          </div>

          {filas.length === 0 && (
            <p className="text-gray-500 text-sm">
              {registros.length === 0 && !hayFiltros ? "No hay registros de vacunación." : "Ningún paciente coincide con los filtros."}
            </p>
          )}

          {filas.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b bg-gray-100">
                    <th className="p-2">Paciente</th>
                    <th className="p-2">Edad</th>
                    <th className="p-2">Estudiante</th>
                    <th className="p-2">Esquema completo</th>
                    <th className="p-2">Pendientes</th>
                    <th className="p-2">Constancia</th>
                    {(registra || anula) && <th className="p-2">Acciones</th>}
                  </tr>
                </thead>
                <tbody>
                  {pag.items.map(({ id, paciente, registro: v }) => (
                    <tr key={v ? `r${v.id}` : `p${id}`} title="Ver el detalle"
                      onClick={(e) => { if (!e.target.closest("button, a, input, select")) setAbierto(id); }}
                      className="border-b hover:bg-blue-50/60 cursor-pointer">
                      <td className="p-2">
                        <button type="button" onClick={() => setAbierto(id)} className="font-medium text-blue-700 hover:underline text-left">
                          {paciente?.nombre_completo ?? `ID ${id}`}
                        </button>
                        {paciente?.cui && <span className="block text-xs text-slate-500">DPI {paciente.cui}</span>}
                      </td>
                      <td className="p-2 tabular-nums">{edadDe(paciente?.fecha_nacimiento) ?? "—"}</td>
                      {v ? (
                        <>
                          <td className="p-2">{v.es_estudiante ? "Sí" : "No"}</td>
                          <td className="p-2"><Si valor={v.esquema_completo} /></td>
                          <td className="p-2">{v.vacunas_pendientes || "—"}</td>
                          <td className="p-2">{constancia(id)}</td>
                        </>
                      ) : (
                        <td className="p-2 text-slate-500" colSpan={4}>Sin registro de vacunación</td>
                      )}
                      {(registra || anula) && (
                        <td className="p-2 space-x-1 whitespace-nowrap">
                          {registra && (
                            <button onClick={() => editarPaciente(id)} className={boton}>{v ? "Editar" : "Registrar"}</button>
                          )}
                          {anula && v && (
                            <button onClick={() => eliminar(v)} className={`${boton} text-red-700`}>Anular</button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <Paginacion {...pag} />
        </>
      )}

      {filaAbierta?.paciente && (
        <PanelPaciente paciente={filaAbierta.paciente} titulo="Vacunación" onCerrar={cerrarPanel}
          acciones={(
            <>
              {registra && (
                <button onClick={() => editarPaciente(abierto)} className="text-sm px-3 py-1.5 rounded bg-blue-700 text-white hover:bg-blue-800">
                  {filaAbierta.registro ? "Editar vacunación" : "Registrar vacunación"}
                </button>
              )}
              {filaAbierta.registro && (
                <Link to={`/imprimir/vacunacion/${abierto}`} className="text-sm px-3 py-1.5 rounded border hover:bg-gray-100">Constancia PDF</Link>
              )}
              {anula && filaAbierta.registro && (
                <button onClick={() => eliminar(filaAbierta.registro)} className="text-sm px-3 py-1.5 rounded border text-red-700 hover:bg-gray-100">Anular</button>
              )}
            </>
          )}>
          <section className="rounded-lg border p-3 space-y-2 text-sm">
            <h3 className="font-semibold text-slate-700">Vacunación</h3>
            {filaAbierta.registro ? (
              <>
                <p>Esquema completo: <Si valor={filaAbierta.registro.esquema_completo} /></p>
                <p>Estudiante: {filaAbierta.registro.es_estudiante ? "Sí" : "No"}</p>
                <p>Vacunas pendientes: {filaAbierta.registro.vacunas_pendientes || "Ninguna"}</p>
                {filaAbierta.registro.fecha_actualizacion && (
                  <p className="text-xs text-slate-500">Actualizado el {formatoFechaHora(filaAbierta.registro.fecha_actualizacion)}</p>
                )}
              </>
            ) : (
              <p className="text-slate-500">Todavía no tiene registro de vacunación.</p>
            )}
          </section>
        </PanelPaciente>
      )}
    </div>
  );
}
