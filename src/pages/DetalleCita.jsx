import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import client, { mensajeError } from "../api/client";
import useRoles from "../hooks/useRoles";
import { useAvisos } from "../components/Avisos";
import { BotonImprimir, EncabezadoImpreso, PieImpreso } from "../components/Impresion";
import { formatoDia } from "../utils/fechas";
import useMedicos from "../hooks/useMedicos";

// Detalle de una cita: paciente, médico, fecha, pago en Tributario, atención registrada e historial.
// Se abre al hacer clic en una cita de la lista (/citas/:id).

const ESTADO = {
  pendiente: { texto: "Pendiente", clase: "bg-yellow-100 text-yellow-800" },
  confirmada: { texto: "Confirmada", clase: "bg-green-100 text-green-800" },
  atendida: { texto: "Atendida", clase: "bg-blue-100 text-blue-800" },
  cancelada: { texto: "Cancelada", clase: "bg-red-100 text-red-800" },
};

const COBRO = {
  PAGADO: { texto: "Pagado", clase: "bg-green-100 text-green-800" },
  PENDIENTE: { texto: "Por pagar", clase: "bg-amber-100 text-amber-800" },
  PARCIAL: { texto: "Pago parcial", clase: "bg-amber-100 text-amber-800" },
  ANULADO: { texto: "Cobro anulado", clase: "bg-slate-100 text-slate-600" },
};

