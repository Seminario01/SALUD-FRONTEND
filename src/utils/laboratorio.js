// Laboratorio: estados, colores y la misma interpretación del backend (laboratorio.py) para
// marcar en vivo, mientras se digita, si un resultado está fuera del rango normal.

export const ESTADO_ORDEN = {
  PENDIENTE: { texto: "Pendiente de muestra", clase: "bg-amber-100 text-amber-800" },
  EN_PROCESO: { texto: "Muestra tomada", clase: "bg-blue-100 text-blue-800" },
  COMPLETADA: { texto: "Resultados listos", clase: "bg-green-100 text-green-800" },
  ANULADA: { texto: "Anulada", clase: "bg-red-100 text-red-800" },
};

export const NIVEL = {
  alto: { texto: "Alto", flecha: "↑", clase: "text-red-700 font-semibold" },
  bajo: { texto: "Bajo", flecha: "↓", clase: "text-red-700 font-semibold" },
  anormal: { texto: "Anormal", flecha: "*", clase: "text-red-700 font-semibold" },
  normal: { texto: "Normal", flecha: "", clase: "text-slate-800" },
};

export function interpretar(p, valor) {
  if (valor === null || valor === undefined || valor === "") return null;
  if (p.tipo === "opcion") return p.normales.includes(valor) ? "normal" : "anormal";
  const v = Number(String(valor).replace(",", "."));
  if (Number.isNaN(v)) return null;
  if (p.min !== null && v < p.min) return "bajo";
  if (p.max !== null && v > p.max) return "alto";
  return "normal";
}

export const fueraDeRango = (nivel) => nivel === "alto" || nivel === "bajo" || nivel === "anormal";
