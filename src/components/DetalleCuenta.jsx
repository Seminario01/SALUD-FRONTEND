import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import client, { mensajeError } from "../api/client";
import { CATEGORIA, ESTADO_CUENTA, descripcionCuenta, quetzales } from "../utils/caja";
import { fechaHora } from "../utils/hospitalizacion";
import { formatoDia } from "../utils/fechas";

const campo = "border rounded px-3 py-1.5 w-full bg-white";

function AgregarCargo({ cuenta, servicios, onHecho }) {
  const [servicioId, setServicioId] = useState("");
  const [cantidad, setCantidad] = useState(1);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);
  const grupos = ["LABORATORIO", "IMAGEN", "PROCEDIMIENTO"];
  const elegido = servicios.find((s) => String(s.id) === servicioId);

  function enviar(e) {
    e.preventDefault();
    setEnviando(true);
    setError(null);
    client
      .post(`/cuentas/${cuenta.id}/cargos`, { servicio_id: Number(servicioId), cantidad: Number(cantidad) })
      .then((r) => { setServicioId(""); setCantidad(1); onHecho(r.data.message, r.data.data); })
      .catch((err) => setError(mensajeError(err)))
      .finally(() => setEnviando(false));
  }

  return (
    <form onSubmit={enviar} className="flex flex-wrap items-end gap-2">
      <label className="text-sm flex-1 min-w-56">Servicio
        <select value={servicioId} onChange={(e) => setServicioId(e.target.value)} required className={campo} aria-label="Servicio">
          <option value="">Seleccione...</option>
          {grupos.map((g) => (
            <optgroup key={g} label={CATEGORIA[g]}>
              {servicios.filter((s) => s.categoria === g).map((s) => (
                <option key={s.id} value={s.id}>{s.nombre} — {quetzales(s.costo)}</option>
              ))}
            </optgroup>
          ))}
        </select>
      </label>
      <label className="text-sm w-20">Cantidad
        <input type="number" min="1" max="100" value={cantidad} onChange={(e) => setCantidad(e.target.value)} className={campo} aria-label="Cantidad" />
      </label>
      <button type="submit" disabled={enviando || !servicioId} className="text-sm px-3 py-1.5 rounded bg-blue-700 text-white hover:bg-blue-800 disabled:opacity-50">
        {elegido ? `Cargar ${quetzales(elegido.costo * Number(cantidad || 0))}` : "Cargar"}
      </button>
      {error && <span className="text-sm text-red-600 w-full">{error}</span>}
    </form>
  );
}

function Descuento({ cuenta, onHecho }) {
  const [abierto, setAbierto] = useState(false);
  const [monto, setMonto] = useState("");
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState(null);

  function enviar(e) {
    e.preventDefault();
    setError(null);
    client
      .post(`/cuentas/${cuenta.id}/descuentos`, { monto: Number(monto), motivo })
      .then((r) => { setAbierto(false); setMonto(""); setMotivo(""); onHecho(r.data.message, r.data.data); })
      .catch((err) => setError(mensajeError(err)));
  }

  if (!abierto) return <button onClick={() => setAbierto(true)} className="text-sm px-3 py-1.5 rounded border hover:bg-gray-100">Aplicar descuento</button>;
  return (
    <form onSubmit={enviar} className="flex flex-wrap items-end gap-2 w-full">
      <label className="text-sm w-32">Monto (Q)
        <input type="number" step="0.01" min="0.01" value={monto} onChange={(e) => setMonto(e.target.value)} required className={campo} aria-label="Monto del descuento" />
      </label>
      <label className="text-sm flex-1 min-w-48">Motivo
        <input value={motivo} onChange={(e) => setMotivo(e.target.value)} required maxLength={255} placeholder="Estudio socioeconómico No." className={campo} aria-label="Motivo del descuento" />
      </label>
      <button type="submit" className="text-sm px-3 py-1.5 rounded border hover:bg-gray-100">Aplicar</button>
      <button type="button" onClick={() => setAbierto(false)} className="text-sm px-3 py-1.5 rounded border hover:bg-gray-100">Cancelar</button>
      {error && <span className="text-sm text-red-600 w-full">{error}</span>}
    </form>
  );
}

