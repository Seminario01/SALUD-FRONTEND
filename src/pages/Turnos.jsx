import { useCallback, useEffect, useState } from "react";
import NombrePaciente from "../components/NombrePaciente";
import client, { mensajeError } from "../api/client";
import useRoles from "../hooks/useRoles";
import usePacientesSeleccionables from "../hooks/usePacientesSeleccionables";
import BuscadorPaciente from "../components/BuscadorPaciente";
import { useAvisos } from "../components/Avisos";
import { TRIAGE, textoTriage } from "../utils/triage";

const TIPOS = {
  consulta_general: "Consulta general",
  emergencia: "Emergencia",
  especialidad: "Especialidad",
};

const TEXTO_ESTADO = { en_espera: "en espera", llamado: "llamado", en_atencion: "en atención" };

const ESTADOS = {
  en_espera: "bg-yellow-100 text-yellow-800",
  llamado: "bg-blue-100 text-blue-800",
  en_atencion: "bg-green-100 text-green-800",
};

function FormularioTurno({ onCreado }) {
  const { puede } = useRoles();
  const clasifica = puede("turnos.clasificar");
  const [triage, setTriage] = useState("");
  const [motivo, setMotivo] = useState("");
  const { pacientes, aviso } = usePacientesSeleccionables(true);
  const [pacienteId, setPacienteId] = useState("");
  const [tipo, setTipo] = useState("consulta_general");
  const [prioridad, setPrioridad] = useState("normal");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);
  const avisos = useAvisos();

  function enviar(e) {
    e.preventDefault();
    setEnviando(true);
    setError(null);
    client
      .post("/turnos", {
        paciente_id: Number(pacienteId), tipo_atencion: tipo, prioridad,
        ...(triage ? { triage, motivo_triage: motivo || undefined } : {}),
      })
      .then((res) => {
        const t = res.data.data;
        avisos.exito(`Turno N° ${t.numero_turno} generado (${t.posicion_en_fila} en espera).`);
        setPacienteId("");
        setTriage("");
        setMotivo("");
        onCreado();
      })
      .catch((err) => setError(mensajeError(err)))
      .finally(() => setEnviando(false));
  }

  if (aviso) return <p className="mb-6 text-sm text-red-600">{aviso}</p>;

  const campo = "border rounded px-3 py-1.5 w-full";
  return (
    <form onSubmit={enviar} className="bg-white border rounded-lg p-4 shadow-sm mb-6">
      <h2 className="font-bold text-gray-700 mb-3">Generar turno</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <label className="text-sm">
          Paciente *
          <BuscadorPaciente pacientes={pacientes} valor={pacienteId} onCambio={setPacienteId} requerido />
        </label>
        <label className="text-sm">
          Tipo de atención
          <select value={tipo} onChange={(e) => setTipo(e.target.value)} className={campo}>
            {Object.entries(TIPOS).map(([valor, texto]) => (
              <option key={valor} value={valor}>{texto}</option>
            ))}
          </select>
        </label>
        {clasifica ? (
          <label className="text-sm">
            Triage (urgencia)
            <select value={triage} onChange={(e) => setTriage(e.target.value)} className={campo}>
              <option value="">Sin clasificar todavía</option>
              {Object.keys(TRIAGE).map((n) => <option key={n} value={n}>{textoTriage(n)}</option>)}
            </select>
          </label>
        ) : (
          <label className="text-sm">
            Prioridad
            <select value={prioridad} onChange={(e) => setPrioridad(e.target.value)} className={campo}>
              <option value="normal">Normal</option>
              <option value="urgente">Urgente</option>
            </select>
          </label>
        )}
        {clasifica && triage && (
          <label className="text-sm md:col-span-3">
            Motivo de la clasificación
            <input value={motivo} onChange={(e) => setMotivo(e.target.value)} maxLength={255}
              placeholder="Ej.: Dolor torácico de 30 minutos, sudoración" className={campo} />
          </label>
        )}
      </div>
      <div className="mt-3 flex items-center gap-3">
        <button
          type="submit"
          disabled={enviando || !pacienteId}
          className="bg-blue-700 text-white px-4 py-1.5 rounded hover:bg-blue-800 disabled:opacity-50"
        >
          {enviando ? "Generando..." : "Generar turno"}
        </button>
        {error && <span className="text-sm text-red-600">{error}</span>}
      </div>
    </form>
  );
}

