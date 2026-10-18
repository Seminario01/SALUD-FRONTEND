import { useEffect, useState } from "react";
import client from "../api/client";
import GraficaLinea from "./GraficaLinea";

// Historial de signos vitales del paciente (de las notas de hospitalización), para la ficha.
// Colores validados (azul y naranja, distinguibles con daltonismo) para sistólica y diastólica.
const AZUL = "#2a78d6";
const NARANJA = "#eb6834";

const GRAFICAS = [
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

export default function SignosVitales({ pacienteId }) {
  const [datos, setDatos] = useState(null);

  useEffect(() => {
    client.get(`/pacientes/${pacienteId}/signos`).then((r) => setDatos(r.data.data)).catch(() => setDatos([]));
  }, [pacienteId]);

  if (datos === null) return <p className="text-sm text-slate-400">Cargando...</p>;
  if (datos.length === 0) {
    return <p className="text-sm text-slate-500">Sin signos vitales registrados. Se toman de las notas de hospitalización.</p>;
  }

  const ultimo = (clave) => [...datos].reverse().find((d) => d[clave] != null);
  const resumen = [
    ["Presión", ultimo("presion")?.presion, "mmHg"],
    ["Temperatura", ultimo("temperatura")?.temperatura?.toFixed(1), "°C"],
    ["Frec. cardiaca", ultimo("frecuencia_cardiaca")?.frecuencia_cardiaca, "lpm"],
    ["Saturación", ultimo("saturacion")?.saturacion, "%"],
    ["Peso", ultimo("peso")?.peso?.toFixed(1), "kg"],
  ].filter(([, v]) => v != null);

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-3">
        {resumen.map(([t, v, u]) => (
          <div key={t} className="rounded-lg border px-3 py-1.5">
            <p className="text-[11px] text-slate-500">{t} (último)</p>
            <p className="font-semibold tabular-nums text-slate-800">{v} <span className="text-xs font-normal text-slate-500">{u}</span></p>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {GRAFICAS.map((g) => {
          const puntos = datos
            .filter((d) => g.series.some((s) => d[s.clave] != null))
            .map((d) => ({
              fecha: d.fecha,
              valores: Object.fromEntries(g.series.map((s) => [s.clave, d[s.clave]])),
              nota: [d.autor, d.puesto].filter(Boolean).join(" · "),
            }));
          if (!puntos.length) return null;
          return <GraficaLinea key={g.titulo} titulo={g.titulo} unidad={g.unidad} series={g.series} puntos={puntos}
            rangoNormal={g.rango} decimales={g.decimales ?? 0} />;
        })}
      </div>
      <p className="text-xs text-slate-400 mt-2">La franja gris marca el rango normal de referencia en adultos.</p>
    </div>
  );
}
