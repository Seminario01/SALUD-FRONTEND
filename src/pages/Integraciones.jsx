import { useCallback, useEffect, useState } from "react";
import client, { mensajeError } from "../api/client";
import { TarjetaAuditoria } from "../components/AuditoriaSocial";
import MapaServicios from "../components/MapaServicios";

// Integración con los otros módulos de la Red: estado de cada conexión y bitácora de llamadas.

const MODULOS = [
  {
    clave: "seguridad", nombre: "Seguridad",
    consumimos: ["Antecedentes del paciente y si requiere custodia (WS-SALUD-08)"],
    nosConsume: ["Establecimientos disponibles ante una emergencia (WS-SALUD-02)"],
    indicadores: [["alertasActivas", "Alertas activas"], ["incidentesMes", "Incidentes del mes"]],
  },
  {
    clave: "educacion", nombre: "Educación",
    consumimos: ["Si un paciente es estudiante (vacunación)", "Estudiantes para una jornada (WS-SALUD-01)"],
    nosConsume: ["Coordinar jornadas de vacunación (WS-SALUD-01)", "Horas de práctica de un practicante (WS-SALUD-06)"],
    indicadores: [["estudiantesInscritos", "Estudiantes inscritos"], ["establecimientosActivos", "Establecimientos"]],
  },
  {
    clave: "tributario", nombre: "Tributario",
    consumimos: ["Registrar el cobro de una cita (obligación de pago)", "Consultar si el cobro ya se pagó"],
    nosConsume: ["Aviso de pago de una obligación", "Costo y estado de pago de una cita"],
    indicadores: [["pagosServiciosSaludMes", "Pagos de salud (mes)"], ["pagosVerificadosMes", "Pagos verificados"]],
  },
];

const ESTADO = {
  conectado: { punto: "bg-green-500", texto: "Conectado" },
  no_disponible: { punto: "bg-red-500", texto: "No disponible" },
  no_configurado: { punto: "bg-slate-400", texto: "No conectado" },
};

const RESULTADO = {
  ok: "bg-green-100 text-green-800",
  no_encontrado: "bg-slate-100 text-slate-600",
};

