import { useCallback, useEffect, useState } from "react";
import client, { mensajeError } from "../api/client";
import useRoles from "../hooks/useRoles";
import usePacientesSeleccionables from "../hooks/usePacientesSeleccionables";

// Un expediente clínico es información sensible, siempre ligada a UN paciente:
// el backend expone GET /expedientes/<paciente_id> (médico, admin o el propio
// ciudadano) y POST /expedientes/<paciente_id>/atenciones (solo médico).

function formatoFecha(texto) {
  const fecha = new Date(String(texto).replace(" ", "T"));
  return isNaN(fecha) ? texto : fecha.toLocaleString("es-GT", { dateStyle: "medium", timeStyle: "short" });
}

function FormularioAtencion({ pacienteId, onRegistrada }) {
  const VACIO = { diagnostico: "", tratamiento: "", notas: "", cita_id: "" };
  const [datos, setDatos] = useState(VACIO);
  const [citas, setCitas] = useState([]);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);
  const [exito, setExito] = useState(null);

  // Citas de ESTE paciente, para asociar la atención (opcional)
  useEffect(() => {
    client
      .get("/citas", { params: { paciente_id: pacienteId } })
      .then((res) => setCitas(res.data.data.filter((c) => c.estado !== "cancelada")))
      .catch(() => setCitas([]));
  }, [pacienteId]);

  function cambiar(e) {
    setDatos({ ...datos, [e.target.name]: e.target.value });
  }

  function enviar(e) {
    e.preventDefault();
    setEnviando(true);
    setError(null);
    setExito(null);
    const cuerpo = {
      diagnostico: datos.diagnostico,
      tratamiento: datos.tratamiento || undefined,
      notas: datos.notas || undefined,
      cita_id: datos.cita_id ? Number(datos.cita_id) : undefined,
    };
    client
      .post(`/expedientes/${pacienteId}/atenciones`, cuerpo)
      .then(() => {
        setExito("Atención registrada en el expediente.");
        setDatos(VACIO);
        onRegistrada();
      })
      .catch((err) => setError(mensajeError(err)))
      .finally(() => setEnviando(false));
  }

  const campo = "border rounded px-3 py-1.5 w-full";
  return (
    <form onSubmit={enviar} className="bg-white border rounded-lg p-4 shadow-sm mb-6">
      <h2 className="font-bold text-gray-700 mb-3">Registrar atención</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <label className="text-sm">
          Diagnóstico *
          <input name="diagnostico" value={datos.diagnostico} onChange={cambiar} required className={campo} />
        </label>
        <label className="text-sm">
          Cita asociada (opcional)
          <select name="cita_id" value={datos.cita_id} onChange={cambiar} className={campo}>
            <option value="">Sin cita</option>
            {citas.map((c) => (
              <option key={c.id} value={c.id}>
                {formatoFecha(c.fecha_hora)} · {c.estado}{c.motivo ? ` · ${c.motivo}` : ""}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm md:col-span-2">
          Tratamiento
          <textarea name="tratamiento" value={datos.tratamiento} onChange={cambiar} rows={2} className={campo} />
        </label>
        <label className="text-sm md:col-span-2">
          Notas
          <textarea name="notas" value={datos.notas} onChange={cambiar} rows={2} className={campo} />
        </label>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <button
          type="submit"
          disabled={enviando}
          className="bg-blue-700 text-white px-4 py-1.5 rounded hover:bg-blue-800 disabled:opacity-50"
        >
          {enviando ? "Guardando..." : "Registrar atención"}
        </button>
        {exito && <span className="text-sm text-green-700">{exito}</span>}
        {error && <span className="text-sm text-red-600">{error}</span>}
      </div>
    </form>
  );
}

function Historial({ registros }) {
  if (registros.length === 0) {
    return <p className="text-gray-500 text-sm">Este paciente no tiene atenciones registradas.</p>;
  }
  return (
    <div className="space-y-3">
      {registros.map((e) => (
        <div key={e.id} className="bg-white border rounded-lg p-4 shadow-sm">
          <p className="text-sm text-gray-400">
            {formatoFecha(e.fecha_atencion)}
            {e.cita_id && <span> · cita #{e.cita_id}</span>}
          </p>
          <p className="font-bold text-gray-700">{e.diagnostico}</p>
          {e.tratamiento && <p className="text-sm text-gray-600">Tratamiento: {e.tratamiento}</p>}
          {e.notas && <p className="text-sm text-gray-500 italic">Notas: {e.notas}</p>}
        </div>
      ))}
    </div>
  );
}

export default function Expedientes() {
  const { puede } = useRoles();
  const puedeVerTodos = puede("expediente.ver"); // Recepción, Caja y Farmacia NO ven expedientes
  const registra = puede("expediente.registrar");
  const { pacientes, aviso } = usePacientesSeleccionables(puedeVerTodos);
  const [elegido, setElegido] = useState("");
  // El ciudadano solo tiene su propio registro: se elige solo
  const pacienteId = puedeVerTodos ? elegido : pacientes[0]?.id ?? "";

  const [registros, setRegistros] = useState(null);
  const [error, setError] = useState(null);

  const cargar = useCallback(() => {
    if (!pacienteId) return;
    client
      .get(`/expedientes/${pacienteId}`)
      .then((res) => {
        setRegistros(res.data.data);
        setError(null);
      })
      .catch((err) => {
        setRegistros(null);
        setError(mensajeError(err));
      });
  }, [pacienteId]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const nombre = pacientes.find((p) => String(p.id) === String(pacienteId))?.nombre_completo;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-4">
        {puedeVerTodos ? "Expediente clínico" : "Mi expediente"}
      </h1>

      {aviso && (
        <p className="mb-4 text-sm text-gray-600 bg-yellow-50 border border-yellow-200 rounded p-3">
          {puedeVerTodos ? aviso : "No tiene permiso para ver expedientes, o su usuario no está vinculado a un paciente."}
        </p>
      )}

      {puedeVerTodos && (
        <label className="text-sm block mb-6 max-w-md">
          Paciente
          <select
            value={elegido}
            onChange={(e) => { setElegido(e.target.value); setRegistros(null); }}
            className="border rounded px-3 py-1.5 w-full"
          >
            <option value="">Seleccione un paciente...</option>
            {pacientes.map((p) => (
              <option key={p.id} value={p.id}>{p.nombre_completo} (ID {p.id})</option>
            ))}
          </select>
        </label>
      )}

      {pacienteId && registra && <FormularioAtencion key={pacienteId} pacienteId={pacienteId} onRegistrada={cargar} />}

      {error && <p className="text-red-600 text-sm">{error}</p>}
      {pacienteId && registros && (
        <>
          {nombre && puedeVerTodos && <h2 className="font-bold text-gray-700 mb-2">Historial de {nombre}</h2>}
          <Historial registros={registros} />
        </>
      )}
    </div>
  );
}
