import { useCallback, useEffect, useState } from "react";
import NombrePaciente from "../components/NombrePaciente";
import { Link } from "react-router-dom";
import client, { mensajeError } from "../api/client";
import { useAvisos } from "../components/Avisos";
import SelectorResidencia from "../components/SelectorResidencia";

// Completar la residencia de los pacientes que no la tienen (para que entren al mapa de vigilancia).
// Primero los que tuvieron atenciones recientes. El municipio del DPI es solo una sugerencia:
// es donde se inscribió la persona; conviene confirmarlo con ella (por teléfono o en su próxima visita).

const fecha = (t) => (t ? new Date(t).toLocaleDateString("es-GT", { dateStyle: "medium" }) : null);
const campo = "border rounded px-3 py-1.5 w-full text-sm";

function Fila({ p, onGuardado }) {
  const avisos = useAvisos();
  const [datos, setDatos] = useState({ municipio: "", zona: "" });
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null);

  function guardar(municipio = datos.municipio) {
    setGuardando(true);
    setError(null);
    client.put(`/pacientes/${p.id}`, { municipio, zona: datos.zona || undefined })
      .then(() => { avisos.exito(`Residencia de ${p.nombre_completo} guardada.`); onGuardado(p.id); })
      .catch((err) => setError(mensajeError(err)))
      .finally(() => setGuardando(false));
  }

  return (
    <li className="bg-white border rounded-lg p-3 shadow-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <NombrePaciente paciente={p} />
          <span className="text-xs text-slate-500"> · DPI {p.cui || "sin registrar"}{p.telefono ? ` · Tel. ${p.telefono}` : ""}</span>
        </div>
        <span className="text-xs text-slate-500">
          {p.atenciones_recientes ? `${p.atenciones_recientes} atención(es) en 90 días` : p.ultima_atencion ? `Última atención: ${fecha(p.ultima_atencion)}` : "Sin atenciones"}
        </span>
      </div>
      {p.sugerido && !datos.municipio && (
        <div className="mt-2 flex flex-wrap items-center gap-2 rounded bg-blue-50 px-2 py-1.5 text-sm">
          <span>Según el DPI se inscribió en <span className="font-semibold">{p.sugerido.nombre}, {p.sugerido.departamento_nombre}</span>.</span>
          <button onClick={() => guardar(p.sugerido.codigo)} disabled={guardando}
            className="text-xs px-3 py-1 rounded bg-blue-700 text-white hover:bg-blue-800 disabled:opacity-50">Vive ahí: guardar</button>
          <span className="text-xs text-slate-500">o elija otro abajo</span>
        </div>
      )}
      <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-2">
        <SelectorResidencia municipio={datos.municipio} zona={datos.zona} campo={campo} onCambio={(c) => setDatos((d) => ({ ...d, ...c }))} />
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button onClick={() => guardar()} disabled={guardando || !datos.municipio}
          className="text-sm px-3 py-1.5 rounded bg-green-700 text-white hover:bg-green-800 disabled:opacity-50">
          {guardando ? "Guardando..." : "Guardar residencia"}
        </button>
        {error && <span className="text-sm text-red-600">{error}</span>}
      </div>
    </li>
  );
}

export default function CompletarResidencia() {
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState(null);
  const [listos, setListos] = useState(0);

  const cargar = useCallback(() => {
    client.get("/pacientes/sin-residencia", { params: { limite: 50 } })
      .then((r) => { setDatos(r.data); setError(null); })
      .catch((err) => setError(mensajeError(err)));
  }, []);
  useEffect(() => { cargar(); }, [cargar]);

  function guardado(id) {
    setListos((n) => n + 1);
    setDatos((d) => ({ ...d, total: d.total - 1, data: d.data.filter((p) => p.id !== id) }));
  }

  return (
    <div className="p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
        <h1 className="text-2xl font-bold text-gray-800">Completar residencia de pacientes</h1>
        <Link to="/pacientes" className="text-sm text-blue-700 hover:underline">← Volver a pacientes</Link>
      </div>
      {error && <p className="text-sm text-red-600 mb-4">No se pudo cargar la lista: {error}</p>}
      {datos === null && !error && <p className="text-sm text-slate-400">Cargando...</p>}
      {datos && (
        <p className="mb-3 text-sm">
          <span className="font-semibold tabular-nums">{datos.total}</span> paciente(s) sin residencia
          {listos > 0 && <span className="text-green-700"> · {listos} completado(s) ahora</span>}
          {datos.total > datos.data.length && <span className="text-slate-500"> · mostrando {datos.data.length}</span>}
        </p>
      )}
      {datos?.total === 0 && <p className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">✓ Todos los pacientes tienen residencia registrada.</p>}
      <ul className="space-y-2">
        {(datos?.data ?? []).map((p) => <Fila key={p.id} p={p} onGuardado={guardado} />)}
      </ul>
      {datos && datos.data.length === 0 && datos.total > 0 && (
        <button onClick={cargar} className="mt-3 text-sm px-3 py-1.5 rounded border hover:bg-gray-100">Cargar los siguientes</button>
      )}
    </div>
  );
}
