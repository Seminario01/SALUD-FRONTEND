import { useEffect, useState } from "react";
import client from "../api/client";
import GraficaLinea from "./GraficaLinea";
import { GRAFICAS, puntosGrafica } from "../utils/graficasSignos";

// Historial de signos vitales del paciente (de las notas de hospitalización), para la ficha.

export default function SignosVitales({ pacienteId }) {
  const [datos, setDatos] = useState(null);

  useEffect(() => {
    client.get(`/pacientes/${pacienteId}/signos`).then((r) => setDatos(r.data.data)).catch(() => setDatos([]));
  }, [pacienteId]);

  if (datos === null) return <p className="text-sm text-slate-400">Cargando...</p>;
  if (datos.length === 0) {
    return <p className="text-sm text-slate-500">Sin signos vitales registrados.</p>;
  }

  const ultimo = (clave) => [...datos].reverse().find((d) => d[clave] != null);
  // [título, valor, unidad, alerta del backend si ese último valor está fuera de rango]
  const fila = (titulo, clave, unidad, formato = (v) => v) => {
    const d = ultimo(clave);
    return [titulo, d ? formato(d[clave]) : null, unidad, d?.alertas?.find((a) => a.signo === clave)];
  };
  const resumen = [
    fila("Presión", "presion", "mmHg"),
    fila("Temperatura", "temperatura", "°C", (v) => v.toFixed(1)),
    fila("Frec. cardiaca", "frecuencia_cardiaca", "lpm"),
    fila("Saturación", "saturacion", "%"),
    fila("Peso", "peso", "kg", (v) => v.toFixed(1)),
  ].filter(([, v]) => v != null);

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-3">
        {resumen.map(([t, v, u, a]) => (
          <div key={t} title={a?.texto} className={`rounded-lg border px-3 py-1.5 ${a ? "border-red-200 bg-red-50" : ""}`}>
            <p className={`text-[11px] ${a ? "text-red-700" : "text-slate-500"}`}>{t} (último){a && (a.nivel === "alto" ? " · alto" : " · bajo")}</p>
            <p className={`font-semibold tabular-nums ${a ? "text-red-800" : "text-slate-800"}`}>
              {v} <span className={`text-xs font-normal ${a ? "text-red-700" : "text-slate-500"}`}>{u}</span>{a && <span aria-hidden="true"> {a.nivel === "alto" ? "↑" : "↓"}</span>}
            </p>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {GRAFICAS.map((g) => {
          const puntos = puntosGrafica(datos, g);
          if (!puntos.length) return null;
          return <GraficaLinea key={g.titulo} titulo={g.titulo} unidad={g.unidad} series={g.series} puntos={puntos}
            rangoNormal={g.rango} decimales={g.decimales ?? 0} />;
        })}
      </div>
      <p className="text-xs text-slate-400 mt-2">Franja gris: rango normal (adulto)</p>
    </div>
  );
}
