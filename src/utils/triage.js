// Triage de 5 niveles (los mismos de routes/turnos.py TRIAGE en el backend)
export const TRIAGE = {
  ROJO: { nombre: "Inmediato", minutos: 0, fondo: "#dc2626", letra: "#ffffff", clase: "bg-red-600 text-white", punto: "bg-red-600" },
  NARANJA: { nombre: "Muy urgente", minutos: 10, fondo: "#ea580c", letra: "#ffffff", clase: "bg-orange-500 text-white", punto: "bg-orange-500" },
  AMARILLO: { nombre: "Urgente", minutos: 60, fondo: "#fde047", letra: "#422006", clase: "bg-yellow-300 text-yellow-950", punto: "bg-yellow-400" },
  VERDE: { nombre: "Poco urgente", minutos: 120, fondo: "#16a34a", letra: "#ffffff", clase: "bg-green-600 text-white", punto: "bg-green-600" },
  AZUL: { nombre: "No urgente", minutos: 240, fondo: "#2563eb", letra: "#ffffff", clase: "bg-blue-600 text-white", punto: "bg-blue-600" },
};

export const textoTriage = (nivel) => {
  const t = TRIAGE[nivel];
  if (!t) return "Sin clasificar";
  return `${nivel.charAt(0)}${nivel.slice(1).toLowerCase()} · ${t.nombre}${t.minutos ? ` (≤ ${t.minutos} min)` : ""}`;
};
