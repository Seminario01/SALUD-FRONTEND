import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import client, { mensajeError } from "../api/client";
import useRoles from "../hooks/useRoles";
import usePacientesSeleccionables from "../hooks/usePacientesSeleccionables";
import BuscadorPaciente from "../components/BuscadorPaciente";
import { useAvisos } from "../components/Avisos";

// Lista de espera de citas: pacientes que quieren cita y no había espacio. Cuando alguien cancela,
// se llama al primero (el que lleva más tiempo), se le da la cita y sale de la lista.

const campo = "border rounded px-3 py-1.5 w-full";
const ESTADO = { ESPERANDO: "bg-amber-100 text-amber-800", AVISADO: "bg-blue-100 text-blue-800" };

// Teléfono de Guatemala (8 dígitos) a formato internacional para WhatsApp
function whatsapp(telefono) {
  const d = String(telefono ?? "").replace(/\D/g, "");
  if (d.length === 8) return `502${d}`;
  if (d.length === 11 && d.startsWith("502")) return d;
  return null;
}

function Agregar({ onAgregado }) {
  const { pacientes } = usePacientesSeleccionables(true);
  const [pacienteId, setPacienteId] = useState("");
  const [motivo, setMotivo] = useState("");
  const [preferencia, setPreferencia] = useState("");
  const [error, setError] = useState(null);
  const [enviando, setEnviando] = useState(false);

  function enviar(e) {
    e.preventDefault();
    setEnviando(true);
    setError(null);
    client.post("/citas/lista-espera", { paciente_id: Number(pacienteId), motivo, preferencia: preferencia || undefined })
      .then((r) => { onAgregado(r.data.message); setPacienteId(""); setMotivo(""); setPreferencia(""); })
      .catch((err) => setError(mensajeError(err)))
      .finally(() => setEnviando(false));
  }

  return (
    <form onSubmit={enviar} className="bg-white border rounded-lg p-4 shadow-sm mb-6">
      <h2 className="font-bold text-gray-700 mb-3">Agregar a la lista de espera</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <label className="text-sm">Paciente *
          <BuscadorPaciente pacientes={pacientes} valor={pacienteId} onCambio={setPacienteId} requerido />
        </label>
        <label className="text-sm">Motivo *
          <input value={motivo} onChange={(e) => setMotivo(e.target.value)} required minLength={3} maxLength={255}
            placeholder="Ej.: Control de presión" className={campo} />
        </label>
        <label className="text-sm">Preferencia
          <input value={preferencia} onChange={(e) => setPreferencia(e.target.value)} maxLength={150}
            placeholder="Ej.: Por las mañanas" className={campo} />
        </label>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button type="submit" disabled={enviando || !pacienteId} className="bg-blue-700 text-white px-4 py-1.5 rounded hover:bg-blue-800 disabled:opacity-50">
          {enviando ? "Agregando..." : "Agregar"}
        </button>
        {error && <span className="text-sm text-red-600">{error}</span>}
      </div>
    </form>
  );
}

// Dar la cita a quien estaba esperando: se crea la cita y sale de la lista
function Agendar({ entrada, onListo, onCancelar }) {
  const [fecha, setFecha] = useState("");
  const [error, setError] = useState(null);
  function enviar(e) {
    e.preventDefault();
    setError(null);
    client.post("/citas", { paciente_id: entrada.paciente_id, fecha_hora: fecha.replace("T", " "), motivo: entrada.motivo })
      .then((r) => client.put(`/citas/lista-espera/${entrada.id}`, { estado: "AGENDADO", cita_id: r.data.data.id }))
      .then(() => onListo(`Cita agendada para ${entrada.paciente}. Salió de la lista de espera.`))
      .catch((err) => setError(mensajeError(err)));
  }
  return (
    <form onSubmit={enviar} className="flex flex-wrap items-center gap-2 mt-2">
      <input type="datetime-local" value={fecha} onChange={(e) => setFecha(e.target.value)} required
        aria-label={`Fecha y hora de la cita de ${entrada.paciente}`} className="border rounded px-2 py-1 text-sm" />
      <button type="submit" className="text-xs px-3 py-1.5 rounded bg-green-700 text-white hover:bg-green-800">Dar la cita</button>
      <button type="button" onClick={onCancelar} className="text-xs px-3 py-1.5 rounded border hover:bg-gray-100">Cancelar</button>
      {error && <span className="text-xs text-red-600 w-full">{error}</span>}
    </form>
  );
}

