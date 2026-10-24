import { useEffect, useState } from "react";
import client, { mensajeError } from "../api/client";

// Panel con las últimas llamadas de un servicio entre módulos (GET /integraciones/servicios/{clave}/llamadas):
// a dónde se hizo, qué se envió y qué se respondió. Los datos personales llegan enmascarados del backend.

const fechaHora = (iso) => new Date(iso).toLocaleString("es-GT", { dateStyle: "medium", timeStyle: "medium" });
const VALIDAS = ["ok", "no_encontrado"];

function Json({ titulo, valor }) {
  return (
    <div>
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">{titulo}</p>
      {valor === null || valor === undefined ? (
        <p className="text-sm text-slate-400">—</p>
      ) : (
        <pre className="text-xs bg-slate-50 border rounded-lg p-3 overflow-x-auto max-h-80 whitespace-pre-wrap break-all text-slate-800">
          {typeof valor === "string" ? valor : JSON.stringify(valor, null, 2)}
        </pre>
      )}
    </div>
  );
}

function Llamada({ ll, abierta }) {
  const valida = VALIDAS.includes(ll.resultado);
  return (
    <details open={abierta} className="border rounded-lg">
      <summary className="cursor-pointer list-none px-3 py-2 flex flex-wrap items-center gap-x-3 gap-y-1 hover:bg-slate-50">
        <span className={`text-xs rounded-full px-2 py-0.5 ${valida ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
          {ll.resultado === "ok" ? "OK" : ll.resultado.replaceAll("_", " ")}
        </span>
        <span className="text-sm text-slate-800 tabular-nums">{fechaHora(ll.fecha)}</span>
        <span className="text-xs text-slate-500">HTTP {ll.estadoHttp ?? "—"} · {ll.duracionMs ?? "—"} ms · {ll.usuario || ll.modulo}</span>
        {ll.simulado && <span className="text-xs rounded bg-amber-100 text-amber-800 px-1.5">prueba</span>}
      </summary>
      <div className="px-3 pb-3 pt-1 space-y-3">
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">A dónde</p>
          <p className="font-mono text-xs break-all text-slate-800">{ll.metodo} {ll.url ?? ll.ruta}</p>
        </div>
        {ll.solicitud === null && ll.respuesta === null ? (
          <p className="text-sm text-slate-500">
            Esta llamada es de antes de que se guardara el detalle. Resumen: {ll.detalle || "—"}
          </p>
        ) : (
          <>
            <Json titulo="Lo que se envió" valor={ll.solicitud} />
            <Json titulo="Lo que respondió" valor={ll.respuesta} />
          </>
        )}
      </div>
    </details>
  );
}

export default function DetalleServicio({ clave, onCerrar }) {
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let vigente = true;
    client.get(`/integraciones/servicios/${clave}/llamadas`, { params: { limite: 10 } })
      .then((r) => { if (vigente) setDatos(r.data.data); })
      .catch((err) => { if (vigente) setError(mensajeError(err)); });
    return () => { vigente = false; };
  }, [clave]);

  useEffect(() => {
    const tecla = (e) => { if (e.key === "Escape") onCerrar(); };
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [onCerrar]);

  const s = datos?.servicio;
  return (
    <div className="fixed inset-0 z-30 flex justify-end print:hidden" role="dialog" aria-modal="true" aria-label="Detalle del servicio">
      <div className="absolute inset-0 bg-slate-900/40" onClick={onCerrar} />
      <aside className="relative h-full w-full max-w-2xl bg-white shadow-xl overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-5 py-3 flex items-start justify-between gap-3 z-10">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              {s ? (s.direccion === "saliente" ? `Salud → ${s.modulo}` : `${s.modulo} → Salud`) : "Servicio"}
            </p>
            <h2 className="text-lg font-bold text-slate-800">{s ? `${s.codigo ? `${s.codigo} · ` : ""}${s.nombre}` : "Cargando..."}</h2>
            {s && <p className="font-mono text-xs text-slate-500 break-all">{s.metodo} {s.ruta}</p>}
          </div>
          <button onClick={onCerrar} className="rounded p-1.5 hover:bg-slate-100" aria-label="Cerrar" autoFocus>
            <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M5 5l10 10M15 5L5 15" /></svg>
          </button>
        </div>
        <div className="p-5 space-y-3">
          {error && <p className="text-sm text-red-600">{error}</p>}
          {s?.donde && <p className="text-sm text-slate-600">Se usa en: {s.donde}</p>}
          {datos && (
            <p className="text-xs text-slate-500">
              Últimas {datos.llamadas.length} llamada(s). Los datos personales se guardan enmascarados (DPI con sus últimos 4
              dígitos, nombres como iniciales) y la API key nunca se guarda.
            </p>
          )}
          {datos?.llamadas.length === 0 && <p className="text-sm text-slate-500">Todavía no hay llamadas de este servicio.</p>}
          {datos?.llamadas.map((ll, i) => <Llamada key={ll.id} ll={ll} abierta={i === 0} />)}
        </div>
      </aside>
    </div>
  );
}