// Siguiente paso del flujo de un turno: en_espera -> llamado -> en_atencion -> atendido
const SIGUIENTE = {
  en_espera: { accion: "llamar", texto: "Llamar" },
  llamado: { accion: "atender", texto: "Atender" },
  en_atencion: { accion: "finalizar", texto: "Finalizar" },
};

// Cuánto lleva esperando, en rojo si ya pasó el tiempo recomendado para su nivel de triage
function Espera({ t }) {
  if (t.espera_min === undefined || t.espera_min === null) return null;
  const texto = t.espera_min >= 60 ? `${Math.floor(t.espera_min / 60)} h ${t.espera_min % 60} min` : `${t.espera_min} min`;
  return <span className={`tabular-nums ${t.excede ? "text-red-700 font-semibold" : "text-slate-600"}`}
    title={t.excede ? `Pasó el tiempo recomendado (${t.objetivo_min} min)` : undefined}>{texto}{t.excede ? " ⚠" : ""}</span>;
}

export default function Turnos() {
  const { puedeGenerarTurnos, puedeAtenderTurnos, puede } = useRoles();
  const clasifica = puede("turnos.clasificar");
  const avisos = useAvisos();
  const [turnos, setTurnos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [errorAccion, setErrorAccion] = useState(null);
  const [consultorio, setConsultorio] = useState("Consultorio 1");

  const cargar = useCallback(() => {
    client
      .get("/turnos/activos")
      .then((res) => {
        setTurnos(res.data.data);
        setError(null);
      })
      .catch((err) => setError(mensajeError(err)))
      .finally(() => setCargando(false));
  }, []);

  // Se actualiza sola cada 30 segundos (los tiempos de espera cambian y otros generan turnos)
  useEffect(() => {
    cargar();
    const t = setInterval(cargar, 30000);
    return () => clearInterval(t);
  }, [cargar]);

  function clasificar(turno, nivel) {
    client.put(`/turnos/${turno.id}/triage`, { triage: nivel })
      .then((r) => { avisos.exito(r.data.message); cargar(); })
      .catch((err) => setErrorAccion(mensajeError(err)));
  }

  function avanzar(turno) {
    setErrorAccion(null);
    const accion = SIGUIENTE[turno.estado].accion;
    client
      .put(`/turnos/${turno.id}/${accion}`, accion === "llamar" ? { modulo_asignado: consultorio } : {})
      .then(cargar)
      .catch((err) => setErrorAccion(mensajeError(err)));
  }

  if (cargando) return <p className="p-6">Cargando...</p>;

  return (
    <div className="p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h1 className="text-2xl font-bold text-gray-800">Turnos activos</h1>
        <div className="flex flex-wrap items-center gap-3">
          {puedeAtenderTurnos && (
            <label className="text-sm flex items-center gap-2">
              Llamar a:
              <select value={consultorio} onChange={(e) => setConsultorio(e.target.value)} className="border rounded px-2 py-1">
                {["Consultorio 1", "Consultorio 2", "Consultorio 3", "Consultorio 4", "Emergencias"].map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
          )}
          <a href="/turnos/pantalla" target="_blank" rel="noreferrer"
            className="text-sm px-3 py-1.5 rounded-lg border border-blue-700 text-blue-700 hover:bg-blue-50">
            Abrir pantalla de sala de espera ↗
          </a>
        </div>
      </div>

      {puedeGenerarTurnos && <FormularioTurno onCreado={cargar} />}

      {error && <p className="mb-4 text-red-600 text-sm">No se pudieron cargar los turnos: {error}</p>}
      {errorAccion && <p className="mb-4 text-red-600 text-sm">{errorAccion}</p>}

      {!error && turnos.length === 0 && (
        <p className="text-gray-500 text-sm">No hay turnos activos en este momento.</p>
      )}

      {!error && turnos.length > 0 && (
        <div className="overflow-x-auto bg-white border rounded-lg">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b bg-gray-100">
              <th className="p-2">N° turno</th>
              {turnos.some((t) => "paciente" in t) && <th className="p-2">Paciente</th>}
              <th className="p-2">Tipo de atención</th>
              <th className="p-2">Triage</th>
              {turnos.some((t) => "espera_min" in t) && <th className="p-2">Espera</th>}
              <th className="p-2">Estado</th>
              {puedeAtenderTurnos && <th className="p-2">Acción</th>}
            </tr>
          </thead>
          <tbody>
            {turnos.map((t) => (
              <tr key={t.id} className="border-b hover:bg-gray-50">
                <td className="p-2 font-bold">{t.numero_turno}</td>
                {"paciente" in t && <td className="p-2">{t.paciente_id ? <NombrePaciente id={t.paciente_id} nombre={t.paciente} /> : "—"}</td>}
                <td className="p-2">
                  {TIPOS[t.tipo_atencion] ?? t.tipo_atencion}
                  {t.modulo_asignado && <span className="block text-xs text-slate-500">{t.modulo_asignado}</span>}
                </td>
                <td className="p-2">
                  {clasifica && t.estado !== "atendido" ? (
                    <select value={t.triage ?? ""} onChange={(e) => e.target.value && clasificar(t, e.target.value)}
                      aria-label={`Triage del turno ${t.numero_turno}`} title={t.motivo_triage || undefined}
                      style={TRIAGE[t.triage] ? { backgroundColor: TRIAGE[t.triage].fondo, color: TRIAGE[t.triage].letra } : undefined}
                      className={`rounded px-2 py-1 text-sm font-medium ${TRIAGE[t.triage]?.clase ?? (t.prioridad === "urgente" ? "border border-red-300 text-red-700" : "border")}`}>
                      {!t.triage && <option value="">{t.prioridad === "urgente" ? "Urgente · sin clasificar" : "Sin clasificar"}</option>}
                      {Object.keys(TRIAGE).map((n) => <option key={n} value={n} className="bg-white text-slate-900">{textoTriage(n)}</option>)}
                    </select>
                  ) : t.triage ? (
                    <span className={`px-2 py-1 rounded text-xs font-medium ${TRIAGE[t.triage].clase}`} title={t.motivo_triage || undefined}>
                      {textoTriage(t.triage)}
                    </span>
                  ) : (
                    <span className={t.prioridad === "urgente" ? "text-red-700 font-semibold text-sm" : "text-slate-500 text-sm"}>
                      {t.prioridad === "urgente" ? "Urgente" : "Sin clasificar"}
                    </span>
                  )}
                  {t.motivo_triage && <span className="block text-xs text-slate-500 mt-0.5 max-w-56">{t.motivo_triage}</span>}
                </td>
                {"espera_min" in t && <td className="p-2 text-sm"><Espera t={t} /></td>}
                <td className="p-2">
                  <span className={`px-2 py-1 rounded text-sm ${ESTADOS[t.estado] ?? "bg-gray-100"}`}>
                    {TEXTO_ESTADO[t.estado] ?? t.estado}
                  </span>
                </td>
                {puedeAtenderTurnos && (
                  <td className="p-2">
                    {SIGUIENTE[t.estado] && (
                      <button
                        onClick={() => avanzar(t)}
                        className="text-xs px-2 py-1 rounded border hover:bg-gray-100"
                      >
                        {SIGUIENTE[t.estado].texto}
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      )}
    </div>
  );
}
