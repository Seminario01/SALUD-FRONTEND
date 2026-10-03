import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Paginacion from "../components/Paginacion";
import usePaginacion from "../hooks/usePaginacion";
import client, { mensajeError } from "../api/client";
import useRoles from "../hooks/useRoles";

const PACIENTE_VACIO = {
  nombre_completo: "",
  cui: "",
  fecha_nacimiento: "",
  genero: "",
  telefono: "",
  tipo_seguro: "",
  cuidador: "",
};

function FormularioPaciente({ onCreado }) {
  const [datos, setDatos] = useState(PACIENTE_VACIO);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);
  const [exito, setExito] = useState(null);

  function cambiar(e) {
    setDatos({ ...datos, [e.target.name]: e.target.value });
  }

  function enviar(e) {
    e.preventDefault();
    setEnviando(true);
    setError(null);
    setExito(null);

    // Solo se envían los campos con valor
    const cuerpo = Object.fromEntries(Object.entries(datos).filter(([, v]) => v !== ""));
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
          <input name="nombre_completo" value={datos.nombre_completo} onChange={cambiar} required className={campo} />
        </label>
        <label className="text-sm">
          CUI / DPI
          <input name="cui" value={datos.cui} onChange={cambiar} inputMode="numeric" maxLength={13} className={campo} />
        </label>
        <label className="text-sm">
          Fecha de nacimiento
          <input type="date" name="fecha_nacimiento" value={datos.fecha_nacimiento} onChange={cambiar} className={campo} />
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
          <input name="telefono" value={datos.telefono} onChange={cambiar} inputMode="tel" maxLength={20} className={campo} />
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
          <input name="cuidador" value={datos.cuidador} onChange={cambiar} className={campo} />
        </label>
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
      : "bg-green-50 border-green-200";
  return (
    <div id="resultado-antecedentes" className={`border rounded-xl p-4 mb-4 text-sm scroll-mt-4 ${estilo}`}>
      <div className="flex justify-between gap-3">
        <p className="font-semibold text-slate-800">Antecedentes en Seguridad · {paciente.nombre_completo}</p>
        <button onClick={onCerrar} className="text-slate-400 hover:text-slate-700" aria-label="Cerrar">✕</button>
      </div>
      {cargando && <p className="text-slate-500 mt-1">Consultando al módulo de Seguridad...</p>}
      {error && <p className="text-slate-600 mt-1">{error}</p>}
      {datos && !datos.tieneAntecedentes && (
        <p className="text-green-800 mt-1">Sin antecedentes registrados. Atención normal.</p>
      )}
      {datos?.tieneAntecedentes && (
        <div className="mt-1 space-y-0.5 text-slate-700">
          <p>Tipo: <span className="font-medium">{datos.tipoAntecedente || "—"}</span></p>
          <p>Nivel de riesgo: <span className="font-semibold">{datos.nivelRiesgo}</span></p>
          <p className={datos.requiereCustodia ? "font-semibold text-red-700" : ""}>
            {datos.requiereCustodia ? "Requiere custodia durante la atención." : "No requiere custodia."}
          </p>
          <p className="text-xs text-slate-500">El paciente se atiende siempre; esto solo indica cuidados adicionales.</p>
        </div>
      )}
      {datos?.simulado && <p className="text-xs text-amber-700 mt-2">Respuesta del simulador de Seguridad (desarrollo).</p>}
    </div>
  );
}

export default function Pacientes() {
  const { puedeRegistrarPacientes, puede } = useRoles();
  const puedeAntecedentes = puede("pacientes.antecedentes");

  // --- Listado real: GET /pacientes (solo personal de Salud) ---
  const [pacientes, setPacientes] = useState([]);
  const pag = usePaginacion(pacientes, 15);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  const cargar = useCallback((q = "") => {
    client
      .get("/pacientes", { params: q ? { q } : {} })
      .then((res) => {
        setPacientes(res.data.data);
        setError(null);
      })
      .catch((err) =>
        setError(err.response?.status === 403 ? "No tiene permiso para ver el listado de pacientes." : mensajeError(err))
      )
      .finally(() => setCargando(false));
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

  // --- Búsqueda por nombre o CUI (GET /pacientes?q=...) ---
  const [texto, setTexto] = useState("");

  function buscar(e) {
    e.preventDefault();
    setCargando(true);
    cargar(texto.trim());
  }

  function limpiar() {
    setTexto("");
    setCargando(true);
    cargar("");
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-4">Pacientes</h1>

      {puedeRegistrarPacientes && <FormularioPaciente onCreado={cargar} />}

      <div className="flex flex-wrap items-end justify-between gap-3 mb-3">
        <h2 className="font-bold text-gray-700">Listado de pacientes</h2>
        <form onSubmit={buscar} className="flex gap-2">
          <input
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Buscar por nombre o CUI"
            className="border rounded px-3 py-1.5 w-64"
          />
          <button type="submit" className="bg-blue-700 text-white px-4 py-1.5 rounded hover:bg-blue-800">Buscar</button>
          {texto && (
            <button type="button" onClick={limpiar} className="px-3 py-1.5 rounded border hover:bg-gray-100 text-sm">
              Limpiar
            </button>
          )}
        </form>
      </div>
      {cargando && <p className="text-sm text-gray-500">Cargando...</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
      <ResultadoAntecedentes consulta={consulta} onCerrar={() => setConsulta(null)} />
      {!cargando && !error && pacientes.length === 0 && (
        <p className="text-sm text-gray-500">No se encontraron pacientes.</p>
      )}
      {!cargando && !error && pacientes.length > 0 && (
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b bg-gray-100">
              <th className="p-2">ID</th>
              <th className="p-2">Nombre</th>
              <th className="p-2">CUI</th>
              <th className="p-2">Teléfono</th>
              <th className="p-2">Tipo de seguro</th>
              {puedeAntecedentes && <th className="p-2">Antecedentes (Seguridad)</th>}
            </tr>
          </thead>
          <tbody>
            {pag.items.map((p) => (
              <tr key={p.id} className="border-b hover:bg-gray-50">
                <td className="p-2">{p.id}</td>
                <td className="p-2">
                  <Link to={`/pacientes/${p.id}`} className="font-medium text-blue-700 hover:underline">{p.nombre_completo}</Link>
                </td>
                <td className="p-2">{p.cui}</td>
                <td className="p-2">{p.telefono}</td>
                <td className="p-2">{p.tipo_seguro}</td>
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
      )}
      <Paginacion {...pag} />
    </div>
  );
}
