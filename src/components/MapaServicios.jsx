import { useEffect, useState } from "react";
import client, { mensajeError } from "../api/client";
import BotonesExportar from "./Exportar";

// Mapa de servicios entre Salud y los otros módulos (GET /integraciones/servicios): cada API que
// Salud consume y cada API que le consumen, con la última llamada real que funcionó. Sirve para
// demostrar la integración: la prueba sale de la bitácora, no de lo que dice el contrato.

const fechaHora = (iso) => new Date(iso).toLocaleString("es-GT", { dateStyle: "medium", timeStyle: "short" });

function hace(iso) {
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 1) return "hace un momento";
  if (min < 60) return `hace ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.round(h / 24);
  return `hace ${d} día${d === 1 ? "" : "s"}`;
}

// "no_encontrado" también es una respuesta válida (por ejemplo, "ese CUI no es estudiante")
const VALIDAS = ["ok", "no_encontrado"];

// Estado del servicio según sus llamadas (y, para los indicadores, la verificación de conexión)
function estadoServicio(s, conexion) {
  if (VALIDAS.includes(s.ultimo?.resultado)) return { clave: "ok", texto: "Funciona", clase: "bg-green-100 text-green-800" };
  if (s.ultimoOk) return { clave: "intermitente", texto: "Funcionó; la última falló", clase: "bg-amber-100 text-amber-800" };
  if (s.ultimo) return { clave: "falla", texto: "Falla", clase: "bg-red-100 text-red-800" };
  if (s.conexion && conexion?.[s.conexion]?.estado === "conectado") {
    return { clave: "ok", texto: "Responde ahora", clase: "bg-green-100 text-green-800" };
  }
  return { clave: "sin", texto: "Sin llamadas aún", clase: "bg-slate-100 text-slate-600" };
}

function Tabla({ titulo, servicios, conexion, saliente }) {
  const funcionan = servicios.filter((s) => estadoServicio(s, conexion).clave === "ok").length;
  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-2">
        <h3 className="font-semibold text-slate-700">{titulo}</h3>
        <span className="text-sm text-slate-500">{funcionan} de {servicios.length} funcionando</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-slate-500 border-b">
              <th className="py-2 pr-3">Módulo</th>
              <th className="py-2 pr-3">Servicio</th>
              <th className="py-2 pr-3">Estado</th>
              <th className="py-2 pr-3">Última respuesta correcta</th>
              <th className="py-2 pr-3">Llamadas (30 días)</th>
              {saliente && <th className="py-2">Dónde se usa</th>}
            </tr>
          </thead>
          <tbody>
            {servicios.map((s) => {
              const e = estadoServicio(s, conexion);
              return (
                <tr key={s.clave} className="border-b last:border-0 align-top" data-servicio={s.clave}>
                  <td className="py-2 pr-3 font-medium text-slate-800 whitespace-nowrap">{s.modulo}</td>
                  <td className="py-2 pr-3">
                    <p className="text-slate-800">
                      {s.codigo && <span className="mr-1.5 rounded bg-blue-50 text-blue-800 px-1.5 py-0.5 text-[11px] font-semibold">{s.codigo}</span>}
                      {s.nombre}
                    </p>
                    <p className="font-mono text-[11px] text-slate-400 break-all">{s.metodo} {s.ruta}</p>
                  </td>
                  <td className="py-2 pr-3 whitespace-nowrap">
                    <span className={`text-xs rounded-full px-2 py-0.5 ${e.clase}`}>{e.texto}</span>
                    {e.clave !== "ok" && s.ultimo && !VALIDAS.includes(s.ultimo.resultado) && (
                      <span className="block text-[11px] text-slate-500 mt-0.5 max-w-56 whitespace-normal">
                        {s.ultimo.resultado.replaceAll("_", " ")}{s.ultimo.detalle ? `: ${s.ultimo.detalle}` : ""}
                      </span>
                    )}
                  </td>
                  <td className="py-2 pr-3">
                    {s.ultimoOk ? (
                      <>
                        <span className="text-slate-800">{hace(s.ultimoOk.fecha)}</span>
                        <span className="block text-[11px] text-slate-500">
                          {fechaHora(s.ultimoOk.fecha)} · {s.ultimoOk.estadoHttp ?? "—"} · {s.ultimoOk.duracionMs ?? "—"} ms
                          {!saliente && ` · por ${s.ultimoOk.modulo}`}
                        </span>
                      </>
                    ) : <span className="text-slate-400">—</span>}
                  </td>
                  <td className="py-2 pr-3 tabular-nums whitespace-nowrap">
                    <span className="text-green-800">{s.llamadasOk30} correctas</span>
                    {s.llamadasError30 > 0 && <span className="text-red-700"> · {s.llamadasError30} con error</span>}
                  </td>
                  {saliente && <td className="py-2 text-slate-600">{s.donde}</td>}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function MapaServicios({ conexion, actualizar }) {
  const [servicios, setServicios] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    client.get("/integraciones/servicios")
      .then((r) => { setServicios(r.data.data); setError(null); })
      .catch((err) => setError(mensajeError(err)));
  }, [actualizar]);

  const salientes = servicios?.filter((s) => s.direccion === "saliente") ?? [];
  const entrantes = servicios?.filter((s) => s.direccion === "entrante") ?? [];
  return (
    <section className="bg-white border rounded-lg p-5 space-y-6" aria-label="Servicios integrados">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 className="font-bold text-slate-700">Servicios integrados</h2>
        {servicios && (
          <BotonesExportar nombre="servicios-integrados" titulo="Servicios integrados del Módulo Salud" filas={servicios} columnas={[
            { titulo: "Dirección", valor: (s) => (s.direccion === "saliente" ? "Salud consume" : "Le consumen a Salud"), ancho: 18 },
            { titulo: "Módulo", valor: (s) => s.modulo, ancho: 12 },
            { titulo: "Código", valor: (s) => s.codigo ?? "", ancho: 12 },
            { titulo: "Servicio", valor: (s) => s.nombre, ancho: 40 },
            { titulo: "Método y ruta", valor: (s) => `${s.metodo} ${s.ruta}`, ancho: 50 },
            { titulo: "Estado", valor: (s) => estadoServicio(s, conexion).texto, ancho: 22 },
            { titulo: "Última respuesta correcta", valor: (s) => (s.ultimoOk ? fechaHora(s.ultimoOk.fecha) : ""), ancho: 22 },
            { titulo: "Llamadas correctas (30 días)", valor: (s) => s.llamadasOk30, ancho: 12 },
            { titulo: "Llamadas con error (30 días)", valor: (s) => s.llamadasError30, ancho: 12 },
          ]} />
        )}
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {!servicios && !error && <p className="text-sm text-slate-400">Cargando...</p>}
      {servicios && (
        <>
          <Tabla titulo="APIs que Salud consume" servicios={salientes} conexion={conexion} saliente />
          <Tabla titulo="APIs de Salud que consumen los otros módulos" servicios={entrantes} conexion={conexion} />
        </>
      )}
    </section>
  );
}
