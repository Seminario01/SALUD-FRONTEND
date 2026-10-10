import { useEffect, useState } from "react";
import client from "../api/client";
import { LogoSalud } from "../components/Layout";

// Pantalla para la sala de espera (TV). Muestra SOLO números de turno, nunca
// nombres: está a la vista de todos. Se actualiza sola cada pocos segundos.
const REFRESCO_MS = 8000;
const TIPOS = { consulta_general: "Consulta general", emergencia: "Emergencia", especialidad: "Especialidad" };

function Reloj() {
  const [ahora, setAhora] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setAhora(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="text-right">
      <p className="text-4xl font-bold tabular-nums">{ahora.toLocaleTimeString("es-GT", { hour: "2-digit", minute: "2-digit" })}</p>
      <p className="text-blue-200 text-sm capitalize">{ahora.toLocaleDateString("es-GT", { weekday: "long", day: "numeric", month: "long" })}</p>
    </div>
  );
}

export default function PantallaTurnos() {
  const [turnos, setTurnos] = useState([]);
  const [error, setError] = useState(false);

  useEffect(() => {
    const cargar = () =>
      client
        .get("/turnos/activos")
        .then((r) => { setTurnos(r.data.data); setError(false); })
        .catch(() => setError(true));
    cargar();
    const t = setInterval(cargar, REFRESCO_MS);
    return () => clearInterval(t);
  }, []);

  const llamados = turnos.filter((t) => t.estado === "llamado");
  const enAtencion = turnos.filter((t) => t.estado === "en_atencion");
  const enEspera = turnos.filter((t) => t.estado === "en_espera");

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-sky-800 text-white p-8 flex flex-col">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <LogoSalud className="h-14 w-14 text-white" />
          <div>
            <p className="text-3xl font-bold">Turnos de atención</p>
            <p className="text-blue-200">Módulo Salud · Red Inteligente de Servicios Digitales</p>
          </div>
        </div>
        <Reloj />
      </header>

      {error && <p className="mt-6 text-amber-300">Sin conexión con el sistema. Reintentando...</p>}

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-8 mt-10">
        <section className="lg:col-span-2">
          <h2 className="text-2xl font-semibold text-blue-100 mb-4">Llamando ahora</h2>
          {llamados.length === 0 && (
            <p className="text-3xl text-blue-200/70 mt-10">Espere a ser llamado</p>
          )}
          <div className="grid sm:grid-cols-2 gap-6">
            {llamados.map((t, i) => (
              <div key={t.id} className={`rounded-3xl p-8 shadow-2xl ${i === 0 ? "bg-white text-blue-900 animate-pulse" : "bg-white/90 text-blue-900"}`}>
                <p className="text-lg font-semibold uppercase tracking-wide text-blue-600">Turno</p>
                <p className="text-8xl font-black leading-none my-2 tabular-nums">{t.numero_turno}</p>
                <p className="text-2xl font-bold">{t.modulo_asignado || "Pase a ventanilla"}</p>
                <p className="text-slate-500 mt-1">
                  {TIPOS[t.tipo_atencion] ?? t.tipo_atencion}
                  {t.prioridad === "urgente" && <span className="ml-2 text-red-600 font-semibold">· Urgente</span>}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-white/10 rounded-3xl p-6">
          <h2 className="text-2xl font-semibold mb-4">En espera <span className="text-blue-200">({enEspera.length})</span></h2>
          <div className="flex flex-wrap gap-3">
            {enEspera.map((t) => (
              <span key={t.id} className={`text-3xl font-bold rounded-xl px-4 py-2 tabular-nums ${t.prioridad === "urgente" ? "bg-red-500/80" : "bg-white/15"}`}>
                {t.numero_turno}
              </span>
            ))}
            {enEspera.length === 0 && <p className="text-blue-200">No hay turnos en espera.</p>}
          </div>
          {enAtencion.length > 0 && (
            <>
              <h3 className="text-lg font-semibold mt-8 mb-2 text-blue-100">En atención</h3>
              <p className="text-2xl text-blue-100 tabular-nums">{enAtencion.map((t) => t.numero_turno).join(" · ")}</p>
            </>
          )}
        </section>
      </div>

      <footer className="text-center text-blue-200 text-sm mt-8">
        Los turnos urgentes se atienden primero
      </footer>
    </div>
  );
}