const numero = (v) => (typeof v === "number" ? v.toLocaleString("es-GT") : v ?? "—");
const hora = (iso) => new Date(iso).toLocaleString("es-GT", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" });

function TarjetaModulo({ modulo, estado }) {
  const e = estado ?? { estado: "no_configurado" };
  const estilo = ESTADO[e.estado] ?? ESTADO.no_disponible;
  return (
    <div className="bg-white border rounded-lg p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-bold text-slate-800 text-lg">{modulo.nombre}</h2>
      </div>
      <p className="flex items-center gap-2 text-sm text-slate-600">
        <span className={`h-2.5 w-2.5 rounded-full ${estilo.punto}`} /> {estilo.texto}
      </p>
      {e.indicadores && (
        <dl className="grid grid-cols-2 gap-2">
          {modulo.indicadores.map(([k, t]) => (
            <div key={k} className="rounded-lg bg-slate-50 px-3 py-2">
              <dt className="text-[11px] text-slate-500">{t}</dt>
              <dd className="font-semibold text-slate-800 tabular-nums">{numero(e.indicadores[k])}</dd>
            </div>
          ))}
        </dl>
      )}
      <div className="text-sm">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Salud le consulta</p>
        <ul className="mt-1 text-slate-700 list-disc list-inside">{modulo.consumimos.map((c) => <li key={c}>{c}</li>)}</ul>
      </div>
      <div className="text-sm">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Le consulta a Salud</p>
        <ul className="mt-1 text-slate-700 list-disc list-inside">{modulo.nosConsume.map((c) => <li key={c}>{c}</li>)}</ul>
      </div>
    </div>
  );
}

export default function Integraciones() {
  const [estado, setEstado] = useState(null);
  const [bitacora, setBitacora] = useState(null);
  const [filtroModulo, setFiltroModulo] = useState("");
  const [filtroDireccion, setFiltroDireccion] = useState("");

  const cargarBitacora = useCallback(() => {
    const params = { limite: 50 };
    if (filtroModulo) params.modulo = filtroModulo;
    if (filtroDireccion) params.direccion = filtroDireccion;
    return client.get("/integraciones/bitacora", { params })
      .then((r) => setBitacora({ datos: r.data.data, totales: r.data.totales }))
      .catch((err) => setBitacora({ error: mensajeError(err) }));
  }, [filtroModulo, filtroDireccion]);

  useEffect(() => {
    client.get("/integraciones/estado").then((r) => setEstado(r.data.data)).catch(() => setEstado({}));
  }, []);

  useEffect(() => {
    cargarBitacora();
    const t = setInterval(cargarBitacora, 10000);
    return () => clearInterval(t);
  }, [cargarBitacora]);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Integración con otros módulos</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {MODULOS.map((m) => <TarjetaModulo key={m.clave} modulo={m} estado={estado?.[m.clave]} />)}
        <TarjetaAuditoria />
      </div>
      {!estado && <p className="text-sm text-slate-400">Verificando conexión...</p>}

      <MapaServicios conexion={estado} actualizar={bitacora} />

      <section className="bg-white border rounded-lg p-5">
        <div className="flex flex-wrap items-end justify-between gap-3 mb-3">
          <h2 className="font-bold text-slate-700">Bitácora de llamadas</h2>
          <div className="flex flex-wrap gap-2 text-sm">
            <select value={filtroModulo} onChange={(e) => setFiltroModulo(e.target.value)} className="border rounded px-2 py-1.5">
              <option value="">Todos los módulos</option>
              {["Educación", "Seguridad", "Tributario", "Auditoría", "Otro"].map((m) => <option key={m}>{m}</option>)}
            </select>
            <select value={filtroDireccion} onChange={(e) => setFiltroDireccion(e.target.value)} className="border rounded px-2 py-1.5">
              <option value="">Ambas direcciones</option>
              <option value="saliente">Salud consulta a otro módulo</option>
              <option value="entrante">Otro módulo consulta a Salud</option>
            </select>
          </div>
        </div>

        {bitacora?.error && <p className="text-sm text-red-600">{bitacora.error}</p>}
        {bitacora?.datos?.length === 0 && <p className="text-sm text-slate-500">Todavía no hay llamadas registradas.</p>}
        {bitacora?.datos?.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-slate-500 border-b">
                  <th className="py-2 pr-3">Fecha</th><th className="py-2 pr-3">Dirección</th><th className="py-2 pr-3">Operación</th>
                  <th className="py-2 pr-3">Resultado</th><th className="py-2 pr-3">Detalle</th><th className="py-2">Usuario</th>
                </tr>
              </thead>
              <tbody>
                {bitacora.datos.map((r) => (
                  <tr key={r.id} className="border-b last:border-0 align-top">
                    <td className="py-2 pr-3 whitespace-nowrap text-slate-500 tabular-nums">{hora(r.fecha)}</td>
                    <td className="py-2 pr-3 whitespace-nowrap">
                      {r.direccion === "saliente"
                        ? <span>Salud <span className="text-blue-600">→</span> <b>{r.modulo}</b></span>
                        : <span><b>{r.modulo}</b> <span className="text-blue-600">→</span> Salud</span>}
                    </td>
                    <td className="py-2 pr-3">
                      <p className="text-slate-800">{r.operacion}</p>
                      <p className="font-mono text-[11px] text-slate-400 break-all">{r.metodo} {r.ruta}</p>
                    </td>
                    <td className="py-2 pr-3 whitespace-nowrap">
                      <span className={`text-xs rounded-full px-2 py-0.5 ${RESULTADO[r.resultado] ?? "bg-red-100 text-red-800"}`}>
                        {r.resultado === "ok" ? "OK" : r.resultado.replaceAll("_", " ")}
                      </span>
                      <span className="block text-[11px] text-slate-400 mt-0.5">{r.estadoHttp ?? "—"} · {r.duracionMs ?? "—"} ms</span>
                    </td>
                    <td className="py-2 pr-3 text-slate-600 max-w-xs">{r.detalle || "—"}</td>
                    <td className="py-2 text-slate-500 whitespace-nowrap">{r.usuario || "(servicio)"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
