import { useCallback, useEffect, useState } from "react";
import client, { mensajeError } from "../api/client";
import useRoles from "../hooks/useRoles";
import usePacientesSeleccionables from "../hooks/usePacientesSeleccionables";

const colores = {
  pendiente: "bg-yellow-100 text-yellow-800",
  confirmada: "bg-green-100 text-green-800",
  atendida: "bg-blue-100 text-blue-800",
  cancelada: "bg-red-100 text-red-800",
};

function formatoFecha(texto) {
  const fecha = new Date(String(texto).replace(" ", "T"));
  return isNaN(fecha) ? texto : fecha.toLocaleString("es-GT", { dateStyle: "medium", timeStyle: "short" });
}

function FormularioCita({ esPersonal, pacientes, aviso, onCreada }) {
  const [pacienteId, setPacienteId] = useState("");
  const [fechaHora, setFechaHora] = useState("");
  const [motivo, setMotivo] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);
  const [exito, setExito] = useState(null);

  // Un ciudadano solo tiene su propio registro: se selecciona solo
  const seleccionado = pacienteId || (!esPersonal && pacientes[0]?.id) || "";

  function enviar(e) {
    e.preventDefault();
    setEnviando(true);
    setError(null);
    setExito(null);
    client
      .post("/citas", { paciente_id: Number(seleccionado), fecha_hora: fechaHora, motivo })
      .then((res) => {
        setExito(`Cita agendada (ID ${res.data.data.id}).`);
        setFechaHora("");
        setMotivo("");
        onCreada();
      })
      .catch((err) => setError(mensajeError(err)))
      .finally(() => setEnviando(false));
  }

  if (aviso) return <p className="mb-6 text-sm text-gray-600 bg-yellow-50 border border-yellow-200 rounded p-3">{aviso}</p>;

  const campo = "border rounded px-3 py-1.5 w-full";
  return (
    <form onSubmit={enviar} className="bg-white border rounded-lg p-4 shadow-sm mb-6">
      <h2 className="font-bold text-gray-700 mb-3">Agendar cita</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {esPersonal ? (
          <label className="text-sm">
            Paciente *
            <select value={seleccionado} onChange={(e) => setPacienteId(e.target.value)} required className={campo}>
              <option value="">Seleccione...</option>
              {pacientes.map((p) => (
                <option key={p.id} value={p.id}>{p.nombre_completo} (ID {p.id})</option>
              ))}
            </select>
          </label>
        ) : (
          <p className="text-sm self-end pb-2">
            Paciente: <span className="font-semibold">{pacientes[0]?.nombre_completo}</span>
          </p>
        )}
        <label className="text-sm">
          Fecha y hora *
          <input type="datetime-local" value={fechaHora} onChange={(e) => setFechaHora(e.target.value)} required className={campo} />
        </label>
        <label className="text-sm">
          Motivo
          <input value={motivo} onChange={(e) => setMotivo(e.target.value)} maxLength={300} className={campo} />
        </label>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <button
          type="submit"
          disabled={enviando || !seleccionado}
          className="bg-blue-700 text-white px-4 py-1.5 rounded hover:bg-blue-800 disabled:opacity-50"
        >
          {enviando ? "Guardando..." : "Agendar"}
        </button>
        {exito && <span className="text-sm text-green-700">{exito}</span>}
        {error && <span className="text-sm text-red-600">{error}</span>}
      </div>
    </form>
  );
}

export default function Citas() {
  const { esPersonal } = useRoles();
  const { pacientes, aviso } = usePacientesSeleccionables(esPersonal);
  const nombrePaciente = (id) => pacientes.find((p) => p.id === id)?.nombre_completo ?? `ID ${id}`;
  const [citas, setCitas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [errorAccion, setErrorAccion] = useState(null);

  const cargar = useCallback(() => {
    client
      .get("/citas")
      .then((res) => {
        setCitas(res.data.data);
        setError(null);
      })
      // 401: la sesión venció. 403: el usuario no tiene el rol necesario.
      .catch((err) => setError(mensajeError(err)))
      .finally(() => setCargando(false));
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  function cambiarEstado(cita, estado) {
    setErrorAccion(null);
    client.put(`/citas/${cita.id}`, { estado }).then(cargar).catch((err) => setErrorAccion(mensajeError(err)));
  }

  function cancelar(cita) {
    if (!window.confirm(`¿Cancelar la cita del ${formatoFecha(cita.fecha_hora)}?`)) return;
    setErrorAccion(null);
    client.delete(`/citas/${cita.id}`).then(cargar).catch((err) => setErrorAccion(mensajeError(err)));
  }

  if (cargando) return <p className="p-6">Cargando...</p>;

  const boton = "text-xs px-2 py-1 rounded border hover:bg-gray-100";
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-4">{esPersonal ? "Citas médicas" : "Mis citas"}</h1>

      <FormularioCita esPersonal={esPersonal} pacientes={pacientes} aviso={aviso} onCreada={cargar} />

      {error && <p className="mb-4 text-red-600 text-sm">No se pudieron cargar las citas: {error}</p>}
      {errorAccion && <p className="mb-4 text-red-600 text-sm">{errorAccion}</p>}

      {!error && citas.length === 0 && <p className="text-gray-500 text-sm">No hay citas registradas.</p>}

      {!error && citas.length > 0 && (
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b bg-gray-100">
              <th className="p-2">Fecha y hora</th>
              {esPersonal && <th className="p-2">Paciente</th>}
              <th className="p-2">Motivo</th>
              <th className="p-2">Estado</th>
              <th className="p-2">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {citas.map((c) => {
              const activa = c.estado === "pendiente" || c.estado === "confirmada";
              return (
                <tr key={c.id} className="border-b hover:bg-gray-50">
                  <td className="p-2">{formatoFecha(c.fecha_hora)}</td>
                  {esPersonal && <td className="p-2 font-medium text-slate-700">{nombrePaciente(c.paciente_id)}</td>}
                  <td className="p-2">{c.motivo}</td>
                  <td className="p-2">
                    <span className={`px-2 py-1 rounded text-sm ${colores[c.estado] ?? "bg-gray-100 text-gray-800"}`}>
                      {c.estado}
                    </span>
                  </td>
                  <td className="p-2 space-x-1">
                    {esPersonal && c.estado === "pendiente" && (
                      <button onClick={() => cambiarEstado(c, "confirmada")} className={boton}>Confirmar</button>
                    )}
                    {esPersonal && c.estado === "confirmada" && (
                      <button onClick={() => cambiarEstado(c, "atendida")} className={boton}>Marcar atendida</button>
                    )}
                    {activa && (
                      <button onClick={() => cancelar(c)} className={`${boton} text-red-700`}>Cancelar</button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
