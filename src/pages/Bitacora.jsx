import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import client, { mensajeError } from "../api/client";
import usePacientesSeleccionables from "../hooks/usePacientesSeleccionables";
import BuscadorPaciente from "../components/BuscadorPaciente";
import BotonesExportar from "../components/Exportar";
import Paginacion from "../components/Paginacion";
import usePaginacion from "../hooks/usePaginacion";
import AccesosInusuales from "../components/AccesosInusuales";

// Bitácora de accesos (solo Administración): quién vio o modificó los datos de cada paciente.
// La escribe el backend en cada petición (bitacora_accesos.py); aquí solo se consulta.

const ACCIONES = {
  ver: { texto: "Vio", clase: "bg-slate-100 text-slate-700" },
  crear: { texto: "Creó", clase: "bg-green-100 text-green-800" },
  modificar: { texto: "Modificó", clase: "bg-blue-100 text-blue-800" },
  anular: { texto: "Anuló", clase: "bg-red-100 text-red-800" },
};

const fecha = (t) => new Date(t).toLocaleString("es-GT", { dateStyle: "medium", timeStyle: "short" });

export default function Bitacora() {
  const [params, setParams] = useSearchParams();
  const { pacientes } = usePacientesSeleccionables(true);
  const [usuario, setUsuario] = useState("");
  const [accion, setAccion] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [resultado, setResultado] = useState(null);
  const [error, setError] = useState(null);
  const [cargando, setCargando] = useState(false);
  const pacienteId = params.get("paciente") ?? "";

  const consultar = useCallback(() => {
    setCargando(true);
    client
      .get("/bitacora/accesos", {
        params: { paciente_id: pacienteId || undefined, usuario: usuario.trim() || undefined, accion: accion || undefined,
          desde: desde || undefined, hasta: hasta || undefined, limite: 1000 },
      })
      .then((r) => { setResultado(r.data); setError(null); })
      .catch((err) => setError(mensajeError(err)))
      .finally(() => setCargando(false));
  }, [pacienteId, usuario, accion, desde, hasta]);

  // Consulta al cambiar un filtro (el texto del usuario espera a que se deje de escribir)
  useEffect(() => {
    const t = setTimeout(consultar, 350);
    return () => clearTimeout(t);
  }, [consultar]);

  const registros = resultado?.data ?? [];
  const pag = usePaginacion(registros, 25, `${pacienteId}|${usuario}|${accion}|${desde}|${hasta}`);
  const elegido = pacientes.find((p) => String(p.id) === pacienteId);
  const hayFiltros = pacienteId || usuario || accion || desde || hasta;
  const totales = resultado?.totales ?? {};

  // Desde un acceso inusual: la tabla muestra solo lo de esa persona en esas fechas
  function verInusual(a) {
    setParams({});
    setUsuario(a.usuario);
    setAccion({ muchas_anulaciones: "anular", muchos_pacientes: "ver" }[a.tipo] ?? "");
    setDesde(a.desde.slice(0, 10));
    setHasta(a.hasta.slice(0, 10));
    document.getElementById("filtros-bitacora")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="p-6">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-1">
        <h1 className="text-2xl font-bold text-gray-800">Bitácora de accesos</h1>
        <BotonesExportar nombre={elegido ? `bitacora_paciente_${elegido.id}` : "bitacora_accesos"}
          titulo={elegido ? `Bitácora de accesos · ${elegido.nombre_completo}` : "Bitácora de accesos"} filas={registros} columnas={[
            { titulo: "Fecha y hora", valor: (r) => r.fecha.replace("T", " "), ancho: 19 },
            { titulo: "Usuario", valor: (r) => r.usuario, ancho: 18 },
            { titulo: "Nombre", valor: (r) => r.nombre ?? "", ancho: 26 },
            { titulo: "Puesto", valor: (r) => r.puesto ?? "", ancho: 16 },
            { titulo: "Acción", valor: (r) => ACCIONES[r.accion]?.texto ?? r.accion, ancho: 10 },
            { titulo: "Descripción", valor: (r) => r.descripcion, ancho: 42 },
            { titulo: "Paciente", valor: (r) => r.paciente ?? "", ancho: 30 },
            { titulo: "No. paciente", valor: (r) => r.paciente_id ?? "", ancho: 12 },
            { titulo: "Dirección IP", valor: (r) => r.ip ?? "", ancho: 16 },
          ]} />
      </div>

      <AccesosInusuales onVer={verInusual} />

      <div id="filtros-bitacora" className="bg-white border rounded-lg p-4 shadow-sm mb-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
        <label className="text-sm lg:col-span-2">Paciente
          <BuscadorPaciente pacientes={pacientes} valor={pacienteId}
            onCambio={(id) => setParams(id ? { paciente: id } : {})} placeholder="Todos los pacientes (nombre o DPI)" />
        </label>
        <label className="text-sm">Usuario
          <input value={usuario} onChange={(e) => setUsuario(e.target.value)} maxLength={100} placeholder="Usuario o nombre"
            className="border rounded px-3 py-1.5 w-full" />
        </label>
        <label className="text-sm">Desde
          <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className="border rounded px-3 py-1.5 w-full" />
        </label>
        <label className="text-sm">Hasta
          <input type="date" value={hasta} min={desde || undefined} onChange={(e) => setHasta(e.target.value)} className="border rounded px-3 py-1.5 w-full" />
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4" role="group" aria-label="Filtrar por acción">
        {[["", "Todas", Object.values(totales).reduce((s, n) => s + n, 0)], ...Object.entries(ACCIONES).map(([k, v]) => [k, v.texto, totales[k] ?? 0])]
          .map(([valor, texto, n]) => (
            <button key={valor || "todas"} onClick={() => setAccion(valor)} aria-pressed={accion === valor}
              className={`px-3 py-1.5 text-sm rounded-full border ${accion === valor ? "bg-blue-700 text-white border-blue-700" : "bg-white hover:bg-slate-100"}`}>
              {texto} <span className="opacity-75">({n})</span>
            </button>
          ))}
        {hayFiltros && (
          <button onClick={() => { setParams({}); setUsuario(""); setAccion(""); setDesde(""); setHasta(""); }}
            className="text-sm px-3 py-1.5 rounded border hover:bg-gray-100">Quitar filtros</button>
        )}
        <span className="text-sm text-slate-500 ml-auto">
          {cargando ? "Consultando..." : resultado && (resultado.total > registros.length
            ? `Mostrando los ${registros.length} más recientes de ${resultado.total}`
            : `${resultado.total} registro(s)`)}
        </span>
      </div>

      {error && <p className="text-sm text-red-600 mb-4">No se pudo consultar la bitácora: {error}</p>}
      {resultado && registros.length === 0 && <p className="text-sm text-slate-500">No hay accesos con estos filtros.</p>}

      {registros.length > 0 && (
        <div className="overflow-x-auto bg-white border rounded-lg shadow-sm">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b bg-gray-50 text-slate-600">
                <th className="p-2 font-medium">Fecha y hora</th>
                <th className="p-2 font-medium">Quién</th>
                <th className="p-2 font-medium">Acción</th>
                <th className="p-2 font-medium">Detalle</th>
                <th className="p-2 font-medium">Paciente</th>
                <th className="p-2 font-medium">IP</th>
              </tr>
            </thead>
            <tbody>
              {pag.items.map((r) => (
                <tr key={r.id} className="border-b last:border-0 hover:bg-slate-50 align-top">
                  <td className="p-2 whitespace-nowrap text-slate-600">{fecha(r.fecha)}</td>
                  <td className="p-2">
                    <span className="font-medium text-slate-800">{r.nombre || r.usuario}</span>
                    <span className="block text-xs text-slate-500">{r.usuario}{r.puesto ? ` · ${r.puesto}` : ""}</span>
                  </td>
                  <td className="p-2">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${ACCIONES[r.accion]?.clase ?? "bg-gray-100"}`}>
                      {ACCIONES[r.accion]?.texto ?? r.accion}
                    </span>
                  </td>
                  <td className="p-2 text-slate-700">{r.descripcion}</td>
                  <td className="p-2">
                    {r.paciente_id ? (
                      <Link to={`/pacientes/${r.paciente_id}`} className="text-blue-700 hover:underline">{r.paciente ?? `Paciente ${r.paciente_id}`}</Link>
                    ) : <span className="text-slate-400">—</span>}
                  </td>
                  <td className="p-2 text-xs text-slate-500 font-mono">{r.ip ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Paginacion {...pag} />
    </div>
  );
}