const fechaLarga = (t) => {
  if (!t) return "—";
  const f = new Date(String(t).replace(" ", "T"));
  return isNaN(f) ? t : f.toLocaleString("es-GT", { dateStyle: "full", timeStyle: "short" });
};
const fechaCorta = (t) => {
  if (!t) return "—";
  const f = new Date(String(t).replace(" ", "T"));
  return isNaN(f) ? t : f.toLocaleString("es-GT", { dateStyle: "medium", timeStyle: "short" });
};
const quetzales = (n) => (n == null ? "—" : `Q${Number(n).toLocaleString("es-GT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);

function edad(nacimiento) {
  if (!nacimiento) return null;
  const n = new Date(`${nacimiento}T12:00:00`);
  const hoy = new Date();
  let a = hoy.getFullYear() - n.getFullYear();
  if (hoy < new Date(hoy.getFullYear(), n.getMonth(), n.getDate())) a -= 1;
  return a >= 0 ? a : null;
}

function Tarjeta({ titulo, children, className = "" }) {
  return (
    <section className={`bg-white border rounded-lg p-4 shadow-sm break-inside-avoid ${className}`}>
      <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">{titulo}</h2>
      {children}
    </section>
  );
}

function Dato({ etiqueta, children, mono = false }) {
  return (
    <div>
      <dt className="text-xs text-slate-500">{etiqueta}</dt>
      <dd className={`text-slate-800 ${mono ? "font-mono text-sm" : ""}`}>{children ?? "—"}</dd>
    </div>
  );
}

export default function DetalleCita() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { puede, esCiudadano } = useRoles();
  const avisos = useAvisos();
  const gestiona = puede("citas.gestionar");
  const verificaPagos = puede("pagos.verificar");
  const [cita, setCita] = useState(null);
  const [error, setError] = useState(null);
  const [ocupado, setOcupado] = useState(false);
  const medicos = useMedicos(gestiona);

  const cargar = useCallback(() => {
    client.get(`/citas/${id}`)
      .then((r) => { setCita(r.data.data); setError(null); })
      .catch((err) => setError(mensajeError(err)));
  }, [id]);

  useEffect(() => { cargar(); }, [cargar]);

  function ejecutar(peticion, mensaje) {
    setOcupado(true);
    peticion
      .then((r) => { avisos.exito(mensaje(r)); cargar(); })
      .catch((err) => avisos.error(mensajeError(err)))
      .finally(() => setOcupado(false));
  }

  const cambiarEstado = (estado) =>
    ejecutar(client.put(`/citas/${id}`, { estado }), () => `Cita No. ${id} marcada como ${ESTADO[estado].texto.toLowerCase()}.`);

  async function cancelar() {
    const si = await avisos.confirmar({
      titulo: `¿Cancelar la cita No. ${cita.id}?`,
      mensaje: [`Paciente: ${cita.paciente}`, `Fecha: ${fechaCorta(cita.fecha_hora)}`, "El horario queda libre para otro paciente."],
      confirmar: "Sí, cancelar la cita", cancelar: "No, mantenerla", peligro: true,
    });
    if (si) ejecutar(client.delete(`/citas/${id}`), () => `Cita No. ${id} cancelada.`);
  }

  const enviarCobro = () => ejecutar(client.post(`/citas/${id}/cobro`),
    (r) => `Cobro registrado en Tributario: referencia ${r.data.data.numeroReferencia}.`);
  const asignarMedico = (sub) => ejecutar(client.put(`/citas/${id}`, { medico_sub: sub || null }),
    () => (sub ? `Médico asignado: Dr(a). ${medicos.find((m) => m.sub === sub)?.nombre ?? ""}.` : "La cita quedó sin médico asignado."));
  const verificarPago = () => ejecutar(client.post(`/citas/${id}/verificar-pago`),
    (r) => (r.data.data.pagoConfirmado ? "Tributario confirmó el pago." : "Tributario aún no registra el pago."));

  if (error) {
    return (
      <div className="p-6">
        <Link to="/citas" className="text-sm text-blue-700 hover:underline">← Citas</Link>
        <p className="mt-4 text-red-600">No se pudo cargar la cita: {error}</p>
      </div>
    );
  }
  if (!cita) return <p className="p-6">Cargando...</p>;

  const estado = ESTADO[cita.estado] ?? { texto: cita.estado, clase: "bg-gray-100" };
  const cobro = COBRO[cita.estado_cobro];
  const activa = cita.estado === "pendiente" || cita.estado === "confirmada";
  const anios = edad(cita.paciente_fecha_nacimiento);
  const boton = "text-sm px-3 py-1.5 rounded border hover:bg-gray-100 disabled:opacity-50";

  return (
    <div className="p-6 max-w-5xl space-y-4 print:p-0">
      <EncabezadoImpreso titulo={`Comprobante de cita No. ${cita.id}`} detalle={`${cita.paciente} · DPI ${cita.paciente_cui || "sin registrar"}`} />
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <button type="button" onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/citas"))}
          className="text-sm text-blue-700 hover:underline">← Volver a citas</button>
        <BotonImprimir texto="Imprimir comprobante / PDF" />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold text-gray-800">Cita No. {cita.id}</h1>
        <span className={`px-2 py-1 rounded text-sm font-medium ${estado.clase}`}>{estado.texto}</span>
      </div>
      <p className="text-slate-600 -mt-2 first-letter:uppercase">{fechaLarga(cita.fecha_hora)}</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Tarjeta titulo="Paciente">
          <dl className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <dt className="text-xs text-slate-500">Nombre</dt>
              <dd className="font-medium">
                {esCiudadano ? cita.paciente : (
                  <Link to={`/pacientes/${cita.paciente_id}`} className="text-blue-700 hover:underline">{cita.paciente}</Link>
                )}
              </dd>
            </div>
            <Dato etiqueta="DPI" mono>{cita.paciente_cui}</Dato>
            <Dato etiqueta="Edad">{anios !== null ? `${anios} años` : null}</Dato>
            <Dato etiqueta="Teléfono">{cita.paciente_telefono}</Dato>
            <Dato etiqueta="No. de paciente">{cita.paciente_id}</Dato>
          </dl>
        </Tarjeta>

        <Tarjeta titulo="Cita">
          <dl className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <dt className="text-xs text-slate-500">Médico</dt>
              <dd className="font-medium">
                {gestiona && activa ? (
                  <select value={cita.medico_sub ?? ""} onChange={(e) => asignarMedico(e.target.value)} disabled={ocupado}
                    aria-label="Médico de la cita" className="border rounded px-2 py-1 w-full bg-white font-normal print:hidden">
                    <option value="">Por asignar</option>
                    {cita.medico_sub && !medicos.some((m) => m.sub === cita.medico_sub) && (
                      <option value={cita.medico_sub}>Dr(a). {cita.medico_nombre ?? "sin nombre"}</option>
                    )}
                    {medicos.map((m) => <option key={m.sub} value={m.sub}>Dr(a). {m.nombre}</option>)}
                  </select>
                ) : null}
                <span className={gestiona && activa ? "hidden print:inline" : ""}>
                  {cita.medico_nombre ? `Dr(a). ${cita.medico_nombre}` : <span className="text-slate-400 font-normal">Por asignar</span>}
                </span>
              </dd>
            </div>
            <Dato etiqueta="Fecha y hora">{fechaCorta(cita.fecha_hora)}</Dato>
            <Dato etiqueta="Estado">{estado.texto}</Dato>
            <div className="col-span-2"><Dato etiqueta="Motivo">{cita.motivo}</Dato></div>
            <Dato etiqueta="Agendada el">{fechaCorta(cita.fecha_creacion)}</Dato>
            <Dato etiqueta="Agendada por">{cita.agendada_por}</Dato>
          </dl>
        </Tarjeta>

        <Tarjeta titulo="Pago (Tributario)">
          {!cita.estado_cobro && !cita.pago_confirmado ? (
            <p className="text-sm text-slate-500">Todavía no se ha enviado el cobro a Tributario.</p>
          ) : (
            <dl className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <dt className="text-xs text-slate-500">Estado del pago</dt>
                <dd><span className={`inline-block px-2 py-0.5 rounded text-sm font-medium ${cobro?.clase ?? "bg-gray-100"}`}>{cobro?.texto ?? cita.estado_cobro}</span></dd>
              </div>
              <Dato etiqueta="Monto">{quetzales(cita.costo)}</Dato>
              <Dato etiqueta="Vence">{cita.fecha_vencimiento ? formatoDia(cita.fecha_vencimiento) : null}</Dato>
              <Dato etiqueta="Referencia de pago" mono>{cita.numero_referencia}</Dato>
              <Dato etiqueta="Ref. Tributario" mono>{cita.referencia_tributario}</Dato>
              <Dato etiqueta="Autorización" mono>{cita.numero_autorizacion}</Dato>
              <Dato etiqueta="Pagado el">{cita.fecha_pago ? fechaCorta(cita.fecha_pago) : null}</Dato>
            </dl>
          )}
          {verificaPagos && !cita.pago_confirmado && cita.estado !== "cancelada" && (
            <button onClick={cita.estado_cobro === "PENDIENTE" ? verificarPago : enviarCobro} disabled={ocupado}
              className="mt-3 text-sm px-3 py-1.5 rounded bg-blue-700 text-white hover:bg-blue-800 disabled:opacity-50 print:hidden">
              {ocupado ? "Consultando..." : cita.estado_cobro === "PENDIENTE" ? "Verificar pago" : "Enviar cobro a Tributario"}
            </button>
          )}
        </Tarjeta>

        {cita.atenciones && (
          <Tarjeta titulo="Atención registrada">
            {cita.atenciones.length === 0 ? (
              <p className="text-sm text-slate-500">
                {cita.estado === "atendida" ? "No se registró la atención en el expediente con esta cita." : "Aún no hay atención registrada."}
              </p>
            ) : (
              <div className="space-y-3">
                {cita.atenciones.map((a) => (
                  <div key={a.id} className="text-sm">
                    <p className="text-xs text-slate-500">{fechaCorta(a.fecha_atencion)}{a.medico ? ` · Dr(a). ${a.medico}` : ""}</p>
                    <p><span className="font-medium">Diagnóstico:</span> {a.diagnostico}</p>
                    {a.tratamiento && <p><span className="font-medium">Tratamiento:</span> {a.tratamiento}</p>}
                  </div>
                ))}
              </div>
            )}
          </Tarjeta>
        )}
      </div>

      {cita.historial && (
        <Tarjeta titulo="Historial">
          {cita.historial.length === 0 ? (
            <p className="text-sm text-slate-500">Sin cambios registrados (la bitácora empezó el 17 de octubre de 2026).</p>
          ) : (
            <ol className="relative border-l border-slate-200 ml-2 space-y-3">
              {cita.historial.map((h, i) => (
                <li key={i} className="ml-4">
                  <span className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full bg-blue-600 ring-4 ring-white" aria-hidden="true" />
                  <p className="text-sm text-slate-800">{h.descripcion}</p>
                  <p className="text-xs text-slate-500">{fechaCorta(h.fecha)} · {h.usuario}{h.puesto ? ` (${h.puesto})` : ""}</p>
                </li>
              ))}
            </ol>
          )}
        </Tarjeta>
      )}

      {activa && (gestiona || esCiudadano) && (
        <div className="flex flex-wrap gap-2 print:hidden">
          {gestiona && cita.estado === "pendiente" && <button onClick={() => cambiarEstado("confirmada")} disabled={ocupado} className={boton}>Confirmar</button>}
          {gestiona && cita.estado === "confirmada" && <button onClick={() => cambiarEstado("atendida")} disabled={ocupado} className={boton}>Marcar atendida</button>}
          {puede("expediente.registrar") && (
            <Link to={`/expedientes?paciente=${cita.paciente_id}`} className={boton}>Registrar atención</Link>
          )}
          <button onClick={cancelar} disabled={ocupado} className={`${boton} text-red-700`}>Cancelar cita</button>
        </div>
      )}

      <PieImpreso />
    </div>
  );
}
