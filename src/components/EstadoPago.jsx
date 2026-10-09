import { formatoDia } from "../utils/fechas";

// Estado del cobro en Tributario
export default function EstadoPago({ cita }) {
  if (cita.pago_confirmado) {
    return (
      <span className="inline-block">
        <span className="px-2 py-1 rounded text-sm bg-green-100 text-green-800">Pagado</span>
        {cita.numero_referencia && <span className="block text-[11px] text-slate-400 font-mono mt-0.5">{cita.numero_referencia}</span>}
      </span>
    );
  }
  if (cita.estado_cobro === "PENDIENTE") {
    return (
      <span className="inline-block">
        <span className="px-2 py-1 rounded text-sm bg-amber-100 text-amber-800">Por pagar</span>
        <span className="block text-[11px] text-slate-500 font-mono mt-0.5">{cita.numero_referencia}</span>
        <span className="block text-[11px] text-slate-400">vence {formatoDia(cita.fecha_vencimiento)}</span>
      </span>
    );
  }
  if (cita.estado_cobro === "ANULADO") return <span className="text-sm text-slate-400">Cobro anulado</span>;
  return <span className="text-sm text-slate-400">—</span>;
}
