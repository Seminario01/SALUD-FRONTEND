import { useEffect, useState } from "react";
import client, { mensajeError } from "../api/client";

// Sección "Auditoría Social" de Integraciones: demuestra que los servicios para Auditoría están listos
// y, si su tablero no recibe datos, dice por qué (GET /integraciones/auditoria). Cada consulta de
// Auditoría queda registrada, también las rechazadas, con el motivo en palabras.
const fecha = (t) => (t ? new Date(t).toLocaleString("es-GT", { dateStyle: "medium", timeStyle: "short" }) : "—");

function Paso({ ok, titulo, children }) {
  return (
    <li className="flex gap-3">
      <span className={`mt-0.5 h-6 w-6 shrink-0 rounded-full grid place-items-center text-sm font-bold ${ok ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-800"}`}
        aria-label={ok ? "Listo" : "Pendiente"}>{ok ? "✓" : "!"}</span>
      <div><p className="font-medium text-slate-800">{titulo}</p><div className="text-sm text-slate-600">{children}</div></div>
    </li>
  );
}

export default function AuditoriaSocial() {
  const [panel, setPanel] = useState(null);
  const [error, setError] = useState(null);
  const [prueba, setPrueba] = useState(null);
  const [probando, setProbando] = useState(false);

  const cargar = () => client.get("/integraciones/auditoria")
    .then((r) => { setPanel(r.data.data); setError(null); })
    .catch((e) => setError(mensajeError(e)));
  useEffect(() => { cargar(); }, []);

  function probar() {
    setProbando(true);
    client.post("/integraciones/auditoria/probar")
      .then((r) => setPrueba(r.data.data))
      .catch((e) => setPrueba({ error: mensajeError(e) }))
      .finally(() => { setProbando(false); cargar(); });
  }

  if (error) return <section className="bg-white border rounded-lg p-5 text-sm text-red-600">No se pudo cargar Auditoría Social: {error}</section>;
  if (!panel) return null;
  const exitosa = panel.ultima_exitosa;
  const conf = panel.configuracion;

  return (
    <section className="bg-white border rounded-lg p-5 space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-bold text-slate-700 text-lg">Auditoría Social</h2>
          <p className="text-sm text-slate-500 max-w-2xl">
            Salud le entrega a Auditoría solo cifras, sin datos personales. Aquí se ve que los servicios están listos y
            cada consulta de Auditoría, también las rechazadas, con el motivo.
          </p>
        </div>
        <button onClick={probar} disabled={probando} className="bg-blue-700 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-800 disabled:opacity-60">
          {probando ? "Probando..." : "Probar ahora"}
        </button>
      </div>

      {prueba && (prueba.error
        ? <p className="text-sm text-red-700" role="alert">{prueba.error}</p>
        : (
          <div className={`rounded-lg border p-3 ${prueba.todo_bien ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}>
            <p className={`font-semibold text-sm ${prueba.todo_bien ? "text-emerald-800" : "text-amber-800"}`}>
              {prueba.todo_bien ? "Todo responde: los servicios para Auditoría están listos." : "Hay algo pendiente:"}
            </p>
            <ul className="mt-1 text-sm space-y-0.5">
              {prueba.pasos.map((p) => <li key={p.nombre}>{p.ok ? "✓" : "✗"} <b>{p.nombre}:</b> {p.texto}</li>)}
            </ul>
          </div>
        ))}

      <ol className="space-y-3">
        <Paso ok titulo="Servicios publicados">
          {panel.servicios.map((s) => (
            <span key={s.ruta} className="block"><b>{s.nombre}:</b> <code className="text-xs">{s.ruta}</code> · {s.credencial}</span>
          ))}
        </Paso>
        <Paso ok titulo="Token del Login Único">
          Se acepta el token de <code className="text-xs">{conf.login_unico}</code> con audiencia <code className="text-xs">{conf.audiencia}</code>;
          el tablero pide el rol <code className="text-xs">{conf.rol_tablero}</code>.
        </Paso>
        <Paso ok={conf.clave_auditoria} titulo="Clave propia de Auditoría (X-API-Key, opcional)">
          {conf.clave_auditoria ? "Configurada en el servidor." : "No configurada. No hace falta para el tablero, que entra con el token; solo si Auditoría quiere consultar desde su servidor sin usuario."}
        </Paso>
        <Paso ok={Boolean(exitosa)} titulo="Auditoría ya consultó a Salud con éxito">
          {exitosa
            ? <>Última vez: <b>{fecha(exitosa.fecha)}</b> · {exitosa.operacion} · {exitosa.detalle}. En 7 días: {panel.exitosas_7_dias} consultas exitosas.</>
            : "Todavía no hay una consulta exitosa de Auditoría. Mientras su tablero no consulte con la credencial correcta, aquí queda pendiente."}
        </Paso>
      </ol>

      {panel.rechazos.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <p className="font-semibold text-amber-900 text-sm">
            {panel.rechazadas_7_dias} consulta(s) rechazada(s) en 7 días: alguien intenta consultar sin la credencial correcta
          </p>
          <ul className="mt-2 space-y-2 text-sm">
            {panel.rechazos.map((r) => (
              <li key={r.motivo}>
                <b>{r.explicacion}</b> <span className="text-slate-600">({r.veces} vez/veces, la última {fecha(r.ultimo)})</span>
                <span className="block text-xs text-slate-500">{r.ruta} · {r.ejemplo}</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-amber-900">Compártale este motivo a Auditoría: es lo que le falta para que su tablero reciba los datos.</p>
        </div>
      )}

      {panel.intentos.length > 0 && (
        <details>
          <summary className="cursor-pointer text-sm text-blue-700">Ver las últimas {panel.intentos.length} consultas de Auditoría</summary>
          <table className="w-full mt-2 text-sm">
            <thead><tr className="text-left"><th className="p-2">Fecha</th><th className="p-2">Servicio</th><th className="p-2">Resultado</th><th className="p-2">Detalle</th></tr></thead>
            <tbody>
              {panel.intentos.map((i, n) => (
                <tr key={`${i.fecha}-${n}`}>
                  <td className="p-2 whitespace-nowrap">{fecha(i.fecha)}</td>
                  <td className="p-2">{i.operacion}{i.prueba && <span className="ml-1 text-[11px] bg-slate-100 text-slate-600 rounded px-1">prueba</span>}</td>
                  <td className="p-2"><span className={i.resultado === "ok" ? "text-emerald-700 font-medium" : "text-red-700"}>{i.resultado === "ok" ? "Respondió" : `Rechazada (${i.estado_http})`}</span></td>
                  <td className="p-2 text-xs text-slate-600">{i.detalle || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      )}
    </section>
  );
}
