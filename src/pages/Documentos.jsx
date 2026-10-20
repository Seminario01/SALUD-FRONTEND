import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import client, { mensajeError } from "../api/client";
import { Dato, HojaDocumento, LineaFirma } from "../components/Impresion";
import CodigoQR from "../components/CodigoQR";
import { ESTADO_CUENTA, descripcionCuenta, quetzales } from "../utils/caja";

// Documentos formales para imprimir o guardar como PDF:
//   /imprimir/receta/:id        Receta médica
//   /imprimir/cuenta/:id        Estado de cuenta
//   /imprimir/vacunacion/:id    Constancia de vacunación (id del paciente)
//   /imprimir/constancia/:id    Constancia de consulta o incapacidad (con QR verificable)
// Los permisos los aplica el backend: si el usuario no puede ver el dato, se muestra el mensaje.

const fechaHora = (t) => (t ? new Date(String(t).replace(" ", "T")).toLocaleString("es-GT", { dateStyle: "long", timeStyle: "short" }) : "—");
const fechaDia = (t) => (t && t !== "None" ? new Date(`${String(t).slice(0, 10)}T12:00:00`).toLocaleDateString("es-GT", { dateStyle: "long" }) : "—");

const fechaCorta = (t) => (t ? new Date(`${String(t).slice(0, 10)}T12:00:00`).toLocaleDateString("es-GT") : "—");
// -Q3,227.00 en vez de Q-3,227.00
const dinero = (v) => { const n = Number(v) || 0; return n < 0 ? `-${quetzales(-n)}` : quetzales(n); };

function edad(nacimiento) {
  if (!nacimiento || nacimiento === "None") return null;
  const n = new Date(`${nacimiento}T12:00:00`);
  const hoy = new Date();
  let anios = hoy.getFullYear() - n.getFullYear();
  if (hoy < new Date(hoy.getFullYear(), n.getMonth(), n.getDate())) anios -= 1;
  return anios;
}

// Carga uno o varios recursos de la API: { datos, cargando, error }
function useDocumento(rutas) {
  const [estado, setEstado] = useState({ datos: null, cargando: true, error: null });
  const clave = rutas.join("|");
  useEffect(() => {
    Promise.all(clave.split("|").map((r) => client.get(r).then((res) => res.data.data)))
      .then((datos) => setEstado({ datos, cargando: false, error: null }))
      .catch((err) => setEstado({ datos: null, cargando: false, error: mensajeError(err) }));
  }, [clave]);
  return estado;
}

function Sello({ texto, clase }) {
  return <span className={`inline-block border-2 rounded px-3 py-1 text-xs font-bold tracking-widest uppercase ${clase}`}>{texto}</span>;
}

