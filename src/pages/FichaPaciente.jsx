import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ESTADO_CUENTA, descripcionCuenta, quetzales } from "../utils/caja";
import EstadoPago from "../components/EstadoPago";
import client, { mensajeError } from "../api/client";
import useRoles from "../hooks/useRoles";

const COLOR_HOSPITALIZACION = {
  PENDIENTE: "bg-yellow-100 text-yellow-800",
  ACTIVO: "bg-blue-100 text-blue-800",
  EGRESADO: "bg-green-100 text-green-800",
  ANULADO: "bg-red-100 text-red-800",
};
const TEXTO_HOSPITALIZACION = { PENDIENTE: "pendiente de cama", ACTIVO: "ingresado", EGRESADO: "egresado", ANULADO: "anulado" };

const COLOR_RECETA = {
  PENDIENTE: "bg-yellow-100 text-yellow-800",
  DESPACHADA: "bg-green-100 text-green-800",
  ANULADA: "bg-red-100 text-red-800",
};

function fecha(texto, conHora = true) {
  if (!texto || texto === "None") return "—";
  const f = new Date(String(texto).replace(" ", "T"));
  if (isNaN(f)) return texto;
  return f.toLocaleString("es-GT", conHora ? { dateStyle: "medium", timeStyle: "short" } : { dateStyle: "long" });
}

function edad(nacimiento) {
  if (!nacimiento || nacimiento === "None") return null;
  const n = new Date(nacimiento);
  if (isNaN(n)) return null;
  const hoy = new Date();
  let e = hoy.getFullYear() - n.getFullYear();
  if (hoy < new Date(hoy.getFullYear(), n.getMonth(), n.getDate())) e--;
  return e;
}

const COLOR_ESTADO = {
  pendiente: "bg-yellow-100 text-yellow-800",
  confirmada: "bg-green-100 text-green-800",
  atendida: "bg-blue-100 text-blue-800",
  cancelada: "bg-red-100 text-red-800",
};

function Seccion({ titulo, accion, children }) {
  return (
    <section className="bg-white border rounded-lg p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3 mb-3">
        <h2 className="font-bold text-slate-700">{titulo}</h2>
        {accion}
      </div>
      {children}
    </section>
  );
}

