import { useEffect, useState } from "react";
import client, { mensajeError } from "../api/client";

// Accesos que conviene revisar (los calcula el backend en /bitacora/inusuales): muchos pacientes
// vistos en una hora, muchas anulaciones en un día, accesos de noche de puestos de día y muchas IP.
// Solo avisa; "Ver en la bitácora" filtra la tabla de abajo por esa persona y esas fechas.

const NIVEL = {
  alto: { texto: "Revisar pronto", clase: "border-red-200 bg-red-50", etiqueta: "bg-red-100 text-red-800" },
  medio: { texto: "Para revisar", clase: "border-amber-200 bg-amber-50", etiqueta: "bg-amber-100 text-amber-800" },
};
const TIPO = { muchos_pacientes: "Muchos pacientes en una hora", muchas_anulaciones: "Muchas anulaciones",
  noche: "Acceso de noche", muchas_ips: "Muchas direcciones IP" };
const PERIODOS = [[1, "Hoy"], [7, "Últimos 7 días"], [30, "Últimos 30 días"]];

const cuando = (a) => {
  const d = new Date(a.desde);
  const dia = d.toLocaleDateString("es-GT", { weekday: "short", day: "numeric", month: "short" });
  if (a.tipo === "muchos_pacientes") return `${dia}, de ${d.toLocaleTimeString("es-GT", { hour: "2-digit", minute: "2-digit" })} a la hora siguiente`;
  if (a.tipo === "noche") {
    const h = (t) => new Date(t).toLocaleTimeString("es-GT", { hour: "2-digit", minute: "2-digit" });
    return `${dia}, de ${h(a.desde)} a ${h(a.hasta)}`;
  }
  return dia;
};

export default function AccesosInusuales({ onVer }) {
  const [dias, setDias] = useState(7);
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState(null);
  const [abierto, setAbierto] = useState(true);

  useEffect(() => {
    client
      .get("/bitacora/inusuales", { params: { dias } })
      .then((r) => { setDatos(r.data.data); setError(null); })
      .catch((err) => setError(mensajeError(err)));
  }, [dias]);

  const altos = datos?.filter((a) => a.nivel === "alto").length ?? 0;
  return (
    <section className="bg-white border rounded-lg p-4 shadow-sm mb-4" aria-labelledby="inusuales-titulo">
      <div className="flex flex-wrap items-center gap-2">
        <h2 id="inusuales-titulo" className="font-semibold text-slate-800">Accesos inusuales</h2>
        {datos && (
          <span className={`px-2 py-0.5 rounded text-xs font-medium ${datos.length ? (altos ? NIVEL.alto.etiqueta : NIVEL.medio.etiqueta) : "bg-green-100 text-green-800"}`}>
            {datos.length ? `${datos.length} para revisar` : "Nada fuera de lo normal"}
          </span>
        )}
        <select value={dias} onChange={(e) => setDias(Number(e.target.value))} aria-label="Periodo de los accesos inusuales"
          className="ml-auto border rounded px-2 py-1 text-sm">
          {PERIODOS.map(([n, t]) => <option key={n} value={n}>{t}</option>)}
        </select>
        {datos?.length > 0 && (
          <button onClick={() => setAbierto((x) => !x)} aria-expanded={abierto} className="text-sm px-2 py-1 rounded border hover:bg-gray-100">
            {abierto ? "Ocultar" : "Mostrar"}
          </button>
        )}
      </div>
      {error && <p className="text-sm text-red-600 mt-2">No se pudieron revisar los accesos: {error}</p>}
      {datos === null && !error && <p className="text-sm text-slate-400 mt-2">Revisando...</p>}
      {abierto && datos?.length > 0 && (
        <ul className="mt-3 grid grid-cols-1 lg:grid-cols-2 gap-2">
          {datos.map((a) => (
            <li key={`${a.tipo}-${a.usuario}-${a.desde}`} className={`rounded-lg border p-3 ${NIVEL[a.nivel]?.clase ?? ""}`}>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${NIVEL[a.nivel]?.etiqueta ?? ""}`}>{NIVEL[a.nivel]?.texto ?? a.nivel}</span>
                <span className="text-xs font-medium text-slate-600">{TIPO[a.tipo] ?? a.tipo}</span>
              </div>
              <p className="mt-1 text-sm text-slate-800">
                <span className="font-semibold">{a.nombre || a.usuario}</span>
                <span className="text-slate-500"> ({a.usuario}{a.puesto ? ` · ${a.puesto}` : ""})</span>
              </p>
              <p className="text-sm text-slate-700">{a.texto}.</p>
              <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs text-slate-500">{cuando(a)}</span>
                <button onClick={() => onVer(a)} className="text-xs text-blue-700 hover:underline">Ver en la bitácora →</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
