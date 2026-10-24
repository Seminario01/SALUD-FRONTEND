import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import Paginacion from "../components/Paginacion";
import usePaginacion from "../hooks/usePaginacion";
import client, { mensajeError } from "../api/client";
import useRoles from "../hooks/useRoles";
import { REGLAS, reglasNacimiento } from "../utils/validacion";
import { useAvisos } from "../components/Avisos";
import SelectorResidencia from "../components/SelectorResidencia";
import BotonesExportar from "../components/Exportar";
import PanelPaciente from "../components/PanelPaciente";
import { QuitarFiltros, RangoEdad, SelectFiltro, campoFiltro } from "../components/Filtros";
import { coincidePaciente, edadDe, enRangoEdad } from "../utils/filtros";

const PACIENTE_VACIO = {
  nombre_completo: "",
  cui: "",
  fecha_nacimiento: "",
  genero: "",
  telefono: "",
  tipo_seguro: "",
  cuidador: "",
  alergias: "",
  municipio: "",
  zona: "",
};

function FormularioPaciente({ onCreado }) {
  const [datos, setDatos] = useState(PACIENTE_VACIO);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);
  const [exito, setExito] = useState(null);
  const avisos = useAvisos();

  function cambiar(e) {
    setDatos({ ...datos, [e.target.name]: e.target.value });
  }

  // Antes de registrar: ¿ya existe alguien igual o muy parecido? (mismo CUI, mismo nombre,
  // o nombre parecido con la misma fecha de nacimiento)
  async function sinDuplicados(cuerpo) {
    let parecidos;
    try {
      const r = await client.get("/pacientes/posibles-duplicados", {
        params: { nombre_completo: cuerpo.nombre_completo, fecha_nacimiento: cuerpo.fecha_nacimiento, cui: cuerpo.cui },
      });
      parecidos = r.data.data;
    } catch {
      return true;   // si la revisión falla, no se bloquea el registro
    }
    if (!parecidos.length) return true;
    return avisos.confirmar({
      titulo: "¿Paciente ya registrado?",
      mensaje: [
        "Encontramos pacientes parecidos:",
        ...parecidos.map((p) => `• ${p.nombre_completo} (ID ${p.id}${p.cui ? `, CUI ${p.cui}` : ""}${p.fecha_nacimiento ? `, nació ${p.fecha_nacimiento}` : ""}) — ${p.motivo}`),
        "Revise la ficha antes de crear otro registro. ¿Registrar de todas formas?",
      ],
      confirmar: "Sí, es otra persona", cancelar: "No, revisar",
    });
  }

  async function enviar(e) {
    e.preventDefault();
    setEnviando(true);
    setError(null);
    setExito(null);

    // Solo se envían los campos con valor
    const cuerpo = Object.fromEntries(Object.entries(datos).filter(([, v]) => v !== ""));
    if (!(await sinDuplicados(cuerpo))) {
      setEnviando(false);
      return;
    }
    client
      .post("/pacientes", cuerpo)
      .then((res) => {
        setExito({ id: res.data.data.id, nombre: cuerpo.nombre_completo });
        setDatos(PACIENTE_VACIO);
        onCreado();
      })
      .catch((err) => setError(mensajeError(err)))
      .finally(() => setEnviando(false));
  }

  const campo = "border rounded px-3 py-1.5 w-full";
  return (
    <form onSubmit={enviar} className="bg-white border rounded-lg p-4 shadow-sm mb-6">
      <h2 className="font-bold text-gray-700 mb-3">Registrar paciente</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <label className="text-sm md:col-span-2">
          Nombre completo *
          <input name="nombre_completo" value={datos.nombre_completo} onChange={cambiar} required {...REGLAS.nombre} className={campo} />
        </label>
        <label className="text-sm">
          CUI / DPI
          <input name="cui" value={datos.cui} onChange={cambiar} {...REGLAS.cui} className={campo} />
        </label>
        <label className="text-sm">
          Fecha de nacimiento
          <input type="date" name="fecha_nacimiento" value={datos.fecha_nacimiento} onChange={cambiar} {...reglasNacimiento()} className={campo} />
        </label>
        <label className="text-sm">
          Género
          <select name="genero" value={datos.genero} onChange={cambiar} className={campo}>
            <option value="">—</option>
            <option value="M">Masculino</option>
            <option value="F">Femenino</option>
            <option value="Otro">Otro</option>
          </select>
        </label>
        <label className="text-sm">
          Teléfono
          <input name="telefono" value={datos.telefono} onChange={cambiar} {...REGLAS.telefono} className={campo} />
        </label>
        <label className="text-sm">
          Tipo de seguro
          <select name="tipo_seguro" value={datos.tipo_seguro} onChange={cambiar} className={campo}>
            <option value="">—</option>
            <option value="IGSS">IGSS</option>
            <option value="Privado">Privado</option>
            <option value="Ninguno">Ninguno</option>
          </select>
        </label>
        <label className="text-sm md:col-span-2">
          Cuidador / responsable
          <input name="cuidador" value={datos.cuidador} onChange={cambiar} {...REGLAS.cuidador} className={campo} />
        </label>
        <label className="text-sm">
          Alergias
          <input name="alergias" value={datos.alergias} onChange={cambiar} maxLength={500} placeholder="Ej.: Penicilina, AINE" className={campo} />
        </label>
        <SelectorResidencia municipio={datos.municipio} zona={datos.zona} cui={datos.cui} campo={campo}
          onCambio={(c) => setDatos((d) => ({ ...d, ...c }))} />
      </div>
      <div className="mt-3 flex items-center gap-3">
        <button
          type="submit"
          disabled={enviando}
          className="bg-blue-700 text-white px-4 py-1.5 rounded hover:bg-blue-800 disabled:opacity-50"
        >
          {enviando ? "Guardando..." : "Registrar"}
        </button>
        {exito && (
          <span className="text-sm text-green-700">
            Paciente registrado con ID {exito.id}.{" "}
            <Link to={`/pacientes/${exito.id}`} className="font-medium underline hover:text-green-900">Ver ficha de {exito.nombre} →</Link>
          </span>
        )}
        {error && <span className="text-sm text-red-600">{error}</span>}
      </div>
    </form>
  );
}