function FormularioEdicion({ paciente, puedeTodo, onGuardado, onCancelar }) {
  const [datos, setDatos] = useState({
    nombre_completo: paciente.nombre_completo ?? "",
    cui: paciente.cui ?? "",
    fecha_nacimiento: paciente.fecha_nacimiento && paciente.fecha_nacimiento !== "None" ? paciente.fecha_nacimiento : "",
    genero: paciente.genero ?? "",
    telefono: paciente.telefono ?? "",
    tipo_seguro: paciente.tipo_seguro ?? "",
    cuidador: paciente.cuidador ?? "",
  });
  const [codigo, setCodigo] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null);

  const cambiar = (e) => setDatos({ ...datos, [e.target.name]: e.target.value });

  function guardar(e) {
    e.preventDefault();
    setGuardando(true);
    setError(null);
    const cuerpo = puedeTodo
      ? { ...datos, ...(codigo.trim() ? { usuario_sub: codigo.trim() } : {}) }
      : { telefono: datos.telefono, tipo_seguro: datos.tipo_seguro, cuidador: datos.cuidador };
    client
      .put(`/pacientes/${paciente.id}`, cuerpo)
      .then(onGuardado)
      .catch((err) => setError(mensajeError(err)))
      .finally(() => setGuardando(false));
  }

  const campo = "border rounded px-3 py-1.5 w-full";
  return (
    <form onSubmit={guardar} className="grid grid-cols-1 md:grid-cols-3 gap-3">
      {puedeTodo && (
        <>
          <label className="text-sm md:col-span-2">Nombre completo *
            <input name="nombre_completo" value={datos.nombre_completo} onChange={cambiar} required className={campo} />
          </label>
          <label className="text-sm">CUI / DPI
            <input name="cui" value={datos.cui} onChange={cambiar} maxLength={13} className={campo} />
          </label>
          <label className="text-sm">Fecha de nacimiento
            <input type="date" name="fecha_nacimiento" value={datos.fecha_nacimiento} onChange={cambiar} className={campo} />
          </label>
          <label className="text-sm">Género
            <select name="genero" value={datos.genero} onChange={cambiar} className={campo}>
              <option value="">—</option><option value="M">Masculino</option>
              <option value="F">Femenino</option><option value="Otro">Otro</option>
            </select>
          </label>
        </>
      )}
      <label className="text-sm">Teléfono
        <input name="telefono" value={datos.telefono} onChange={cambiar} maxLength={20} className={campo} />
      </label>
      <label className="text-sm">Tipo de seguro
        <select name="tipo_seguro" value={datos.tipo_seguro} onChange={cambiar} className={campo}>
          <option value="">—</option><option value="IGSS">IGSS</option>
          <option value="Privado">Privado</option><option value="Ninguno">Ninguno</option>
        </select>
      </label>
      <label className="text-sm md:col-span-2">Cuidador / responsable
        <input name="cuidador" value={datos.cuidador} onChange={cambiar} className={campo} />
      </label>
      {puedeTodo && (
        <label className="text-sm md:col-span-3">
          Código de vinculación del ciudadano
          <input value={codigo} onChange={(e) => setCodigo(e.target.value)} placeholder={paciente.tiene_cuenta ? "Ya vinculado: escriba un código nuevo solo para cambiarlo" : "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"}
            maxLength={36} className={`${campo} font-mono text-sm`} />
        </label>
      )}
      <div className="md:col-span-3 flex items-center gap-3">
        <button type="submit" disabled={guardando} className="bg-blue-700 text-white px-4 py-1.5 rounded hover:bg-blue-800 disabled:opacity-50">
          {guardando ? "Guardando..." : "Guardar cambios"}
        </button>
        <button type="button" onClick={onCancelar} className="px-4 py-1.5 rounded border hover:bg-gray-100">Cancelar</button>
        {error && <span className="text-sm text-red-600">{error}</span>}
      </div>
    </form>
  );
}

