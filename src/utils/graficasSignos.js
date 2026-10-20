// Gráficas de signos vitales: las usa la ficha del paciente (todo el historial) y el detalle de
// una hospitalización (solo esa estancia). Colores validados (azul y naranja, distinguibles con
// daltonismo); el rango normal es el mismo que usa el backend para las alertas.
const AZUL = "#2a78d6";
const NARANJA = "#eb6834";

export const GRAFICAS = [
  { titulo: "Presión arterial (mmHg)", unidad: "mmHg", rango: null,
    series: [{ clave: "sistolica", nombre: "Sistólica", color: AZUL }, { clave: "diastolica", nombre: "Diastólica", color: NARANJA }] },
  { titulo: "Temperatura (°C)", unidad: "°C", decimales: 1, rango: { min: 36.1, max: 37.5 },
    series: [{ clave: "temperatura", nombre: "Temperatura", color: AZUL }] },
  { titulo: "Frecuencia cardiaca (lpm)", unidad: "lpm", rango: { min: 60, max: 100 },
    series: [{ clave: "frecuencia_cardiaca", nombre: "Frecuencia", color: AZUL }] },
  { titulo: "Saturación de oxígeno (%)", unidad: "%", rango: { min: 95, max: 100 },
    series: [{ clave: "saturacion", nombre: "SpO₂", color: AZUL }] },
  { titulo: "Peso (kg)", unidad: "kg", decimales: 1, rango: null,
    series: [{ clave: "peso", nombre: "Peso", color: AZUL }] },
];

// Mediciones (de la más vieja a la más nueva) -> puntos de una gráfica
export function puntosGrafica(datos, grafica) {
  return datos
    .filter((d) => grafica.series.some((s) => d[s.clave] != null))
    .map((d) => ({
      fecha: d.fecha,
      valores: Object.fromEntries(grafica.series.map((s) => [s.clave, d[s.clave]])),
      nota: [d.autor, d.puesto].filter(Boolean).join(" · "),
    }));
}

// Notas de hospitalización (traen la presión como "120/80") -> mediciones para las gráficas
export function medicionesDeNotas(notas) {
  return [...notas]
    .map((n) => {
      const [sistolica, diastolica] = /^\d{2,3}\/\d{2,3}$/.test(n.presion || "") ? n.presion.split("/").map(Number) : [null, null];
      return { ...n, sistolica, diastolica };
    })
    .sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
}
