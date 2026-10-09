// Constantes y formatos compartidos por las pantallas de Hospitalización.

export const AREAS = ["Medicina general", "Pediatría", "Cuidados intensivos"];

export const ESTADO_CAMA = {
  DISPONIBLE: { texto: "Disponible", tarjeta: "bg-emerald-50 border-emerald-300 text-emerald-900", punto: "bg-emerald-500" },
  OCUPADA: { texto: "Ocupada", tarjeta: "bg-blue-50 border-blue-300 text-blue-900", punto: "bg-blue-600" },
  LIMPIEZA: { texto: "Limpieza", tarjeta: "bg-amber-50 border-amber-300 text-amber-900", punto: "bg-amber-500" },
  MANTENIMIENTO: { texto: "Mantenimiento", tarjeta: "bg-slate-100 border-slate-300 text-slate-600", punto: "bg-slate-400" },
};

export const ESTADO_HOSPITALIZACION = {
  PENDIENTE: { texto: "Pendiente de cama", clase: "bg-yellow-100 text-yellow-800" },
  ACTIVO: { texto: "Ingresado", clase: "bg-blue-100 text-blue-800" },
  EGRESADO: { texto: "Egresado", clase: "bg-green-100 text-green-800" },
  ANULADO: { texto: "Anulado", clase: "bg-red-100 text-red-800" },
};

export const TIPOS_EGRESO = {
  ALTA: "Alta médica",
  ALTA_VOLUNTARIA: "Alta voluntaria",
  TRASLADO: "Traslado a otro centro",
  DEFUNCION: "Defunción",
};

export function fechaHora(texto) {
  if (!texto) return "—";
  const fecha = new Date(String(texto).replace(" ", "T"));
  return isNaN(fecha) ? texto : fecha.toLocaleString("es-GT", { dateStyle: "medium", timeStyle: "short" });
}

export function haceCuanto(texto) {
  if (!texto) return "";
  const fecha = new Date(String(texto).replace(" ", "T"));
  const minutos = Math.round((Date.now() - fecha.getTime()) / 60000);
  if (isNaN(minutos)) return "";
  if (minutos < 1) return "hace un momento";
  if (minutos < 60) return `hace ${minutos} min`;
  if (minutos < 24 * 60) return `hace ${Math.floor(minutos / 60)} h`;
  return fechaHora(texto);
}

export function textoDias(dias) {
  if (dias === null || dias === undefined) return "—";
  return dias === 0 ? "Hoy" : dias === 1 ? "1 día" : `${dias} días`;
}