export default function FichaPaciente() {
  const { id } = useParams();
  const { puede } = useRoles();
  const puedeEditarTodo = puede("pacientes.registrar");
  const puedeVerClinico = puede("expediente.ver");
  const puedeVerCitas = puede("citas.ver");
  const puedeVerVacunas = puede("vacunacion.ver");
  const puedeAntecedentes = puede("pacientes.antecedentes");
  const puedeVerRecetas = puede("recetas.ver");
  const puedeVerHospitalizacion = puede("hospitalizacion.ver");
  const puedeVerCuentas = puede("cuentas.ver");

  const [paciente, setPaciente] = useState(undefined);
  const [error, setError] = useState(null);
  const [editando, setEditando] = useState(false);
  const [aviso, setAviso] = useState(null);
  const [citas, setCitas] = useState(null);
  const [vacunacion, setVacunacion] = useState(undefined);
  const [atenciones, setAtenciones] = useState(null);
  const [antecedentes, setAntecedentes] = useState(null);
  const [recetas, setRecetas] = useState(null);
  const [hospitalizaciones, setHospitalizaciones] = useState(null);
  const [cuentas, setCuentas] = useState(null);

  const cargar = useCallback(() => {
    client
      .get(`/pacientes/${id}`)
      .then((r) => setPaciente(r.data.data))
      .catch((err) => { setPaciente(null); setError(mensajeError(err)); });
  }, [id]);

  useEffect(() => {
    cargar();
    if (puedeVerCitas) {
      client.get("/citas", { params: { paciente_id: id } }).then((r) => setCitas(r.data.data)).catch(() => setCitas([]));
    }
    if (puedeVerVacunas) {
      client.get(`/vacunacion/${id}`).then((r) => setVacunacion(r.data.data)).catch(() => setVacunacion(null));
    }
    if (puedeVerClinico) {
      client.get(`/expedientes/${id}`).then((r) => setAtenciones(r.data.data)).catch(() => setAtenciones([]));
    }
    if (puedeVerCuentas) {
      client.get("/cuentas", { params: { paciente_id: id } }).then((r) => setCuentas(r.data.data)).catch(() => setCuentas([]));
    }
    if (puedeVerHospitalizacion) {
      client.get("/hospitalizaciones", { params: { paciente_id: id } }).then((r) => setHospitalizaciones(r.data.data)).catch(() => setHospitalizaciones([]));
    }
    if (puedeVerRecetas) {
      client.get("/recetas", { params: { paciente_id: id } }).then((r) => setRecetas(r.data.data)).catch(() => setRecetas([]));
    }
  }, [id, cargar, puedeVerClinico, puedeVerCitas, puedeVerVacunas, puedeVerRecetas, puedeVerHospitalizacion, puedeVerCuentas]);

  function consultarAntecedentes() {
    setAntecedentes({ cargando: true });
    client
      .get(`/pacientes/${id}/antecedentes`)
      .then((r) => setAntecedentes({ datos: r.data.data }))
      .catch((err) => setAntecedentes({ error: mensajeError(err) }));
  }

  if (paciente === undefined) return <p className="p-6">Cargando...</p>;
  if (paciente === null) {
    return (
      <div className="p-6">
        <Link to="/pacientes" className="text-sm text-blue-700 hover:underline">← Pacientes</Link>
        <p className="mt-4 text-red-600">{error}</p>
      </div>
    );
  }

  const años = edad(paciente.fecha_nacimiento);
  const a = antecedentes?.datos;

  return (
    <div className="p-6 space-y-4">
      <Link to="/pacientes" className="text-sm text-blue-700 hover:underline">← Pacientes</Link>

      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">{paciente.nombre_completo}</h1>
        <span className={`text-xs rounded-full px-2 py-0.5 ${paciente.tiene_cuenta ? "bg-green-100 text-green-800" : "bg-slate-100 text-slate-600"}`}>
          {paciente.tiene_cuenta ? "Cuenta del Login Único vinculada" : "Sin cuenta vinculada"}
        </span>
      </div>
      {aviso && <p className="text-sm text-green-800 bg-green-50 border border-green-200 rounded-lg px-3 py-2">{aviso}</p>}

      <Seccion
        titulo="Datos del paciente"
        accion={(puedeEditarTodo) && !editando && (
          <button onClick={() => { setEditando(true); setAviso(null); }} className="text-sm px-3 py-1 rounded border hover:bg-gray-100">Editar</button>
        )}
      >
        {editando ? (
          <FormularioEdicion
            paciente={paciente}
            puedeTodo={puedeEditarTodo}
            onCancelar={() => setEditando(false)}
            onGuardado={() => { setEditando(false); setAviso("Datos actualizados."); cargar(); }}
          />
        ) : (
          <dl className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-3 text-sm">
            <div><dt className="text-slate-400">ID</dt><dd>{paciente.id}</dd></div>
            <div><dt className="text-slate-400">CUI</dt><dd>{paciente.cui || "—"}</dd></div>
            <div><dt className="text-slate-400">Nacimiento</dt><dd>{fecha(paciente.fecha_nacimiento, false)}{años !== null && ` (${años} años)`}</dd></div>
            <div><dt className="text-slate-400">Género</dt><dd>{{ M: "Masculino", F: "Femenino" }[paciente.genero] ?? (paciente.genero || "—")}</dd></div>
            <div><dt className="text-slate-400">Teléfono</dt><dd>{paciente.telefono || "—"}</dd></div>
            <div><dt className="text-slate-400">Seguro</dt><dd>{paciente.tipo_seguro || "—"}</dd></div>
            <div className="col-span-2"><dt className="text-slate-400">Cuidador / responsable</dt><dd>{paciente.cuidador || "—"}</dd></div>
          </dl>
        )}
      </Seccion>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {puedeAntecedentes && (
          <Seccion
            titulo="Antecedentes (Seguridad)"
            accion={<button onClick={consultarAntecedentes} disabled={antecedentes?.cargando}
              className="text-sm px-3 py-1 rounded border hover:bg-gray-100 disabled:opacity-50">
              {antecedentes?.cargando ? "Consultando..." : "Consultar"}</button>}
          >
            {antecedentes?.error && <p className="text-sm text-slate-600">{antecedentes.error}</p>}
            {a && !a.tieneAntecedentes && <p className="text-sm text-green-800">Sin antecedentes registrados. Atención normal.</p>}
            {a?.tieneAntecedentes && (
              <div className={`text-sm rounded-lg p-3 ${a.requiereCustodia ? "bg-red-50 text-red-800" : "bg-amber-50 text-amber-900"}`}>
                <p>{a.tipoAntecedente} · riesgo <b>{a.nivelRiesgo}</b></p>
                <p className="font-semibold">{a.requiereCustodia ? "Requiere custodia durante la atención." : "No requiere custodia."}</p>
              </div>
            )}
          </Seccion>
        )}

        {puedeVerVacunas && (
        <Seccion titulo="Vacunación" accion={puede("vacunacion.registrar") && <Link to="/vacunacion" className="text-sm text-blue-700 hover:underline">Gestionar →</Link>}>
          {vacunacion === undefined && <p className="text-sm text-slate-400">Cargando...</p>}
          {vacunacion === null && <p className="text-sm text-slate-500">Sin registro de vacunación.</p>}
          {vacunacion && (
            <div className="text-sm space-y-1">
              <p className={`font-semibold ${vacunacion.esquema_completo ? "text-green-700" : "text-amber-600"}`}>
                {vacunacion.esquema_completo ? "Esquema completo" : "Esquema incompleto"}
              </p>
              <p>Estudiante: {vacunacion.es_estudiante ? "Sí" : "No"}</p>
              {vacunacion.vacunas_pendientes && <p>Pendientes: {vacunacion.vacunas_pendientes}</p>}
            </div>
          )}
        </Seccion>
        )}
      </div>

      {puedeVerCitas && (
      <Seccion titulo="Citas" accion={puede("citas.gestionar") && <Link to="/citas" className="text-sm text-blue-700 hover:underline">Agendar →</Link>}>
        {citas === null && <p className="text-sm text-slate-400">Cargando...</p>}
        {citas?.length === 0 && <p className="text-sm text-slate-500">No tiene citas.</p>}
        {citas?.length > 0 && (
          <table className="w-full text-left">
            <thead><tr><th className="p-2">Fecha</th><th className="p-2">Motivo</th><th className="p-2">Estado</th><th className="p-2">Pago</th></tr></thead>
            <tbody>
              {citas.slice(0, 8).map((c) => (
                <tr key={c.id}>
                  <td className="p-2">{fecha(c.fecha_hora)}</td>
                  <td className="p-2">{c.motivo || "—"}</td>
                  <td className="p-2"><span className={`px-2 py-0.5 rounded text-xs ${COLOR_ESTADO[c.estado] ?? "bg-gray-100"}`}>{c.estado}</span></td>
                  <td className="p-2"><EstadoPago cita={c} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {citas?.length > 8 && <p className="text-xs text-slate-400 mt-2">Mostrando las 8 más recientes de {citas.length}.</p>}
      </Seccion>
      )}

      {puedeVerClinico && (
        <Seccion titulo="Expediente clínico" accion={puede("expediente.registrar") && <Link to="/expedientes" className="text-sm text-blue-700 hover:underline">Registrar atención →</Link>}>
          {atenciones === null && <p className="text-sm text-slate-400">Cargando...</p>}
          {atenciones?.length === 0 && <p className="text-sm text-slate-500">Sin atenciones registradas.</p>}
          <div className="space-y-2">
            {atenciones?.slice(0, 5).map((e) => (
              <div key={e.id} className="border-l-4 border-blue-200 pl-3">
                <p className="text-xs text-slate-400">{fecha(e.fecha_atencion)}</p>
                <p className="font-medium text-slate-800">{e.diagnostico}</p>
                {e.tratamiento && <p className="text-sm text-slate-600">{e.tratamiento}</p>}
              </div>
            ))}
          </div>
        </Seccion>
      )}

      {puedeVerHospitalizacion && (
        <Seccion titulo="Hospitalizaciones" accion={puede("hospitalizacion.ordenar") && <Link to={`/hospitalizacion?paciente=${id}`} className="text-sm text-blue-700 hover:underline">Ordenar ingreso →</Link>}>
          {hospitalizaciones === null && <p className="text-sm text-slate-400">Cargando...</p>}
          {hospitalizaciones?.length === 0 && <p className="text-sm text-slate-500">Sin hospitalizaciones.</p>}
          {hospitalizaciones?.length > 0 && (
            <table className="w-full text-left">
              <thead><tr><th className="p-2">Ingreso</th><th className="p-2">Área y cama</th>{puedeVerClinico && <th className="p-2">Diagnóstico</th>}<th className="p-2">Estado</th></tr></thead>
              <tbody>
                {hospitalizaciones.slice(0, 5).map((h) => (
                  <tr key={h.id}>
                    <td className="p-2">{fecha(h.fecha_ingreso ?? h.fecha_orden)}</td>
                    <td className="p-2">{h.area}{h.cama ? ` · ${h.cama}` : ""}</td>
                    {puedeVerClinico && <td className="p-2">{h.diagnostico}</td>}
                    <td className="p-2"><span className={`px-2 py-0.5 rounded text-xs ${COLOR_HOSPITALIZACION[h.estado] ?? "bg-gray-100"}`}>{TEXTO_HOSPITALIZACION[h.estado] ?? h.estado}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Seccion>
      )}

      {puedeVerCuentas && (
        <Seccion titulo="Cuentas" accion={<Link to="/caja" className="text-sm text-blue-700 hover:underline">Ir a Caja →</Link>}>
          {cuentas === null && <p className="text-sm text-slate-400">Cargando...</p>}
          {cuentas?.length === 0 && <p className="text-sm text-slate-500">Sin cuentas.</p>}
          {cuentas?.length > 0 && (
            <table className="w-full text-left">
              <thead><tr><th className="p-2">No.</th><th className="p-2">Cuenta</th><th className="p-2">Estado</th><th className="p-2 text-right">Saldo</th><th className="p-2">Referencia</th></tr></thead>
              <tbody>
                {cuentas.slice(0, 6).map((c) => (
                  <tr key={c.id}>
                    <td className="p-2"><Link to={`/caja?cuenta=${c.id}`} className="text-blue-700 hover:underline tabular-nums">{c.id}</Link></td>
                    <td className="p-2">{descripcionCuenta(c)}</td>
                    <td className="p-2"><span className={`px-2 py-0.5 rounded text-xs ${ESTADO_CUENTA[c.estado]?.clase ?? "bg-gray-100"}`}>{ESTADO_CUENTA[c.estado]?.texto ?? c.estado}</span></td>
                    <td className="p-2 text-right tabular-nums">{quetzales(c.saldo)}</td>
                    <td className="p-2 font-mono text-xs">{c.numero_referencia ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Seccion>
      )}

      {puedeVerRecetas && (
        <Seccion titulo="Recetas" accion={puede("recetas.crear") && <Link to={`/recetas?paciente=${id}`} className="text-sm text-blue-700 hover:underline">Recetar →</Link>}>
          {recetas === null && <p className="text-sm text-slate-400">Cargando...</p>}
          {recetas?.length === 0 && <p className="text-sm text-slate-500">Sin recetas.</p>}
          {recetas?.length > 0 && (
            <table className="w-full text-left">
              <thead><tr><th className="p-2">No.</th><th className="p-2">Fecha</th><th className="p-2">Medicamentos</th><th className="p-2">Estado</th></tr></thead>
              <tbody>
                {recetas.slice(0, 6).map((r) => (
                  <tr key={r.id}>
                    <td className="p-2 tabular-nums">{r.id}</td>
                    <td className="p-2">{fecha(r.fecha)}</td>
                    <td className="p-2">{r.items.map((it) => `${it.medicamento} ×${it.cantidad}`).join(", ")}</td>
                    <td className="p-2"><span className={`px-2 py-0.5 rounded text-xs ${COLOR_RECETA[r.estado] ?? "bg-gray-100"}`}>{r.estado.toLowerCase()}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {recetas?.length > 6 && <p className="text-xs text-slate-400 mt-2">Mostrando las 6 más recientes de {recetas.length}.</p>}
        </Seccion>
      )}
    </div>
  );
}