function FilaMovimiento({ m, puedeAnular, cuentaId, onHecho }) {
  const [anulando, setAnulando] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState(null);
  const negativo = m.tipo !== "CARGO";

  function anular(e) {
    e.preventDefault();
    client
      .post(`/cuentas/${cuentaId}/movimientos/${m.id}/anular`, { motivo })
      .then((r) => onHecho("Movimiento anulado.", r.data.data))
      .catch((err) => setError(mensajeError(err)));
  }

  return (
    <tr className={`border-t ${m.anulado ? "text-slate-400" : ""}`}>
      <td className="py-1.5 pr-2 whitespace-nowrap text-xs">{fechaHora(m.fecha)}</td>
      <td className="py-1.5 pr-2">
        <span className={m.anulado ? "line-through" : ""}>{m.descripcion}</span>
        <span className="ml-2 text-[11px] text-slate-500 bg-slate-100 rounded px-1.5 py-0.5">{CATEGORIA[m.categoria] ?? m.categoria}</span>
        {m.anulado && <span className="block text-xs text-red-600">Anulado: {m.motivo_anulacion}</span>}
        {anulando && (
          <form onSubmit={anular} className="flex items-center gap-2 mt-1">
            <input value={motivo} onChange={(e) => setMotivo(e.target.value)} required maxLength={200} placeholder="Motivo"
              className="border rounded px-2 py-0.5 text-xs w-48" aria-label="Motivo de la anulación" />
            <button type="submit" className="text-xs px-2 py-0.5 rounded border text-red-700 hover:bg-red-50">Confirmar</button>
            <button type="button" onClick={() => setAnulando(false)} className="text-xs px-2 py-0.5 rounded border">Cancelar</button>
            {error && <span className="text-xs text-red-600">{error}</span>}
          </form>
        )}
      </td>
      <td className="py-1.5 pr-2 text-right tabular-nums">{m.cantidad ?? ""}</td>
      <td className="py-1.5 pr-2 text-right tabular-nums">{m.precio_unitario != null ? quetzales(m.precio_unitario) : ""}</td>
      <td className={`py-1.5 pr-2 text-right tabular-nums whitespace-nowrap ${negativo && !m.anulado ? "text-green-700" : ""}`}>
        {negativo ? "−" : ""}{quetzales(m.monto)}
      </td>
      <td className="py-1.5 pl-2 text-right whitespace-nowrap">
        {puedeAnular && !m.anulado && m.tipo !== "PAGO" && !anulando && (
          <button onClick={() => setAnulando(true)} className="text-xs text-red-700 hover:underline">Anular</button>
        )}
      </td>
    </tr>
  );
}

