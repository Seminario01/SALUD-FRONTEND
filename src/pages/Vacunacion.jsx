import { useCallback, useEffect, useState } from "react";
import client, { mensajeError } from "../api/client";
import useRoles from "../hooks/useRoles";
import usePacientesSeleccionables from "../hooks/usePacientesSeleccionables";

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
  const [exito, setExito] = useState(null);

  function elegirPaciente(id) {
    setPacienteId(id);
    setDatos(datosDe(buscar(id)));
    setExito(null);
    setError(null);
  }

  function enviar(e) {
    e.preventDefault();
    setEnviando(true);
    setError(null);
    setExito(null);
    const peticion = existente
      ? client.put(`/vacunacion/${pacienteId}`, datos)
      : client.post("/vacunacion", { paciente_id: Number(pacienteId), ...datos });
    peticion
      .then(() => {
        setExito(existente ? "Registro actualizado." : "Registro de vacunación creado.");
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
          <select value={pacienteId} onChange={(e) => elegirPaciente(e.target.value)} required className={campo}>
            <option value="">Seleccione...</option>
            {pacientes.map((p) => (
              <option key={p.id} value={p.id}>{p.nombre_completo} (ID {p.id})</option>
            ))}
          </select>
        </label>
        <label className="text-sm flex items-center gap-2 pb-2">
          <input
            type="checkbox"
            checked={datos.es_estudiante}
            onChange={(e) => setDatos({ ...datos, es_estudiante: e.target.checked })}
          />
          Es estudiante
        </label>
        <label className="text-sm flex items-center gap-2 pb-2">
          <input
            type="checkbox"
            checked={datos.esquema_completo}
            onChange={(e) => setDatos({ ...datos, esquema_completo: e.target.checked })}
          />
          Esquema completo
        </label>
        <label className="text-sm md:col-span-3">
          Vacunas pendientes
          <input
            value={datos.vacunas_pendientes}
            onChange={(e) => setDatos({ ...datos, vacunas_pendientes: e.target.value })}
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
        {exito && <span className="text-sm text-green-700">{exito}</span>}
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
  const { esAdmin, esMedico } = useRoles();
  const puedeGestionar = esAdmin || esMedico;
  if (!puedeGestionar) return <MiVacunacion />;
  return <VacunacionPersonal esAdmin={esAdmin} />;
}

function VacunacionPersonal({ esAdmin }) {
  const { pacientes } = usePacientesSeleccionables(true);
  const [registros, setRegistros] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [errorAccion, setErrorAccion] = useState(null);
  const [editar, setEditar] = useState(null);

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

  const nombre = (id) => pacientes.find((p) => p.id === id)?.nombre_completo ?? `ID ${id}`;

  function eliminar(r) {
    if (!window.confirm(`¿Eliminar el registro de vacunación de ${nombre(r.paciente_id)}?`)) return;
    setErrorAccion(null);
    client.delete(`/vacunacion/${r.paciente_id}`).then(cargar).catch((err) => setErrorAccion(mensajeError(err)));
  }

  if (cargando) return <p className="p-6">Cargando...</p>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-4">Vacunación</h1>

      <FormularioVacunacion
        key={editar ?? "nuevo"}
        pacientes={pacientes}
        registros={registros}
        seleccionInicial={editar}
        onGuardado={cargar}
      />

      {error && <p className="mb-4 text-red-600 text-sm">No se pudieron cargar los registros: {error}</p>}
      {errorAccion && <p className="mb-4 text-red-600 text-sm">{errorAccion}</p>}
      {!error && registros.length === 0 && <p className="text-gray-500 text-sm">No hay registros de vacunación.</p>}

      {!error && registros.length > 0 && (
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b bg-gray-100">
              <th className="p-2">Paciente</th>
              <th className="p-2">Estudiante</th>
              <th className="p-2">Esquema completo</th>
              <th className="p-2">Pendientes</th>
              <th className="p-2">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {registros.map((v) => (
              <tr key={v.id} className="border-b hover:bg-gray-50">
                <td className="p-2">{nombre(v.paciente_id)}</td>
                <td className="p-2">{v.es_estudiante ? "Sí" : "No"}</td>
                <td className="p-2"><Si valor={v.esquema_completo} /></td>
                <td className="p-2">{v.vacunas_pendientes || "—"}</td>
                <td className="p-2 space-x-1">
                  <button
                    onClick={() => { setEditar(v.paciente_id); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                    className="text-xs px-2 py-1 rounded border hover:bg-gray-100"
                  >
                    Editar
                  </button>
                  {esAdmin && (
                    <button onClick={() => eliminar(v)} className="text-xs px-2 py-1 rounded border hover:bg-gray-100 text-red-700">
                      Eliminar
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
