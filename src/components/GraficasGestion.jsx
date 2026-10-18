import { useEffect, useState } from "react";
import client from "../api/client";
import GraficaBarras from "./GraficaBarras";

// Gráficas del Dashboard: citas por mes y cobrado por mes, de los últimos 6 meses.
// Se calculan en el navegador con las listas que ya da la API (citas y cuentas).

const MESES = 6;

function ultimosMeses() {
  const hoy = new Date();
  return Array.from({ length: MESES }, (_, i) => {
    const d = new Date(hoy.getFullYear(), hoy.getMonth() - (MESES - 1 - i), 1);
    return {
      clave: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      etiqueta: d.toLocaleDateString("es-GT", { month: "short" }).replace(".", ""),
      titulo: d.toLocaleDateString("es-GT", { month: "long", year: "numeric" }),
    };
  });
}

const mes = (fecha) => String(fecha ?? "").slice(0, 7);
const quetzales = (v) => `Q${Math.round(v).toLocaleString("es-GT")}`;

export default function GraficasGestion({ verCobros }) {
  const [citas, setCitas] = useState(null);
  const [cuentas, setCuentas] = useState(null);

  useEffect(() => {
    client.get("/citas").then((r) => setCitas(r.data.data)).catch(() => setCitas([]));
    if (verCobros) client.get("/cuentas").then((r) => setCuentas(r.data.data)).catch(() => setCuentas([]));
  }, [verCobros]);

  if (citas === null) return null;
  const meses = ultimosMeses();

  const porMes = meses.map((m) => {
    const delMes = citas.filter((c) => mes(c.fecha_hora) === m.clave);
    const cuenta = (...e) => delMes.filter((c) => e.includes(c.estado)).length;
    return {
      ...m,
      valor: delMes.length - cuenta("cancelada"),
      detalle: [`${cuenta("atendida")} atendidas`, `${cuenta("pendiente", "confirmada")} por atender`, `${cuenta("cancelada")} canceladas (no se cuentan)`],
    };
  });

  const cobros = verCobros && cuentas !== null && meses.map((m) => {
    const consultas = citas.filter((c) => c.pago_confirmado && mes(c.fecha_pago) === m.clave)
      .reduce((s, c) => s + (c.costo ?? 0), 0);
    const hospital = cuentas.filter((c) => c.estado === "PAGADA" && mes(c.fecha_pago) === m.clave)
      .reduce((s, c) => s + (c.pagos ?? 0), 0);
    return { ...m, valor: consultas + hospital, detalle: [`Consultas ${quetzales(consultas)}`, `Cuentas de Caja ${quetzales(hospital)}`] };
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-8">
      <GraficaBarras titulo="Citas por mes" subtitulo="Últimos 6 meses, sin contar las canceladas" datos={porMes} />
      {cobros && (
        <GraficaBarras titulo="Cobrado por mes" subtitulo="Pagos confirmados por Tributario: consultas y cuentas de Caja"
          datos={cobros} formato={quetzales} />
      )}
    </div>
  );
}