export default function ListaEspera() {
  const { puede } = useRoles();
  const gestiona = puede("citas.gestionar");
  const avisos = useAvisos();
  const [lista, setLista] = useState(null);
  const [error, setError] = useState(null);
  const [agendando, setAgendando] = useState(null);

  const cargar = useCallback(() => {
    client.get("/citas/lista-espera").then((r) => { setLista(r.data.data); setError(null); })
      .catch((err) => setError(mensajeError(err)));
  }, []);
  useEffect(() => { cargar(); }, [cargar]);

  function cambiar(e, estado) {
    client.put(`/citas/lista-espera/${e.id}`, { estado })
      .then((r) => { avisos.exito(r.data.message); cargar(); })
      .catch((err) => avisos.error(mensajeError(err)));
  }

  return (
    <div className="p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
        <h1 className="text-2xl font-bold text-gray-800">Lista de espera de citas</h1>
        <Link to="/citas" className="text-sm text-blue-700 hover:underline">← Volver a citas</Link>
      </div>
      <p className="text-sm text-slate-500 mb-4">
        Cuando se cancela una cita, llame primero a quien lleva más tiempo esperando. Al darle la cita, sale de la lista.
      </p>
      {gestiona && <Agregar onAgregado={(m) => { avisos.exito(m); cargar(); }} />}
      {error && <p className="text-sm text-red-600 mb-4">No se pudo cargar la lista: {error}</p>}
      {lista === null && !error && <p className="text-sm text-slate-400">Cargando...</p>}
      {lista?.length === 0 && <p className="text-sm text-slate-500">Nadie está esperando cita.</p>}
      {lista?.length > 0 && (
        <ol className="space-y-2">
          {lista.map((e, i) => {
            const wa = whatsapp(e.telefono);
            return (
              <li key={e.id} className="bg-white border rounded-lg p-3 shadow-sm">
                <div className="flex flex-wrap items-start gap-x-4 gap-y-1">
                  <span className="text-lg font-bold text-slate-400 tabular-nums w-8">{i + 1}</span>
                  <div className="flex-1 min-w-48">
                    <Link to={`/pacientes/${e.paciente_id}`} className="font-semibold text-blue-800 hover:underline">{e.paciente}</Link>
                    <p className="text-sm text-slate-700">{e.motivo}{e.preferencia ? ` · ${e.preferencia}` : ""}</p>
                    <p className="text-xs text-slate-500">
                      Esperando {e.dias_esperando === 0 ? "desde hoy" : `${e.dias_esperando} día(s)`}
                      {e.nota ? ` · ${e.nota}` : ""}
                    </p>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${ESTADO[e.estado] ?? "bg-gray-100"}`}>
                    {e.estado === "AVISADO" ? "Ya se le avisó" : "Esperando"}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2 mt-2 pl-12">
                  {e.telefono && <a href={`tel:${e.telefono}`} className="text-xs px-3 py-1.5 rounded border hover:bg-gray-100">📞 {e.telefono}</a>}
                  {wa && (
                    <a href={`https://wa.me/${wa}?text=${encodeURIComponent(`Buenas, le escribimos del Módulo Salud: se liberó un espacio para su cita (${e.motivo}). ¿Le interesa?`)}`}
                      target="_blank" rel="noreferrer" className="text-xs px-3 py-1.5 rounded border hover:bg-gray-100">WhatsApp</a>
                  )}
                  {gestiona && e.estado === "ESPERANDO" && (
                    <button onClick={() => cambiar(e, "AVISADO")} className="text-xs px-3 py-1.5 rounded border hover:bg-gray-100">Marcar como avisado</button>
                  )}
                  {gestiona && agendando !== e.id && (
                    <button onClick={() => setAgendando(e.id)} className="text-xs px-3 py-1.5 rounded bg-blue-700 text-white hover:bg-blue-800">Agendar</button>
                  )}
                  {gestiona && <button onClick={() => cambiar(e, "CANCELADA")} className="text-xs px-3 py-1.5 rounded border text-red-700 hover:bg-red-50">Sacar de la lista</button>}
                </div>
                {agendando === e.id && (
                  <div className="pl-12">
                    <Agendar entrada={e} onCancelar={() => setAgendando(null)}
                      onListo={(m) => { avisos.exito(m); setAgendando(null); cargar(); }} />
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
