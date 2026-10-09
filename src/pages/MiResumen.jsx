import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "react-oidc-context";
import { formatoDia } from "../utils/fechas";
import client from "../api/client";

// Vista del ciudadano: solo SUS datos. El backend aplica la misma regla
// (OWASP API1): cualquier intento de ver datos ajenos responde 403.

function formatoFecha(texto, conHora = true) {
  const fecha = new Date(String(texto).replace(" ", "T"));
  if (isNaN(fecha)) return texto;
  return fecha.toLocaleString("es-GT", conHora ? { dateStyle: "long", timeStyle: "short" } : { dateStyle: "long" });
}

function Tarjeta({ titulo, to, enlace, children }) {
  return (
    <div className="bg-white border rounded-lg p-5 shadow-sm flex flex-col">
      <p className="text-sm font-semibold text-slate-500 uppercase tracking-wide">{titulo}</p>
      <div className="flex-1 mt-2">{children}</div>
      {to && (
        <Link to={to} className="text-sm text-blue-700 hover:underline mt-3">
          {enlace} →
        </Link>
      )}
    </div>
  );
}

export default function MiResumen() {
  const auth = useAuth();
  const nombre = auth.user?.profile?.given_name || auth.user?.profile?.name;
  const [paciente, setPaciente] = useState(undefined); // undefined = cargando, null = sin vínculo
  const [citas, setCitas] = useState([]);
  const [vacunacion, setVacunacion] = useState(undefined);
  const [ultimaAtencion, setUltimaAtencion] = useState(undefined);
  const [hospitalizaciones, setHospitalizaciones] = useState([]);
  const [cuentas, setCuentas] = useState([]);
  const [codigo, setCodigo] = useState(null);
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    client
      .get("/pacientes/me")
      .then((res) => {
        const p = res.data.data;
        setPaciente(p);
        client.get("/citas").then((r) => setCitas(r.data.data)).catch(() => setCitas([]));
        client.get("/hospitalizaciones").then((r) => setHospitalizaciones(r.data.data)).catch(() => setHospitalizaciones([]));
        client.get("/cuentas").then((r) => setCuentas(r.data.data)).catch(() => setCuentas([]));
        client.get(`/vacunacion/${p.id}`).then((r) => setVacunacion(r.data.data)).catch(() => setVacunacion(null));
        client
          .get(`/expedientes/${p.id}`)
          .then((r) => setUltimaAtencion(r.data.data[0] ?? null))
          .catch(() => setUltimaAtencion(null));
      })
      .catch((err) => {
        setPaciente(null);
        setCodigo(err.response?.data?.sub ?? null);
      });
  }, []);

  const ahora = new Date();
  const proximas = citas
    .filter((c) => ["pendiente", "confirmada"].includes(c.estado) && new Date(String(c.fecha_hora).replace(" ", "T")) >= ahora)
    .sort((a, b) => String(a.fecha_hora).localeCompare(String(b.fecha_hora)));
  const hospitalizacion = hospitalizaciones.find((h) => ["ACTIVO", "PENDIENTE"].includes(h.estado))
    ?? hospitalizaciones.find((h) => h.estado === "EGRESADO");
  const porPagar = [
    ...citas.filter((c) => c.estado_cobro === "PENDIENTE" && !c.pago_confirmado && c.estado !== "cancelada")
      .map((c) => ({ clave: `c${c.id}`, referencia: c.numero_referencia, concepto: c.motivo || "Consulta", monto: c.costo, vence: c.fecha_vencimiento })),
    ...cuentas.filter((c) => c.estado === "POR_COBRAR")
      .map((c) => ({ clave: `h${c.id}`, referencia: c.numero_referencia, concepto: c.tipo === "AMBULATORIA" ? "Servicios médicos" : `Hospitalización, ${c.area}`, monto: c.saldo, vence: c.fecha_vencimiento })),
  ];

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-1">Hola, {nombre}</h1>
      <p className="text-slate-500 mb-6">Resumen de su información</p>

      {paciente === undefined && <p className="text-sm text-slate-500">Cargando...</p>}

      {paciente === null && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 text-sm text-amber-900 max-w-xl">
          <p>
            Su usuario todavía no está vinculado a un registro de paciente. Acérquese a recepción y
            muestre este código para que lo vinculen:
          </p>
          {codigo && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <code className="bg-white border border-amber-200 rounded px-2 py-1 font-mono text-xs text-slate-800 break-all">{codigo}</code>
              <button
                onClick={() => navigator.clipboard?.writeText(codigo).then(() => setCopiado(true))}
                className="text-xs px-2 py-1 rounded border border-amber-300 hover:bg-amber-100"
              >
                {copiado ? "Copiado" : "Copiar"}
              </button>
            </div>
          )}
        </div>
      )}

      {paciente && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Tarjeta titulo="Mis datos">
            <p className="text-lg font-semibold text-slate-800">{paciente.nombre_completo}</p>
            <dl className="text-sm text-slate-600 mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
              <dt className="text-slate-400">CUI</dt><dd>{paciente.cui || "—"}</dd>
              <dt className="text-slate-400">Teléfono</dt><dd>{paciente.telefono || "—"}</dd>
              <dt className="text-slate-400">Seguro</dt><dd>{paciente.tipo_seguro || "—"}</dd>
            </dl>
          </Tarjeta>

          {porPagar.length > 0 && (
            <Tarjeta titulo="Pagos pendientes">
              <ul className="space-y-2">
                {porPagar.map((p) => (
                  <li key={p.clave} className="text-sm">
                    <p className="font-mono font-semibold text-slate-800">{p.referencia}</p>
                    <p className="text-slate-600">
                      {p.concepto} · Q{Number(p.monto ?? 0).toFixed(2)} · vence {formatoDia(p.vence)}
                    </p>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-slate-500 mt-3">Pague con el número de referencia en el módulo Tributario.</p>
            </Tarjeta>
          )}

          {hospitalizacion && (
            <Tarjeta titulo="Hospitalización">
              {hospitalizacion.estado === "ACTIVO" && (
                <>
                  <p className="text-lg font-semibold text-slate-800">Cama {hospitalizacion.cama} · {hospitalizacion.area}</p>
                  <p className="text-sm text-slate-600">Ingresado desde el {formatoFecha(hospitalizacion.fecha_ingreso)}</p>
                  {hospitalizacion.medico && <p className="text-sm text-slate-500">Médico tratante: Dr(a). {hospitalizacion.medico}</p>}
                </>
              )}
              {hospitalizacion.estado === "PENDIENTE" && (
                <>
                  <p className="text-lg font-semibold text-amber-600">Ingreso en trámite</p>
                  <p className="text-sm text-slate-600">{hospitalizacion.area}: se le asignará una cama en breve.</p>
                </>
              )}
              {hospitalizacion.estado === "EGRESADO" && (
                <>
                  <p className="text-lg font-semibold text-slate-800">{hospitalizacion.tipo_egreso_texto} · {formatoFecha(hospitalizacion.fecha_egreso, false)}</p>
                  {hospitalizacion.resumen_egreso && <p className="text-sm text-slate-600">{hospitalizacion.resumen_egreso}</p>}
                </>
              )}
            </Tarjeta>
          )}

          <Tarjeta titulo="Próxima cita" to="/citas" enlace={proximas.length ? "Ver mis citas" : "Agendar una cita"}>
            {proximas.length === 0 ? (
              <p className="text-sm text-slate-500">No tiene citas próximas.</p>
            ) : (
              <>
                <p className="text-lg font-semibold text-slate-800">{formatoFecha(proximas[0].fecha_hora)}</p>
                <p className="text-sm text-slate-600">
                  {proximas[0].motivo || "Consulta"} · <span className="capitalize">{proximas[0].estado}</span>
                </p>
                {proximas.length > 1 && (
                  <p className="text-xs text-slate-400 mt-1">y {proximas.length - 1} cita(s) más</p>
                )}
              </>
            )}
          </Tarjeta>

          <Tarjeta titulo="Mi vacunación" to="/vacunacion" enlace="Ver detalle">
            {vacunacion === undefined && <p className="text-sm text-slate-400">Cargando...</p>}
            {vacunacion === null && <p className="text-sm text-slate-500">Todavía no tiene registro de vacunación.</p>}
            {vacunacion && (
              <>
                <p className={`text-lg font-semibold ${vacunacion.esquema_completo ? "text-green-700" : "text-amber-600"}`}>
                  {vacunacion.esquema_completo ? "Esquema completo" : "Esquema incompleto"}
                </p>
                {vacunacion.vacunas_pendientes && (
                  <p className="text-sm text-slate-600">Pendientes: {vacunacion.vacunas_pendientes}</p>
                )}
              </>
            )}
          </Tarjeta>

          <Tarjeta titulo="Última atención" to="/expedientes" enlace="Ver mi expediente">
            {ultimaAtencion === undefined && <p className="text-sm text-slate-400">Cargando...</p>}
            {ultimaAtencion === null && <p className="text-sm text-slate-500">No tiene atenciones registradas.</p>}
            {ultimaAtencion && (
              <>
                <p className="text-lg font-semibold text-slate-800">{ultimaAtencion.diagnostico}</p>
                <p className="text-sm text-slate-500">{formatoFecha(ultimaAtencion.fecha_atencion, false)}</p>
              </>
            )}
          </Tarjeta>
        </div>
      )}
    </div>
  );
}
