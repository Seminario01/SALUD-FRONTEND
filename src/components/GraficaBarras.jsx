import { useId, useState } from "react";

// Gráfica de barras de UNA serie (por ejemplo, citas por mes). Sin librerías:
// SVG con barras delgadas de punta redondeada, rejilla tenue, etiqueta solo en la última barra,
// aviso al pasar el mouse (o con el teclado) y la tabla de datos debajo ("Ver datos").
// datos: [{ etiqueta: "oct", titulo: "octubre 2026", valor: 12, detalle: ["8 atendidas", ...] }]

const ALTO = 200;
const MARGEN = { arriba: 22, abajo: 26, izquierda: 44, derecha: 8 };

function escala(maximo) {
  if (maximo <= 0) return [0, 1];
  const paso = 10 ** Math.floor(Math.log10(maximo));
  const tope = [1, 2, 2.5, 5, 10].map((m) => m * paso).find((t) => t >= maximo) ?? maximo;
  return [0, tope];
}

export default function GraficaBarras({ titulo, subtitulo, datos, formato = (v) => v.toLocaleString("es-GT"), color = "#1d4ed8" }) {
  const [activo, setActivo] = useState(null);
  const idTabla = useId();
  const ancho = 360;
  const [, tope] = escala(Math.max(0, ...datos.map((d) => d.valor)));
  const areaAncho = ancho - MARGEN.izquierda - MARGEN.derecha;
  const areaAlto = ALTO - MARGEN.arriba - MARGEN.abajo;
  const columna = areaAncho / Math.max(1, datos.length);
  const barra = Math.min(28, columna * 0.5);
  const y = (v) => MARGEN.arriba + areaAlto - (v / tope) * areaAlto;
  const marcas = [0, tope / 2, tope];
  const ultimo = datos.length - 1;

  return (
    <figure className="bg-white border rounded-lg p-5 shadow-sm break-inside-avoid">
      <figcaption className="mb-2">
        <h2 className="font-bold text-slate-700">{titulo}</h2>
        {subtitulo && <p className="text-xs text-slate-500">{subtitulo}</p>}
      </figcaption>
      <div className="relative">
        <svg viewBox={`0 0 ${ancho} ${ALTO}`} className="w-full h-auto" role="img" aria-label={`${titulo}. Los datos están en la tabla "Ver datos".`}
          onMouseLeave={() => setActivo(null)}>
          {marcas.map((m) => (
            <g key={m}>
              <line x1={MARGEN.izquierda} x2={ancho - MARGEN.derecha} y1={y(m)} y2={y(m)} stroke="#e2e8f0" strokeWidth="1" />
              <text x={MARGEN.izquierda - 6} y={y(m)} dy="0.32em" textAnchor="end" fontSize="10" fill="#64748b">{formato(m)}</text>
            </g>
          ))}
          {datos.map((d, i) => {
            const cx = MARGEN.izquierda + columna * i + columna / 2;
            const alto = Math.max(0, y(0) - y(d.valor));
            const r = Math.min(4, barra / 2, alto);
            const x0 = cx - barra / 2;
            const tope0 = y(0) - alto;
            // Barra con las esquinas de arriba redondeadas y la base recta sobre el eje
            const camino = alto <= 0 ? "" : `M${x0},${y(0)} V${tope0 + r} Q${x0},${tope0} ${x0 + r},${tope0} H${x0 + barra - r} Q${x0 + barra},${tope0} ${x0 + barra},${tope0 + r} V${y(0)} Z`;
            const resaltada = activo === i;
            return (
              <g key={d.etiqueta}>
                {camino && <path d={camino} fill={color} opacity={activo === null || resaltada ? 1 : 0.45} />}
                {i === ultimo && d.valor > 0 && (
                  <text x={cx} y={tope0 - 6} textAnchor="middle" fontSize="11" fontWeight="600" fill="#0f172a">{formato(d.valor)}</text>
                )}
                <text x={cx} y={ALTO - 8} textAnchor="middle" fontSize="11" fill={resaltada ? "#0f172a" : "#64748b"}>{d.etiqueta}</text>
                {/* Zona para el mouse: toda la columna, más grande que la barra */}
                <rect x={MARGEN.izquierda + columna * i} y={MARGEN.arriba} width={columna} height={areaAlto} fill="transparent"
                  tabIndex={0} aria-label={`${d.titulo ?? d.etiqueta}: ${formato(d.valor)}`}
                  onMouseEnter={() => setActivo(i)} onFocus={() => setActivo(i)} onBlur={() => setActivo(null)} />
              </g>
            );
          })}
          <line x1={MARGEN.izquierda} x2={ancho - MARGEN.derecha} y1={y(0)} y2={y(0)} stroke="#94a3b8" strokeWidth="1" />
        </svg>
        {activo !== null && (
          <div className="pointer-events-none absolute -top-2 z-10 whitespace-nowrap rounded-md border bg-white px-3 py-2 text-xs shadow-lg"
            style={{ left: `${((MARGEN.izquierda + columna * activo + columna / 2) / ancho) * 100}%`, transform: `translateX(${activo === 0 ? "-15%" : activo === ultimo ? "-85%" : "-50%"})` }}>
            <p className="font-semibold text-slate-800 first-letter:uppercase">{datos[activo].titulo ?? datos[activo].etiqueta}</p>
            <p className="text-slate-700">{formato(datos[activo].valor)}</p>
            {datos[activo].detalle?.map((t) => <p key={t} className="text-slate-500">{t}</p>)}
          </div>
        )}
      </div>
      <details className="mt-2 text-xs text-slate-600 print:hidden">
        <summary className="cursor-pointer text-blue-700 w-fit" aria-controls={idTabla}>Ver datos</summary>
        <table id={idTabla} className="mt-2 w-full">
          <tbody>
            {datos.map((d) => (
              <tr key={d.etiqueta} className="border-t">
                <td className="py-1 first-letter:uppercase">{d.titulo ?? d.etiqueta}</td>
                <td className="py-1 text-right tabular-nums font-medium text-slate-800">{formato(d.valor)}</td>
                <td className="py-1 pl-3 text-slate-500">{d.detalle?.join(" · ")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
