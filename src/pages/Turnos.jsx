import { useCallback, useEffect, useState } from "react";
import client, { mensajeError } from "../api/client";
import useRoles from "../hooks/useRoles";
import usePacientesSeleccionables from "../hooks/usePacientesSeleccionables";

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
  const { pacientes, aviso } = usePacientesSeleccionables(true);
  const [pacienteId, setPacienteId] = useState("");
  const [tipo, setTipo] = useState("consulta_general");
  const [prioridad, setPrioridad] = useState("normal");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);
  const [exito, setExito] = useState(null);

  function enviar(e) {
    e.preventDefault();
    setEnviando(true);
    setError(null);
    setExito(null);
    client
      .post("/turnos", { paciente_id: Number(pacienteId), tipo_atencion: tipo, prioridad })
      .then((res) => {
        const t = res.data.data;
        setExito(`Turno N° ${t.numero_turno} generado (${t.posicion_en_fila} en espera).`);
        setPacienteId("");
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
          <select value={pacienteId} onChange={(e) => setPacienteId(e.target.value)} required className={campo}>
            <option value="">Seleccione...</option>
            {pacientes.map((p) => (
              <option key={p.id} value={p.id}>{p.nombre_completo} (ID {p.id})</option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          Tipo de atención
          <select value={tipo} onChange={(e) => setTipo(e.target.value)} className={campo}>
            {Object.entries(TIPOS).map(([valor, texto]) => (
              <option key={valor} value={valor}>{texto}</option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          Prioridad
          <select value={prioridad} onChange={(e) => setPrioridad(e.target.value)} className={campo}>
            <option value="normal">Normal</option>
            <option value="urgente">Urgente</option>
          </select>
        </label>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <button
          type="submit"
          disabled={enviando || !pacienteId}
          className="bg-blue-700 text-white px-4 py-1.5 rounded hover:bg-blue-800 disabled:opacity-50"
        >
          {enviando ? "Generando..." : "Generar turno"}
        </button>
        {exito && <span className="text-sm text-green-700">{exito}</span>}
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

export default function Turnos() {
  const { puedeGenerarTurnos, puedeAtenderTurnos } = useRoles();
  const [turnos, setTurnos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [errorAccion, setErrorAccion] = useState(null);

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

  useEffect(() => {
    cargar();
  }, [cargar]);

  function avanzar(turno) {
    setErrorAccion(null);
    client
      .put(`/turnos/${turno.id}/${SIGUIENTE[turno.estado].accion}`)
      .then(cargar)
      .catch((err) => setErrorAccion(mensajeError(err)));
  }

  if (cargando) return <p className="p-6">Cargando...</p>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-4">Turnos activos</h1>

      {puedeGenerarTurnos && <FormularioTurno onCreado={cargar} />}

      {error && <p className="mb-4 text-red-600 text-sm">No se pudieron cargar los turnos: {error}</p>}
      {errorAccion && <p className="mb-4 text-red-600 text-sm">{errorAccion}</p>}

      {!error && turnos.length === 0 && (
        <p className="text-gray-500 text-sm">No hay turnos activos en este momento.</p>
      )}

      {!error && turnos.length > 0 && (
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b bg-gray-100">
              <th className="p-2">N° turno</th>
              <th className="p-2">Tipo de atención</th>
              <th className="p-2">Prioridad</th>
              <th className="p-2">Estado</th>
              {puedeAtenderTurnos && <th className="p-2">Acción</th>}
            </tr>
          </thead>
          <tbody>
            {turnos.map((t) => (
              <tr key={t.id} className="border-b hover:bg-gray-50">
                <td className="p-2 font-bold">{t.numero_turno}</td>
                <td className="p-2">{TIPOS[t.tipo_atencion] ?? t.tipo_atencion}</td>
                <td className={`p-2 capitalize ${t.prioridad === "urgente" ? "text-red-700 font-semibold" : ""}`}>
                  {t.prioridad}
                </td>
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
      )}
    </div>
  );
}