function ResultadoAntecedentes({ consulta, onCerrar }) {
  if (!consulta) return null;
  const { paciente, cargando, error, datos } = consulta;
  const alto = datos?.tieneAntecedentes && ["ALTO", "MEDIO"].includes(String(datos.nivelRiesgo).toUpperCase());
  const estilo = error
    ? "bg-slate-50 border-slate-200"
    : datos?.tieneAntecedentes
      ? alto ? "bg-red-50 border-red-200" : "bg-amber-50 border-amber-200"
      : "bg-slate-50 border-slate-200";
  return (
    <div id="resultado-antecedentes" className={`border rounded-xl p-4 mb-4 text-sm scroll-mt-4 ${estilo}`}>
      <div className="flex justify-between gap-3">
        <p className="font-semibold text-slate-800">Antecedentes en Seguridad · {paciente.nombre_completo}</p>
        <button onClick={onCerrar} className="text-slate-400 hover:text-slate-700" aria-label="Cerrar">✕</button>
      </div>
      {cargando && <p className="text-slate-500 mt-1">Consultando al módulo de Seguridad...</p>}
      {error && <p className="text-slate-600 mt-1">{error}</p>}
      {datos && !datos.tieneAntecedentes && (
        <p className="text-slate-700 mt-1">Sin antecedentes activos encontrados en Seguridad. No es una certificación; la atención continúa con normalidad.</p>
      )}
      {datos?.tieneAntecedentes && (
        <div className="mt-1 space-y-0.5 text-slate-700">
          <p>Tipo: <span className="font-medium">{datos.tipoAntecedente || "—"}</span></p>
          <p>Nivel de riesgo: <span className="font-semibold">{datos.nivelRiesgo}</span></p>
          <p className={datos.requiereCustodia ? "font-semibold text-red-700" : ""}>
            {datos.requiereCustodia ? "Requiere custodia durante la atención." : "No requiere custodia."}
          </p>
        </div>
      )}
    </div>
  );
}

const SIN_FILTROS = { texto: "", edadDesde: "", edadHasta: "", genero: "", seguro: "", departamento: "", alergias: "" };

function cumpleFiltros(p, f) {
  if (!coincidePaciente(p, f.texto)) return false;
  if (!enRangoEdad(p.fecha_nacimiento, f.edadDesde, f.edadHasta)) return false;
  if (f.genero && p.genero !== f.genero) return false;
  if (f.seguro && (p.tipo_seguro || "sin") !== f.seguro) return false;
  if (f.departamento && (p.departamento || "sin") !== f.departamento) return false;
  if (f.alergias === "si" && !p.alergias) return false;
  if (f.alergias === "no" && p.alergias) return false;
  return true;
}

