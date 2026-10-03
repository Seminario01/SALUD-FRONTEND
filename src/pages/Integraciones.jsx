import { useCallback, useEffect, useState } from "react";
import client, { mensajeError } from "../api/client";
import useRoles from "../hooks/useRoles";

// Integración con los otros módulos de la Red: estado, demostración en ambas
// direcciones y bitácora de llamadas. Mientras los otros equipos no publiquen
// sus servicios, responden los SIMULADORES (datos ficticios) y aquí se indica.

const MODULOS = [
  {
    clave: "seguridad", nombre: "Seguridad",
    consumimos: ["Antecedentes del paciente y si requiere custodia (WS-SALUD-08)"],
    nosConsume: ["Establecimientos disponibles ante una emergencia (WS-SALUD-02)"],
    indicadores: [["alertasActivas", "Alertas activas"], ["incidentesMes", "Incidentes del mes"]],
  },
  {
    clave: "educacion", nombre: "Educación",
    consumimos: ["Si un paciente es estudiante (vacunación)", "Estudiantes para una jornada (WS-SALUD-01)", "Validar practicantes (WS-SALUD-07)"],
    nosConsume: ["Coordinar jornadas de vacunación (WS-SALUD-01)", "Horas de práctica de un practicante (WS-SALUD-06)"],
    indicadores: [["estudiantesInscritos", "Estudiantes inscritos"], ["establecimientosActivos", "Establecimientos"]],
  },
  {
    clave: "tributario", nombre: "Tributario",
    consumimos: ["Verificar el pago de una cita (WS-SALUD-09)"],
    nosConsume: ["Costo y estado de pago de una cita"],
    indicadores: [["pagosServiciosSaludMes", "Pagos de salud (mes)"], ["pagosVerificadosMes", "Pagos verificados"]],
  },
];

const CASOS = [
  { caso: "seguridad-establecimientos", modulo: "Seguridad", texto: "Pregunta qué establecimientos atienden una emergencia" },
  { caso: "educacion-jornada", modulo: "Educación", texto: "Solicita una jornada de vacunación" },
  { caso: "educacion-practicante", modulo: "Educación", texto: "Consulta las horas de un practicante" },
  { caso: "tributario-costo", modulo: "Tributario", texto: "Consulta el costo de una cita" },
  { caso: "auditoria-indicadores", modulo: "Auditoría", texto: "Consulta los indicadores de Salud" },
];

const ESTADO = {
  conectado: { punto: "bg-green-500", texto: "Conectado" },
  no_disponible: { punto: "bg-red-500", texto: "No disponible" },
  no_configurado: { punto: "bg-slate-400", texto: "No configurado" },
};

const RESULTADO = {
  ok: "bg-green-100 text-green-800",
  no_encontrado: "bg-slate-100 text-slate-600",
};

