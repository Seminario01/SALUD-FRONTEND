import { useId, useState } from "react";

// Gráfica de líneas en el tiempo (signos vitales). Sin librerías: SVG con líneas de 2 px,
// puntos de 8 px, franja tenue del rango normal, cruz y aviso al pasar el mouse, y tabla "Ver datos".
// series: [{ clave: "sistolica", nombre: "Sistólica", color: "#2a78d6" }]   (una o dos)
// puntos: [{ fecha: "2026-10-18T09:20", valores: { sistolica: 120, diastolica: 80 }, nota: "Enf. Ana" }]

const ANCHO = 360;
const ALTO = 170;
const M = { arriba: 14, abajo: 22, izquierda: 36, derecha: 44 };

const fechaCorta = (t) => new Date(t).toLocaleDateString("es-GT", { day: "numeric", month: "short" });
const fechaHora = (t) => new Date(t).toLocaleString("es-GT", { dateStyle: "medium", timeStyle: "short" });

export default function GraficaLinea({ titulo, unidad, series, puntos, rangoNormal, decimales = 0 }) {
  const [activo, setActivo] = useState(null);
  const idTabla = useId();
  const formato = (v) => (v == null ? "—" : `${Number(v).toFixed(decimales)}${unidad ? ` ${unidad}` : ""}`);

  const tiempos = puntos.map((p) => new Date(p.fecha).getTime());
  const valores = puntos.flatMap((p) => series.map((s) => p.valores[s.clave]).filter((v) => v != null));
  if (!valores.length) return null;
  const bajo = Math.min(...valores, rangoNormal?.min ?? Infinity);
  const alto = Math.max(...valores, rangoNormal?.max ?? -Infinity);
  const margen = Math.max((alto - bajo) * 0.12, 1);
  const y0 = bajo - margen;
  const y1 = alto + margen;
  const t0 = Math.min(...tiempos);
  const t1 = Math.max(...tiempos);
  const areaW = ANCHO - M.izquierda - M.derecha;
  const areaH = ALTO - M.arriba - M.abajo;
  const x = (t) => (t1 === t0 ? M.izquierda + areaW / 2 : M.izquierda + ((t - t0) / (t1 - t0)) * areaW);
  const y = (v) => M.arriba + areaH - ((v - y0) / (y1 - y0)) * areaH;
  const marcas = [y0 + margen, (y0 + y1) / 2, y1 - margen];
  const ultimo = puntos.length - 1;

  // Punto más cercano al mouse (en x): la cruz salta de medición en medición
  function mover(e) {
    const caja = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - caja.left) / caja.width) * ANCHO;
    let mejor = 0;
    tiempos.forEach((t, i) => { if (Math.abs(x(t) - px) < Math.abs(x(tiempos[mejor]) - px)) mejor = i; });
    setActivo(mejor);
  }

  return (
    <figure className="bg-white border rounded-lg p-4 break-inside-avoid">
      <figcaption className="flex items-start justify-between gap-2 mb-1">
        <h3 className="text-sm font-semibold text-slate-700">{titulo}</h3>
        {series.length > 1 && (
          <span className="flex gap-3 text-xs text-slate-600">
            {series.map((s) => (
              <span key={s.clave} className="inline-flex items-center gap-1">
                <span className="inline-block h-0.5 w-3 rounded" style={{ background: s.color }} />{s.nombre}
              </span>
            ))}
          </span>
        )}
      </figcaption>
      <div className="relative">
        <svg viewBox={`0 0 ${ANCHO} ${ALTO}`} className="w-full h-auto" role="img"
          aria-label={`${titulo}: ${puntos.length} medición(es). Los datos están en "Ver datos".`}
          onMouseMove={mover} onMouseLeave={() => setActivo(null)}>
          {rangoNormal && (
            <g>
              <rect x={M.izquierda} width={areaW} y={y(Math.min(rangoNormal.max, y1))}
                height={Math.max(0, y(Math.max(rangoNormal.min, y0)) - y(Math.min(rangoNormal.max, y1)))} fill="#f1f5f9" />
              <text x={ANCHO - M.derecha - 4} y={y(Math.min(rangoNormal.max, y1)) + 10} textAnchor="end" fontSize="9" fill="#64748b">rango normal</text>
            </g>
          )}
          {marcas.map((m) => (
            <g key={m}>
              <line x1={M.izquierda} x2={ANCHO - M.derecha} y1={y(m)} y2={y(m)} stroke="#e2e8f0" />
              <text x={M.izquierda - 5} y={y(m)} dy="0.32em" textAnchor="end" fontSize="10" fill="#64748b">{m.toFixed(decimales)}</text>
            </g>
          ))}
          <text x={M.izquierda} y={ALTO - 6} fontSize="10" fill="#64748b">{fechaCorta(t0)}</text>
          {t1 !== t0 && <text x={ANCHO - M.derecha} y={ALTO - 6} textAnchor="end" fontSize="10" fill="#64748b">{fechaCorta(t1)}</text>}
          {activo !== null && (
            <line x1={x(tiempos[activo])} x2={x(tiempos[activo])} y1={M.arriba} y2={M.arriba + areaH} stroke="#94a3b8" strokeDasharray="3 3" />
          )}
          {series.map((s) => {
            const conValor = puntos.map((p, i) => [i, p.valores[s.clave]]).filter(([, v]) => v != null);
            const camino = conValor.map(([i, v], k) => `${k ? "L" : "M"}${x(tiempos[i])},${y(v)}`).join(" ");
            const fin = conValor[conValor.length - 1];
            return (
              <g key={s.clave}>
                <path d={camino} fill="none" stroke={s.color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
                {conValor.map(([i, v]) => (
                  <circle key={i} cx={x(tiempos[i])} cy={y(v)} r={activo === i ? 5 : 4} fill={s.color} stroke="#ffffff" strokeWidth="2" />
                ))}
                {/* Etiqueta directa solo en la última medición */}
                {fin && <text x={x(tiempos[fin[0]]) + 8} y={y(fin[1])} dy="0.32em" fontSize="10" fontWeight="600" fill="#0f172a">{Number(fin[1]).toFixed(decimales)}</text>}
              </g>
            );
          })}
        </svg>
        {activo !== null && (
          <div className="pointer-events-none absolute -top-1 z-10 whitespace-nowrap rounded-md border bg-white px-2.5 py-1.5 text-xs shadow-lg"
            style={{ left: `${(x(tiempos[activo]) / ANCHO) * 100}%`, transform: `translateX(${activo === 0 ? "-10%" : activo === ultimo ? "-90%" : "-50%"})` }}>
            <p className="font-semibold text-slate-800">{fechaHora(puntos[activo].fecha)}</p>
            {series.map((s) => (
              <p key={s.clave} className="text-slate-700">
                {series.length > 1 && <span className="inline-block h-2 w-2 rounded-full mr-1 align-middle" style={{ background: s.color }} />}
                {series.length > 1 ? `${s.nombre}: ` : ""}{formato(puntos[activo].valores[s.clave])}
              </p>
            ))}
            {puntos[activo].nota && <p className="text-slate-500">{puntos[activo].nota}</p>}
          </div>
        )}
      </div>
      <details className="mt-1 text-xs text-slate-600 print:hidden">
        <summary className="cursor-pointer text-blue-700 w-fit" aria-controls={idTabla}>Ver datos</summary>
        <table id={idTabla} className="mt-1 w-full">
          <tbody>
            {puntos.map((p, i) => (
              <tr key={i} className="border-t">
                <td className="py-0.5">{fechaHora(p.fecha)}</td>
                {series.map((s) => <td key={s.clave} className="py-0.5 text-right tabular-nums">{formato(p.valores[s.clave])}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
