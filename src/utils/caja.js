// Constantes y formatos de Caja y cuentas.

export const ESTADO_CUENTA = {
  ABIERTA: { texto: "Abierta", clase: "bg-blue-100 text-blue-800" },
  POR_COBRAR: { texto: "Por cobrar", clase: "bg-yellow-100 text-yellow-800" },
  PAGADA: { texto: "Pagada", clase: "bg-green-100 text-green-800" },
  EXONERADA: { texto: "Exonerada", clase: "bg-slate-200 text-slate-700" },
};

export const CATEGORIA = {
  DIA_CAMA: "Día cama",
  MEDICAMENTO: "Medicamento",
  LABORATORIO: "Laboratorio",
  IMAGEN: "Imágenes",
  PROCEDIMIENTO: "Procedimiento",
  DESCUENTO: "Descuento",
  PAGO: "Pago",
};

const formato = new Intl.NumberFormat("es-GT", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function quetzales(valor) {
  return `Q${formato.format(Number(valor ?? 0))}`;
}

export function descripcionCuenta(c) {
  if (c.tipo === "AMBULATORIA") return "Ambulatoria";
  return `Hospitalización${c.area ? ` · ${c.area}` : ""}${c.cama && c.estado_hospitalizacion === "ACTIVO" ? ` · ${c.cama}` : ""}`;
}