const numero = (v) => (typeof v === "number" ? v.toLocaleString("es-GT") : v ?? "—");
const hora = (iso) => new Date(iso).toLocaleString("es-GT", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" });

function Etiqueta({ simulado }) {
  return simulado
    ? <span className="text-[11px] font-semibold uppercase tracking-wide rounded-full px-2 py-0.5 bg-amber-100 text-amber-800">Simulado</span>
    : <span className="text-[11px] font-semibold uppercase tracking-wide rounded-full px-2 py-0.5 bg-blue-100 text-blue-800">Servicio real</span>;
}

function TarjetaModulo({ modulo, estado }) {
  const e = estado ?? { estado: "no_configurado" };
  const estilo = ESTADO[e.estado] ?? ESTADO.no_disponible;
  return (
    <div className="bg-white border rounded-lg p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-bold text-slate-800 text-lg">{modulo.nombre}</h2>
        {e.estado === "conectado" && <Etiqueta simulado={e.simulado} />}
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

function ResultadoDemo({ r }) {
  if (r.error) return <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{r.error}</p>;
  const d = r.data;
  return (
    <div className="rounded-lg border border-slate-200 overflow-hidden text-sm">
      <div className="bg-slate-50 px-4 py-3 border-b border-slate-200">
        <p className="font-medium text-slate-800">{d.origen} → Salud <span className="text-slate-400 font-normal">· {d.duracionMs} ms</span></p>
        <p className="text-slate-500">{d.contexto}</p>
      </div>
      <div className="grid md:grid-cols-2">
        <div className="p-4 md:border-r border-slate-200">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Petición de {d.origen}</p>
          <p className="font-mono text-xs break-all"><span className="font-bold text-blue-700">{d.peticion.metodo}</span> {d.peticion.ruta}</p>
          <p className="font-mono text-[11px] text-slate-500 mt-1">X-API-Key: ••••••  ·  X-Modulo-Origen: {d.origen}</p>
          {d.peticion.cuerpo && (
            <pre className="mt-2 bg-slate-900 text-slate-100 rounded-lg p-3 text-[11px] overflow-auto max-h-48">{JSON.stringify(d.peticion.cuerpo, null, 2)}</pre>
          )}
        </div>
        <div className="p-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
            Respuesta de Salud <span className={d.respuesta.status < 400 ? "text-green-700" : "text-red-700"}>({d.respuesta.status ?? "sin respuesta"})</span>
          </p>
          <pre className="bg-slate-900 text-slate-100 rounded-lg p-3 text-[11px] overflow-auto max-h-72">{JSON.stringify(d.respuesta.cuerpo, null, 2)}</pre>
        </div>
      </div>
    </div>
  );
}

export default function Integraciones() {
  const { esAdmin, esMedico } = useRoles();
  const puedeProbar = esAdmin || esMedico;
  const [estado, setEstado] = useState(null);
  const [bitacora, setBitacora] = useState(null);
  const [filtroModulo, setFiltroModulo] = useState("");
  const [filtroDireccion, setFiltroDireccion] = useState("");
  const [demo, setDemo] = useState(null);
  const [probando, setProbando] = useState(null);

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

  function probar(caso) {
    setProbando(caso);
    client.post(`/integraciones/simular/${caso}`)
      .then((r) => setDemo({ data: r.data.data }))
      .catch((err) => setDemo({ error: mensajeError(err) }))
      .finally(() => { setProbando(null); cargarBitacora(); });
  }

  const haySimulados = estado && Object.values(estado).some((e) => e.simulado);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Integración con otros módulos</h1>
        <p className="text-slate-500 mt-1 max-w-3xl">
          Salud intercambia información con Educación, Seguridad, Tributario y Auditoría Social. El navegador nunca
          llama directo a otro módulo: lo hace el backend de Salud, con la API key acordada entre equipos y el token del usuario.
        </p>
      </div>

      {haySimulados && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p className="font-semibold">Algunos módulos responden con simuladores</p>
          <p className="mt-0.5">
            Mientras sus equipos publican sus servicios, Salud se conecta a simuladores construidos a partir del contrato
            acordado, con datos ficticios. Cuando un módulo publique su servicio real, solo se cambia su URL en la
            configuración; el sistema de Salud no cambia.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {MODULOS.map((m) => <TarjetaModulo key={m.clave} modulo={m} estado={estado?.[m.clave]} />)}
      </div>
      {!estado && <p className="text-sm text-slate-400">Verificando conexión...</p>}

      {puedeProbar && (
        <section className="bg-white border rounded-lg p-5">
          <h2 className="font-bold text-slate-700">Probar: otro módulo consulta a Salud</h2>
          <p className="text-sm text-slate-500 mt-1 mb-4">
            El módulo simulado hace una petición real a los servicios de Salud, con su API key, y aquí se ve qué pidió y qué
            le respondió Salud. Las consultas que Salud hace a los demás se prueban desde Pacientes (antecedentes),
            Vacunación (estudiante) y Citas (verificar pago).
          </p>
          <div className="flex flex-wrap gap-2 mb-4">
            {CASOS.map((c) => (
              <button key={c.caso} onClick={() => probar(c.caso)} disabled={probando !== null}
                className="text-sm px-3 py-2 rounded-lg border border-slate-300 hover:bg-blue-50 hover:border-blue-300 disabled:opacity-50 text-left">
                <span className="font-semibold text-blue-700">{c.modulo}:</span> {probando === c.caso ? "Consultando..." : c.texto}
              </button>
            ))}
          </div>
          {demo && <ResultadoDemo r={demo} />}
        </section>
      )}

      <section className="bg-white border rounded-lg p-5">
        <div className="flex flex-wrap items-end justify-between gap-3 mb-3">
          <div>
            <h2 className="font-bold text-slate-700">Bitácora de llamadas</h2>
            <p className="text-sm text-slate-500">Últimas 50 · se actualiza sola · los CUI se muestran enmascarados</p>
          </div>
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
                      {r.simulado && <span className="ml-1 text-[10px] font-semibold uppercase text-amber-700">sim</span>}
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