// Panel lateral con el estado de cuenta: movimientos, totales y acciones de Caja.
export default function DetalleCuenta({ id, servicios, gestiona, verPaciente, onCerrar, onCambio }) {
  const [cuenta, setCuenta] = useState(null);
  const [error, setError] = useState(null);
  const [aviso, setAviso] = useState(null);
  const [errorAccion, setErrorAccion] = useState(null);
  const [ocupado, setOcupado] = useState(false);

  const cargar = useCallback(() => {
    client.get(`/cuentas/${id}`).then((r) => { setCuenta(r.data.data); setError(null); }).catch((err) => setError(mensajeError(err)));
  }, [id]);

  useEffect(() => { cargar(); }, [cargar]);

  useEffect(() => {
    const tecla = (e) => { if (e.key === "Escape") onCerrar(); };
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [onCerrar]);

  // Las acciones devuelven la cuenta actualizada: se muestra de inmediato, sin otra consulta
  function hecho(mensaje, datos) {
    setAviso(mensaje);
    setErrorAccion(null);
    if (datos) setCuenta(datos); else cargar();
    onCambio();
  }

  function accion(ruta) {
    setOcupado(true);
    setErrorAccion(null);
    setAviso(null);
    client
      .post(`/cuentas/${id}/${ruta}`)
      .then((r) => { setCuenta(r.data.data); setAviso(r.data.message); onCambio(); })
      .catch((err) => setErrorAccion(mensajeError(err)))
      .finally(() => setOcupado(false));
  }

  const estado = cuenta && (ESTADO_CUENTA[cuenta.estado] ?? { texto: cuenta.estado, clase: "bg-gray-100" });
  const abierta = cuenta?.estado === "ABIERTA";
  const ingresado = cuenta?.estado_hospitalizacion === "ACTIVO";

  return (
    <div className="fixed inset-0 z-30 flex justify-end" role="dialog" aria-modal="true" aria-label="Estado de cuenta">
      <div className="absolute inset-0 bg-slate-900/40" onClick={onCerrar} />
      <aside className="relative h-full w-full max-w-3xl bg-white shadow-xl overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-5 py-3 flex items-start justify-between gap-3 z-10">
          <div>
            <h2 className="text-lg font-bold text-slate-800">{cuenta ? `Cuenta No. ${cuenta.id} · ${cuenta.paciente}` : "Estado de cuenta"}</h2>
            {cuenta && <p className="text-sm text-slate-500">{descripcionCuenta(cuenta)} · abierta el {fechaHora(cuenta.fecha_apertura)}</p>}
          </div>
          <div className="flex items-center gap-2">
            {estado && <span className={`px-2 py-1 rounded text-xs font-medium ${estado.clase}`}>{estado.texto}</span>}
            <button onClick={onCerrar} className="rounded p-1.5 hover:bg-slate-100" aria-label="Cerrar">
              <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M5 5l10 10M15 5L5 15" /></svg>
            </button>
          </div>
        </div>

        <div className="p-5 space-y-5">
          {error && <p className="text-sm text-red-600">{error}</p>}
          {!cuenta && !error && <p className="text-sm text-slate-400">Cargando...</p>}
          {aviso && <p className="text-sm text-green-800 bg-green-50 border border-green-200 rounded-lg px-3 py-2">{aviso}</p>}
          {errorAccion && <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{errorAccion}</p>}

          {cuenta && (
            <>
              <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[["Cargos", cuenta.cargos], ["Descuentos", cuenta.descuentos], ["Pagos", cuenta.pagos], ["Saldo", cuenta.saldo]].map(([t, v]) => (
                  <div key={t} className={`rounded-lg border p-3 ${t === "Saldo" ? "bg-slate-50" : ""}`}>
                    <dt className="text-xs text-slate-500">{t}</dt>
                    <dd className={`text-lg font-semibold tabular-nums ${t === "Saldo" ? "text-slate-900" : "text-slate-700"}`}>{quetzales(v)}</dd>
                  </div>
                ))}
              </dl>

              {cuenta.estancia_en_curso && (
                <p className="text-sm text-blue-900 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                  Día cama en curso: {cuenta.estancia_en_curso.area}, {cuenta.estancia_en_curso.dias} {cuenta.estancia_en_curso.dias === 1 ? "día" : "días"} × {quetzales(cuenta.estancia_en_curso.tarifa)} = {quetzales(cuenta.estancia_en_curso.monto)}.
                  Total estimado a la fecha: <span className="font-semibold">{quetzales(cuenta.total_estimado)}</span>
                </p>
              )}

              {cuenta.numero_referencia && (
                <div className="text-sm border rounded-lg p-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div><p className="text-xs text-slate-500">Referencia de pago</p><p className="font-mono font-semibold">{cuenta.numero_referencia}</p></div>
                  <div><p className="text-xs text-slate-500">Vence</p><p>{formatoDia(cuenta.fecha_vencimiento)}</p></div>
                  <div><p className="text-xs text-slate-500">Autorización</p><p className="font-mono">{cuenta.numero_autorizacion ?? "—"}</p></div>
                  <div><p className="text-xs text-slate-500">Pagado el</p><p>{cuenta.fecha_pago ? fechaHora(cuenta.fecha_pago) : "—"}</p></div>
                </div>
              )}

              {gestiona && (
                <section className="space-y-3">
                  {abierta && <AgregarCargo cuenta={cuenta} servicios={servicios} onHecho={hecho} />}
                  <div className="flex flex-wrap items-center gap-2">
                    {abierta && <Descuento cuenta={cuenta} onHecho={hecho} />}
                    {abierta && (
                      <button onClick={() => accion("cerrar")} disabled={ocupado || ingresado}
                        title={ingresado ? "El paciente sigue ingresado: la cuenta se cierra después del egreso" : undefined}
                        className="text-sm px-4 py-1.5 rounded bg-green-700 text-white hover:bg-green-800 disabled:opacity-50 ml-auto">
                        {ocupado ? "Enviando..." : "Cerrar y enviar cobro"}
                      </button>
                    )}
                    {abierta && ingresado && <span className="text-xs text-slate-500 w-full text-right">Se cierra después del egreso del paciente.</span>}
                    {cuenta.estado === "POR_COBRAR" && (
                      <button onClick={() => accion("verificar-pago")} disabled={ocupado}
                        className="text-sm px-4 py-1.5 rounded bg-blue-700 text-white hover:bg-blue-800 disabled:opacity-50">
                        {ocupado ? "Consultando..." : "Verificar pago"}
                      </button>
                    )}
                  </div>
                </section>
              )}

              <section>
                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-2">Movimientos</h3>
                {cuenta.movimientos.length === 0 ? <p className="text-sm text-slate-500">Sin movimientos.</p> : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-slate-500">
                        <th className="py-1 pr-2 font-medium">Fecha</th><th className="py-1 pr-2 font-medium">Concepto</th>
                        <th className="py-1 pr-2 font-medium text-right">Cant.</th><th className="py-1 pr-2 font-medium text-right">Precio</th>
                        <th className="py-1 pr-2 font-medium text-right">Monto</th><th className="w-16"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {cuenta.movimientos.map((m) => (
                        <FilaMovimiento key={m.id} m={m} cuentaId={cuenta.id} puedeAnular={gestiona && abierta} onHecho={hecho} />
                      ))}
                    </tbody>
                  </table>
                )}
              </section>

              {verPaciente && (
                <Link to={`/pacientes/${cuenta.paciente_id}`} className="inline-block text-sm text-blue-700 hover:underline">Ver ficha del paciente →</Link>
              )}
            </>
          )}
        </div>
      </aside>
    </div>
  );
}
