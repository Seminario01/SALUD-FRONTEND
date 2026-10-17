import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import client, { mensajeError } from "../api/client";
import { Dato, HojaDocumento, LineaFirma } from "../components/Impresion";
import { ESTADO_CUENTA, descripcionCuenta, quetzales } from "../utils/caja";

// Documentos formales para imprimir o guardar como PDF:
//   /imprimir/receta/:id        Receta médica
//   /imprimir/cuenta/:id        Estado de cuenta
//   /imprimir/vacunacion/:id    Constancia de vacunación (id del paciente)
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

          <div className="flex justify-end">
            <LineaFirma texto={`${r.medico || "Médico tratante"} · Firma y sello`} />
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