// ------------------------------------------------------------------ Receta médica
export function RecetaImpresa() {
  const { id } = useParams();
  const { datos, cargando, error } = useDocumento([`/recetas/${id}`]);
  const r = datos?.[0];
  const anios = edad(r?.paciente_fecha_nacimiento);
  return (
    <HojaDocumento titulo={`Receta médica No. ${id}`} detalle={r ? fechaHora(r.fecha) : null} cargando={cargando} error={error}>
      {r && (
        <>
          <div className="flex items-start justify-between gap-4 mb-5">
            <dl className="grid grid-cols-2 gap-x-8 gap-y-3 flex-1">
              <Dato etiqueta="Paciente">{r.paciente}</Dato>
              <Dato etiqueta="DPI">{r.paciente_cui}</Dato>
              <Dato etiqueta="Edad">{anios !== null ? `${anios} años` : null}</Dato>
              <Dato etiqueta="Fecha de emisión">{fechaHora(r.fecha)}</Dato>
            </dl>
            {r.estado === "ANULADA" && <Sello texto="Anulada" clase="border-red-700 text-red-700" />}
            {r.estado === "DESPACHADA" && <Sello texto="Despachada" clase="border-green-700 text-green-700" />}
          </div>

          <p className="text-3xl font-serif text-blue-900 mb-2" aria-hidden="true">℞</p>
          <table className="w-full text-left border-collapse mb-5">
            <thead>
              <tr className="border-b-2 border-slate-300 text-xs uppercase tracking-wide text-slate-500">
                <th className="py-2 pr-2 w-8">#</th><th className="py-2 pr-2">Medicamento</th>
                <th className="py-2 pr-2 w-20 text-right">Cantidad</th><th className="py-2">Dosis e indicación</th>
              </tr>
            </thead>
            <tbody>
              {r.items.map((it, i) => (
                <tr key={it.medicamento_id} className="border-b border-slate-200 align-top">
                  <td className="py-2 pr-2 tabular-nums">{i + 1}</td>
                  <td className="py-2 pr-2"><span className="font-semibold">{it.medicamento}</span>
                    {it.presentacion && <span className="block text-xs text-slate-500">{it.presentacion}</span>}</td>
                  <td className="py-2 pr-2 text-right tabular-nums">{it.cantidad}</td>
                  <td className="py-2">{it.dosis || "Según indicación médica"}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {r.indicaciones && (
            <div className="mb-4">
              <p className="text-[11px] uppercase tracking-wide text-slate-500">Indicaciones generales</p>
              <p className="whitespace-pre-line">{r.indicaciones}</p>
            </div>
          )}
          {r.estado === "ANULADA" && r.motivo_anulacion && <p className="text-red-700 mb-2">Motivo de la anulación: {r.motivo_anulacion}</p>}
          {r.estado === "DESPACHADA" && <p className="text-green-800 mb-2">Despachada en farmacia el {fechaHora(r.fecha_despacho)}</p>}

          <div className="flex items-end justify-between gap-6">
            {r.codigo_verificacion ? <VerificacionQR enlace={`/verificar/${r.codigo_verificacion}`} que="esta receta" /> : <span />}
            <LineaFirma texto={`${r.medico || "Médico tratante"} · Firma y sello`} />
          </div>
        </>
      )}
    </HojaDocumento>
  );
}

// QR del documento: quien lo recibe (una farmacia, un patrono) lo escanea y ve si es auténtico y vigente
function VerificacionQR({ enlace: ruta, que }) {
  const enlace = `${window.location.origin}${ruta}`;
  return (
    <div className="flex items-center gap-3 mt-8">
      <CodigoQR texto={enlace} tamano={96} etiqueta={`Código QR para verificar ${que}`} />
      <div className="text-[11px] leading-snug text-slate-600 max-w-52">
        <p className="font-semibold text-slate-700">Verifique {que}</p>
        <p>Escanee el código con el celular o entre a:</p>
        <p className="font-mono text-[10px] break-all text-slate-800">{enlace.replace(/^https?:\/\//, "")}</p>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ Constancia de consulta o incapacidad
export function ConstanciaImpresa() {
  const { id } = useParams();
  const { datos, cargando, error } = useDocumento([`/constancias/${id}`]);
  const c = datos?.[0];
  const incapacidad = c?.tipo === "INCAPACIDAD";
  const titulo = incapacidad ? "Constancia de incapacidad" : "Constancia médica";
  const anios = edad(c?.paciente_fecha_nacimiento);
  return (
    <HojaDocumento titulo={`${titulo} No. ${id}`} detalle={c ? fechaHora(c.fecha) : null} cargando={cargando} error={error}>
      {c && (
        <>
          {c.estado === "ANULADA" && (
            <div className="mb-4 flex items-center gap-3">
              <Sello texto="Anulada" clase="border-red-700 text-red-700" />
              <span className="text-red-700 text-sm">{c.motivo_anulacion}</span>
            </div>
          )}
          <p className="text-[11px] uppercase tracking-wide text-slate-500 mb-3">A quien interese</p>
          <p className="leading-relaxed mb-4 text-justify">
            El médico que firma hace constar que <span className="font-semibold">{c.paciente}</span>
            {c.paciente_cui && <>, con DPI <span className="font-semibold tabular-nums">{c.paciente_cui}</span></>}
            {anios !== null && <>, de {anios} años de edad</>}, fue atendido(a) en consulta médica el día{" "}
            <span className="font-semibold">{fechaDia(c.fecha_atencion)}</span>
            {c.diagnostico && <>, con diagnóstico de <span className="font-semibold">{c.diagnostico}</span></>}
            {incapacidad ? (
              <>
                , y por su estado de salud <span className="font-semibold">necesita reposo durante {c.dias_reposo} día(s)</span>,
                del <span className="font-semibold">{fechaDia(c.desde)}</span> al <span className="font-semibold">{fechaDia(c.hasta)}</span>, inclusive.
              </>
            ) : "."}
          </p>
          {c.observaciones && (
            <div className="mb-4">
              <p className="text-[11px] uppercase tracking-wide text-slate-500">Observaciones</p>
              <p className="whitespace-pre-line">{c.observaciones}</p>
            </div>
          )}
          <p className="mb-2">Se extiende la presente a solicitud del interesado, para los usos que le convengan, el {fechaDia(c.fecha)}.</p>
          <div className="flex items-end justify-between gap-6">
            <VerificacionQR enlace={`/verificar/constancia/${c.codigo_verificacion}`} que="esta constancia" />
            <LineaFirma texto={`${c.medico || "Médico tratante"} · Firma y sello`} />
          </div>
        </>
      )}
    </HojaDocumento>
  );
}

// ------------------------------------------------------------------ Estado de cuenta
const SIGNO = { CARGO: 1, DESCUENTO: -1, PAGO: -1 };

export function EstadoCuentaImpreso() {
  const { id } = useParams();
  const { datos, cargando, error } = useDocumento([`/cuentas/${id}`]);
  const c = datos?.[0];
  return (
    <HojaDocumento titulo={`Estado de cuenta No. ${id}`} detalle={c ? descripcionCuenta(c) : null} cargando={cargando} error={error}>
      {c && (
        <>
          <div className="flex items-start justify-between gap-4 mb-5">
            <dl className="grid grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-3 flex-1">
              <Dato etiqueta="Paciente">{c.paciente}</Dato>
              <Dato etiqueta="DPI">{c.paciente_cui}</Dato>
              <Dato etiqueta="Cuenta">{descripcionCuenta(c)}</Dato>
              <Dato etiqueta="Apertura">{fechaHora(c.fecha_apertura)}</Dato>
              <Dato etiqueta="Cierre">{c.fecha_cierre ? fechaHora(c.fecha_cierre) : "Abierta"}</Dato>
              {c.cama && <Dato etiqueta="Área y cama">{`${c.area ?? ""} · ${c.cama}`}</Dato>}
            </dl>
            <Sello texto={ESTADO_CUENTA[c.estado]?.texto ?? c.estado} clase="border-blue-800 text-blue-800" />
          </div>

          <table className="w-full text-left border-collapse mb-4">
            <thead>
              <tr className="border-b-2 border-slate-300 text-xs uppercase tracking-wide text-slate-500">
                <th className="py-2 pr-2">Fecha</th><th className="py-2 pr-2">Concepto</th>
                <th className="py-2 pr-2 text-right">Cant.</th><th className="py-2 pr-2 text-right">P. unitario</th>
                <th className="py-2 text-right">Monto</th>
              </tr>
            </thead>
            <tbody>
              {(c.movimientos ?? []).map((m) => (
                <tr key={m.id} className={`border-b border-slate-200 align-top ${m.anulado ? "text-slate-400 line-through" : ""}`}>
                  <td className="py-1.5 pr-2 whitespace-nowrap tabular-nums">{fechaCorta(m.fecha)}</td>
                  <td className="py-1.5 pr-2">{m.descripcion || m.categoria_texto}
                    <span className="block text-xs text-slate-500 no-underline">{m.categoria_texto}{m.anulado ? " · anulado" : ""}</span></td>
                  <td className="py-1.5 pr-2 text-right tabular-nums">{m.cantidad ?? ""}</td>
                  <td className="py-1.5 pr-2 text-right tabular-nums whitespace-nowrap">{m.precio_unitario != null ? quetzales(m.precio_unitario) : ""}</td>
                  <td className="py-1.5 text-right tabular-nums whitespace-nowrap">{dinero((SIGNO[m.tipo] ?? 1) * m.monto)}</td>
                </tr>
              ))}
              {(c.movimientos ?? []).length === 0 && <tr><td colSpan={5} className="py-3 text-slate-500">Sin movimientos.</td></tr>}
            </tbody>
          </table>

          <div className="flex justify-end mb-5">
            <dl className="w-72 text-sm">
              {[["Cargos", c.cargos], ["Descuentos", -c.descuentos], ["Pagos", -c.pagos]].map(([t, v]) => (
                <div key={t} className="flex justify-between py-0.5"><dt>{t}</dt><dd className="tabular-nums">{dinero(v)}</dd></div>
              ))}
              <div className="flex justify-between border-t-2 border-slate-800 mt-1 pt-1 font-bold text-base">
                <dt>Saldo</dt><dd className="tabular-nums">{dinero(c.saldo)}</dd>
              </div>
              {c.estancia_en_curso && (
                <div className="flex justify-between text-xs text-slate-600 mt-1">
                  <dt>Total estimado con la estancia en curso</dt><dd className="tabular-nums">{quetzales(c.total_estimado)}</dd>
                </div>
              )}
            </dl>
          </div>

          {(c.numero_referencia || c.numero_autorizacion) && (
            <dl className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-2 border rounded p-3 bg-slate-50 print:bg-white">
              <Dato etiqueta="Referencia de pago">{c.numero_referencia}</Dato>
              <Dato etiqueta="Vence">{c.fecha_vencimiento ? fechaDia(c.fecha_vencimiento) : null}</Dato>
              <Dato etiqueta="Autorización">{c.numero_autorizacion}</Dato>
              <Dato etiqueta="Fecha de pago">{c.fecha_pago ? fechaHora(c.fecha_pago) : null}</Dato>
            </dl>
          )}
        </>
      )}
    </HojaDocumento>
  );
}

// ------------------------------------------------------------------ Constancia de vacunación
export function ConstanciaVacunacion() {
  const { id } = useParams();
  const { datos, cargando, error } = useDocumento([`/pacientes/${id}`, `/vacunacion/${id}`]);
  const [p, v] = datos ?? [];
  const anios = edad(p?.fecha_nacimiento);
  return (
    <HojaDocumento titulo="Constancia de vacunación" detalle={p?.nombre_completo} cargando={cargando} error={error}>
      {p && v && (
        <>
          <dl className="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-3 mb-6">
            <Dato etiqueta="Nombre">{p.nombre_completo}</Dato>
            <Dato etiqueta="DPI">{p.cui}</Dato>
            <Dato etiqueta="Fecha de nacimiento">{fechaDia(p.fecha_nacimiento)}</Dato>
            <Dato etiqueta="Edad">{anios !== null ? `${anios} años` : null}</Dato>
          </dl>

          <p className="leading-relaxed mb-5">
            El Módulo de Salud hace constar que, según sus registros, <b>{p.nombre_completo}</b>
            {p.cui ? <>, con DPI <b>{p.cui}</b>,</> : ""} tiene su esquema de vacunación{" "}
            <b>{v.esquema_completo ? "COMPLETO" : "INCOMPLETO"}</b>.
          </p>

          <div className={`border-2 rounded-lg p-4 mb-5 ${v.esquema_completo ? "border-green-700" : "border-amber-600"}`}>
            <p className={`text-lg font-bold ${v.esquema_completo ? "text-green-800" : "text-amber-700"}`}>
              Esquema {v.esquema_completo ? "completo" : "incompleto"}
            </p>
            {!v.esquema_completo && <p className="mt-1">Vacunas pendientes: <b>{v.vacunas_pendientes || "no especificadas"}</b></p>}
            {v.esquema_completo && v.vacunas_pendientes && <p className="mt-1">Observaciones: {v.vacunas_pendientes}</p>}
            <p className="mt-1">Estudiante: {v.es_estudiante ? "Sí" : "No"}</p>
          </div>

          <p className="text-xs text-slate-600">Registro actualizado el {fechaHora(v.fecha_actualizacion)}</p>
          <div className="flex justify-end">
            <LineaFirma texto="Responsable de vacunación · Firma y sello" />
          </div>
        </>
      )}
      {p && !v && !cargando && <p>{p.nombre_completo} no tiene registro de vacunación.</p>}
    </HojaDocumento>
  );
}

// ------------------------------------------------------------------ Resumen para referencia
// Una hoja con lo esencial del paciente para referirlo a otro hospital. Se abre con ?vista
// (sin imprimir de una vez) para que el médico escriba a dónde y por qué lo refiere.
const ESTADO_HOSP = { PENDIENTE: "Orden de ingreso", ACTIVO: "Ingresado", EGRESADO: "Egresado", ANULADA: "Anulada" };

function useResumen(id) {
  const [estado, setEstado] = useState({ cargando: true });
  useEffect(() => {
    const opcional = (ruta, defecto) => client.get(ruta).then((r) => r.data.data).catch(() => defecto);
    Promise.all([
      client.get(`/pacientes/${id}`).then((r) => r.data.data),
      client.get(`/expedientes/${id}`).then((r) => r.data.data),
      opcional(`/pacientes/${id}/signos`, []),
      opcional(`/vacunacion/${id}`, null),
      opcional(`/recetas?paciente_id=${id}`, []),
      opcional(`/hospitalizaciones?paciente_id=${id}`, []),
    ])
      .then(([paciente, atenciones, signos, vacunacion, recetas, hospitalizaciones]) =>
        setEstado({ cargando: false, paciente, atenciones, signos, vacunacion, recetas, hospitalizaciones }))
      .catch((err) => setEstado({ cargando: false, error: mensajeError(err) }));
  }, [id]);
  return estado;
}

function Apartado({ titulo, children }) {
  return (
    <section className="mb-4 break-inside-avoid">
      <h2 className="text-[11px] uppercase tracking-wide font-semibold text-blue-900 border-b border-slate-200 pb-0.5 mb-1.5">{titulo}</h2>
      {children}
    </section>
  );
}

const SIGNOS_RESUMEN = [
  ["Presión", "presion", "mmHg"], ["Temperatura", "temperatura", "°C"], ["Frec. cardiaca", "frecuencia_cardiaca", "lpm"],
  ["Saturación", "saturacion", "%"], ["Peso", "peso", "kg"],
];

export function ResumenPaciente() {
  const { id } = useParams();
  const { cargando, error, paciente: p, atenciones, signos, vacunacion: v, recetas, hospitalizaciones } = useResumen(id);
  const [referido, setReferido] = useState({ destino: "", motivo: "" });
  const anios = edad(p?.fecha_nacimiento);
  // Último valor de cada signo (con su fecha y si estaba fuera de rango)
  const ultimo = (clave) => [...(signos ?? [])].reverse().find((s) => s[clave] != null);
  const signosUltimos = SIGNOS_RESUMEN.map(([t, c, u]) => [t, ultimo(c), c, u]).filter(([, s]) => s);
  const recetasRecientes = (recetas ?? []).filter((r) => r.estado !== "ANULADA").slice(0, 5);
  const hospitalizacionesValidas = (hospitalizaciones ?? []).filter((h) => h.estado !== "ANULADA");
  const campoReferencia = "w-full border rounded px-2 py-1 text-sm text-slate-800 print:border-0 print:border-b print:border-slate-400 print:rounded-none print:px-0 print:resize-none print:placeholder:text-transparent";

  return (
    <HojaDocumento titulo="Resumen clínico para referencia" detalle={p ? `${p.nombre_completo} · DPI ${p.cui || "sin registrar"}` : null}
      cargando={cargando} error={error}>
      {p && (
        <>
          <dl className="grid grid-cols-3 gap-x-6 gap-y-2 mb-4">
            <Dato etiqueta="Paciente">{p.nombre_completo}</Dato>
            <Dato etiqueta="DPI">{p.cui}</Dato>
            <Dato etiqueta="Edad">{anios !== null ? `${anios} años` : null}</Dato>
            <Dato etiqueta="Género">{{ M: "Masculino", F: "Femenino" }[p.genero] ?? p.genero}</Dato>
            <Dato etiqueta="Seguro">{p.tipo_seguro}</Dato>
            <Dato etiqueta="Responsable y teléfono">{[p.cuidador, p.telefono].filter(Boolean).join(" · ") || null}</Dato>
          </dl>

          <div className={`rounded border-2 px-3 py-2 mb-4 ${p.alergias ? "border-red-700 text-red-800" : "border-slate-300 text-slate-700"}`}>
            <span className="font-bold uppercase tracking-wide text-xs">Alergias: </span>
            <span className="font-semibold">{p.alergias || "Sin alergias registradas"}</span>
          </div>

          <Apartado titulo="Referencia">
            <div className="grid grid-cols-1 gap-2">
              <label className="text-xs text-slate-500">Referido a (hospital o servicio)
                <input value={referido.destino} onChange={(e) => setReferido({ ...referido, destino: e.target.value })} maxLength={150}
                  placeholder="Ej.: Hospital Nacional, servicio de Cardiología" className={campoReferencia} />
              </label>
              <label className="text-xs text-slate-500">Motivo de la referencia
                <textarea value={referido.motivo} onChange={(e) => setReferido({ ...referido, motivo: e.target.value })} rows={2} maxLength={1000}
                  placeholder="Escriba el motivo antes de imprimir" className={campoReferencia} />
              </label>
            </div>
          </Apartado>

          <Apartado titulo="Últimos signos vitales">
            {signosUltimos.length === 0 ? <p className="text-slate-500">Sin signos vitales registrados.</p> : (
              <p className="flex flex-wrap gap-x-5 gap-y-1">
                {signosUltimos.map(([t, s, c, u]) => {
                  const fuera = s.alertas?.some((a) => a.signo === c);
                  const valor = c === "temperatura" || c === "peso" ? Number(s[c]).toFixed(1) : s[c];
                  return (
                    <span key={c}>{t}: <b className={fuera ? "text-red-700" : ""}>{valor} {u}{fuera ? " (fuera de rango)" : ""}</b>
                      <span className="text-[11px] text-slate-500"> · {fechaCorta(s.fecha)}</span></span>
                  );
                })}
              </p>
            )}
          </Apartado>

          <Apartado titulo="Atenciones recientes">
            {atenciones.length === 0 ? <p className="text-slate-500">Sin atenciones registradas.</p> : (
              <ul className="space-y-1.5">
                {atenciones.slice(0, 5).map((a) => (
                  <li key={a.id}>
                    <span className="text-[11px] text-slate-500 tabular-nums">{fechaCorta(a.fecha_atencion)} · </span>
                    <span className="font-semibold">{a.diagnostico}</span>
                    {a.tratamiento && <span className="block text-slate-600">Tratamiento: {a.tratamiento}</span>}
                  </li>
                ))}
              </ul>
            )}
          </Apartado>

          <Apartado titulo="Medicamentos recetados recientemente">
            {recetasRecientes.length === 0 ? <p className="text-slate-500">Sin recetas.</p> : (
              <ul className="space-y-0.5">
                {recetasRecientes.map((r) => (
                  <li key={r.id}>
                    <span className="text-[11px] text-slate-500 tabular-nums">{fechaCorta(r.fecha)} · </span>
                    {r.items.map((it) => `${it.medicamento} ×${it.cantidad}${it.dosis ? ` (${it.dosis})` : ""}`).join("; ")}
                  </li>
                ))}
              </ul>
            )}
          </Apartado>

          <div className="grid grid-cols-2 gap-6">
            <Apartado titulo="Hospitalizaciones">
              {hospitalizacionesValidas.length === 0 ? <p className="text-slate-500">Sin hospitalizaciones.</p> : (
                <ul className="space-y-1">
                  {hospitalizacionesValidas.slice(0, 3).map((h) => (
                    <li key={h.id}>
                      <span className="text-[11px] text-slate-500">
                        {fechaCorta(h.fecha_ingreso ?? h.fecha_orden)}{h.fecha_egreso ? ` – ${fechaCorta(h.fecha_egreso)}` : ""} · {ESTADO_HOSP[h.estado] ?? h.estado}
                      </span>
                      <span className="block">{h.area}{h.diagnostico ? ` — ${h.diagnostico}` : ""}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Apartado>
            <Apartado titulo="Vacunación">
              {!v ? <p className="text-slate-500">Sin registro de vacunación.</p> : (
                <p>{v.esquema_completo ? "Esquema completo" : "Esquema incompleto"}{v.vacunas_pendientes ? `. Pendientes: ${v.vacunas_pendientes}` : ""}</p>
              )}
            </Apartado>
          </div>

          <div className="flex justify-end">
            <LineaFirma texto="Médico que refiere · Firma, sello y colegiado" />
          </div>
        </>
      )}
    </HojaDocumento>
  );
}