export default function Pacientes() {
  const { puedeRegistrarPacientes, puede } = useRoles();
  const puedeAntecedentes = puede("pacientes.antecedentes");
  const [abierto, setAbierto] = useState(null);   // paciente del panel de detalle
  const cerrarPanel = useCallback(() => setAbierto(null), []);

  // --- Listado real: GET /pacientes (solo personal de Salud); los filtros se aplican en el navegador ---
  const [pacientes, setPacientes] = useState([]);
  const [f, setF] = useState(SIN_FILTROS);
  const cambiar = (c) => setF((actual) => ({ ...actual, ...c }));
  const hayFiltros = Object.values(f).some(Boolean);
  const filtrados = useMemo(() => pacientes.filter((p) => cumpleFiltros(p, f)), [pacientes, f]);
  const pag = usePaginacion(filtrados, 15, JSON.stringify(f));
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  // Departamentos que aparecen en la lista (para el filtro)
  const departamentos = useMemo(() => {
    const vistos = new Map();
    pacientes.forEach((p) => { if (p.departamento) vistos.set(p.departamento, p.departamento_nombre ?? p.departamento); });
    return [...vistos.entries()].sort((a, b) => a[1].localeCompare(b[1], "es")).concat([["sin", "Sin residencia"]]);
  }, [pacientes]);

  // Solo vale la respuesta de la última petición
  const ultima = useRef(0);
  const cargar = useCallback(() => {
    const numero = ++ultima.current;
    client
      .get("/pacientes")
      .then((res) => {
        if (numero !== ultima.current) return;
        setPacientes(res.data.data);
        setError(null);
      })
      .catch((err) => {
        if (numero !== ultima.current) return;
        setError(err.response?.status === 403 ? "No tiene permiso para ver el listado de pacientes." : mensajeError(err));
      })
      .finally(() => { if (numero === ultima.current) setCargando(false); });
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  // --- Consulta de antecedentes en el módulo de Seguridad (WS-SALUD-08) ---
  const [consulta, setConsulta] = useState(null);

  function consultarAntecedentes(p) {
    if (!p.cui) {
      setConsulta({ paciente: p, error: "El paciente no tiene CUI registrado; no se puede consultar a Seguridad." });
      return;
    }
    setConsulta({ paciente: p, cargando: true });
    // El resultado aparece arriba de la tabla: llevar la vista hasta él
    setTimeout(() => document.getElementById("resultado-antecedentes")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
    client
      .get(`/pacientes/${p.id}/antecedentes`)
      .then((res) => setConsulta({ paciente: p, datos: res.data.data }))
      .catch((err) => setConsulta({ paciente: p, error: mensajeError(err) }));
  }

  return (
    <div className="p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h1 className="text-2xl font-bold text-gray-800">Pacientes</h1>
        {puedeRegistrarPacientes && (
          <Link to="/pacientes/residencia" className="text-sm px-3 py-1.5 rounded border border-blue-700 text-blue-800 hover:bg-blue-50">
            Completar residencia de pacientes
          </Link>
        )}
      </div>

      {puedeRegistrarPacientes && <FormularioPaciente onCreado={cargar} />}

      <h2 className="font-bold text-gray-700 mb-3">Listado de pacientes</h2>
      <div className="flex flex-wrap items-end gap-3 mb-3">
        <label className="text-sm">Buscar
          <input
            value={f.texto}
            onChange={(e) => cambiar({ texto: e.target.value })}
            placeholder="Buscar por nombre o CUI"
            className={`${campoFiltro} w-60`}
          />
        </label>
        <RangoEdad desde={f.edadDesde} hasta={f.edadHasta} onCambio={({ desde, hasta }) => cambiar({ edadDesde: desde, edadHasta: hasta })} />
        <SelectFiltro etiqueta="Género" valor={f.genero} onCambio={(v) => cambiar({ genero: v })}
          opciones={[["F", "Femenino"], ["M", "Masculino"], ["Otro", "Otro"]]} />
        <SelectFiltro etiqueta="Seguro" valor={f.seguro} onCambio={(v) => cambiar({ seguro: v })}
          opciones={[["IGSS", "IGSS"], ["Privado", "Privado"], ["Ninguno", "Ninguno"], ["sin", "Sin dato"]]} />
        <SelectFiltro etiqueta="Departamento" valor={f.departamento} onCambio={(v) => cambiar({ departamento: v })} opciones={departamentos} />
        <SelectFiltro etiqueta="Alergias" valor={f.alergias} onCambio={(v) => cambiar({ alergias: v })}
          opciones={[["si", "Con alergias"], ["no", "Sin alergias"]]} />
        <QuitarFiltros visible={hayFiltros} onQuitar={() => setF(SIN_FILTROS)} />
        <span className="text-sm text-slate-500 ml-auto">{filtrados.length} paciente(s)</span>
        <BotonesExportar nombre="pacientes" titulo="Pacientes" filas={filtrados} columnas={[
          { titulo: "ID", valor: (p) => p.id, ancho: 7 },
          { titulo: "Nombre", valor: (p) => p.nombre_completo, ancho: 34 },
          { titulo: "DPI", valor: (p) => p.cui ?? "", ancho: 16 },
          { titulo: "Edad", valor: (p) => edadDe(p.fecha_nacimiento) ?? "", ancho: 7 },
          { titulo: "Género", valor: (p) => p.genero ?? "", ancho: 9 },
          { titulo: "Teléfono", valor: (p) => p.telefono ?? "", ancho: 12 },
          { titulo: "Seguro", valor: (p) => p.tipo_seguro ?? "", ancho: 10 },
          { titulo: "Departamento", valor: (p) => p.departamento_nombre ?? "", ancho: 18 },
          { titulo: "Municipio", valor: (p) => p.municipio_nombre ?? "", ancho: 20 },
          { titulo: "Alergias", valor: (p) => p.alergias ?? "", ancho: 24 },
        ]} />
      </div>
      {cargando && <p className="text-sm text-gray-500">Cargando...</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
      <ResultadoAntecedentes consulta={consulta} onCerrar={() => setConsulta(null)} />
      {!cargando && !error && filtrados.length === 0 && (
        <p className="text-sm text-gray-500">{hayFiltros ? "Ningún paciente coincide con los filtros." : "No se encontraron pacientes."}</p>
      )}
      {!cargando && !error && filtrados.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b bg-gray-100">
                <th className="p-2">ID</th>
                <th className="p-2">Nombre</th>
                <th className="p-2">Edad</th>
                <th className="p-2">Teléfono</th>
                <th className="p-2">Tipo de seguro</th>
                <th className="p-2">Residencia</th>
                <th className="p-2">Alergias</th>
                {puedeAntecedentes && <th className="p-2">Antecedentes (Seguridad)</th>}
              </tr>
            </thead>
            <tbody>
              {pag.items.map((p) => (
                <tr key={p.id} title="Ver el detalle del paciente"
                  onClick={(e) => { if (!e.target.closest("button, a, input, select")) setAbierto(p); }}
                  className="border-b hover:bg-blue-50/60 cursor-pointer">
                  <td className="p-2">{p.id}</td>
                  <td className="p-2">
                    <button type="button" onClick={() => setAbierto(p)} className="font-medium text-blue-700 hover:underline text-left">{p.nombre_completo}</button>
                    {p.cui && <span className="block text-xs text-slate-500">DPI {p.cui}</span>}
                  </td>
                  <td className="p-2 tabular-nums">{edadDe(p.fecha_nacimiento) ?? "—"}</td>
                  <td className="p-2">{p.telefono}</td>
                  <td className="p-2">{p.tipo_seguro}</td>
                  <td className="p-2 text-sm">{p.municipio_nombre ? `${p.municipio_nombre}, ${p.departamento_nombre}` : <span className="text-slate-400">—</span>}</td>
                  <td className="p-2">{p.alergias ? <span className="text-xs rounded bg-red-50 text-red-800 px-1.5 py-0.5">⚠ {p.alergias}</span> : <span className="text-slate-400">—</span>}</td>
                  {puedeAntecedentes && (
                    <td className="p-2">
                      <button
                        onClick={() => consultarAntecedentes(p)}
                        className="text-xs px-2 py-1 rounded border hover:bg-gray-100"
                      >
                        Consultar
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Paginacion {...pag} />

      {abierto && (
        <PanelPaciente paciente={abierto} titulo="Paciente" onCerrar={cerrarPanel}
          acciones={puedeAntecedentes && (
            <button onClick={() => { setAbierto(null); consultarAntecedentes(abierto); }}
              className="text-sm px-3 py-1.5 rounded border hover:bg-gray-100">
              Consultar antecedentes
            </button>
          )} />
      )}
    </div>
  );
}
