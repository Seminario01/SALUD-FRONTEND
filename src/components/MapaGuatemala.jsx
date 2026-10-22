import { useEffect, useMemo, useState } from "react";

// Mapa de calor de Guatemala por municipio (SVG, sin librerías).
// Límites: CONRED / OCHA (HDX cod-ab-gtm), licencia CC BY-IGO, simplificados en public/mapas.
// Color secuencial de un solo tono (azul claro -> oscuro; al revés en modo oscuro) según la cantidad de casos;
// sin casos en gris neutro; "pocos" (oculto por privacidad) con rayado; alerta con borde rojo.

const ESCALA = [1, 2, 3, 4, 5].map((i) => `var(--mapa-${i})`);   // index.css: en oscuro, más casos = más brillante
const SIN_CASOS = "var(--mapa-sin-casos)";   // cambian con el modo oscuro (index.css)
const LAGO = "var(--mapa-lago)";
const ALERTA = "#d03b3b";
const ANCHO = 1000;

let mapa = null;
const cargarMapa = () => (mapa ??= fetch("/mapas/guatemala.geojson").then((r) => {
  if (!r.ok) throw new Error("mapa");
  return r.json();
}).catch((e) => { mapa = null; throw e; }));

// Escala de color en 5 tramos iguales hasta el máximo (1 caso ya pinta el primer tramo)
function colorDe(valor, maximo) {
  if (!valor) return SIN_CASOS;
  const i = Math.min(ESCALA.length - 1, Math.floor(((valor - 1) / Math.max(1, maximo)) * ESCALA.length));
  return ESCALA[i];
}

function limites(features) {
  let [x0, y0, x1, y1] = [Infinity, Infinity, -Infinity, -Infinity];
  for (const f of features) for (const poli of f.geometry.coordinates) for (const [x, y] of poli[0]) {
    x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
  }
  return [x0, y0, x1, y1];
}

export default function MapaGuatemala({ valores = {}, pocos = new Set(), alertas = new Set(), departamento, seleccionado, onElegir }) {
  const [geo, setGeo] = useState(null);
  const [error, setError] = useState(false);
  const [encima, setEncima] = useState(null);     // { codigo, x, y } para el aviso al pasar el mouse

  useEffect(() => { cargarMapa().then(setGeo).catch(() => setError(true)); }, []);

  const dibujo = useMemo(() => {
    if (!geo) return null;
    const municipios = geo.features.filter((f) => f.properties.tipo === "municipio");
    const deptos = geo.features.filter((f) => f.properties.tipo === "departamento");
    const visibles = departamento ? municipios.filter((f) => f.properties.departamento === departamento) : municipios;
    const [x0, y0, x1, y1] = limites(departamento ? visibles : deptos);
    const k = Math.cos((((y0 + y1) / 2) * Math.PI) / 180);       // corrige el ancho según la latitud
    const escala = ANCHO / ((x1 - x0) * k);
    const alto = (y1 - y0) * escala;
    const ruta = (f) => f.geometry.coordinates.map((poli) => poli.map((anillo) =>
      `M${anillo.map(([x, y]) => `${((x - x0) * k * escala).toFixed(1)},${((y1 - y) * escala).toFixed(1)}`).join("L")}Z`).join("")).join("");
    return {
      alto,
      municipios: visibles.map((f) => ({ ...f.properties, d: ruta(f) })),
      deptos: (departamento ? deptos.filter((f) => f.properties.codigo === departamento) : deptos).map((f) => ({ ...f.properties, d: ruta(f) })),
    };
  }, [geo, departamento]);

  if (error) return <p className="text-sm text-red-600">No se pudo cargar el mapa.</p>;
  if (!dibujo) return <div className="aspect-[4/3] w-full animate-pulse rounded-lg bg-slate-100" aria-label="Cargando el mapa" />;

  const maximo = Math.max(1, ...Object.values(valores).filter((v) => typeof v === "number"));
  const info = encima && dibujo.municipios.find((m) => m.codigo === encima.codigo);
  const texto = (m) => {
    if (m.codigo.endsWith("00")) return "Lago";
    if (pocos.has(m.codigo)) return "Menos de 3 pacientes (no se muestra la cifra)";
    const v = valores[m.codigo] ?? 0;
    return `${v} caso${v === 1 ? "" : "s"}${alertas.has(m.codigo) ? " · ⚠ posible brote" : ""}`;
  };

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${ANCHO} ${dibujo.alto.toFixed(0)}`} className="w-full h-auto" role="img"
        aria-label={`Mapa de casos por municipio${departamento ? "" : " de Guatemala"}`} onMouseLeave={() => setEncima(null)}>
        <defs>
          <pattern id="rayado-pocos" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="8" height="8" style={{ fill: SIN_CASOS }} />
            <line x1="0" y1="0" x2="0" y2="8" className="stroke-slate-400" strokeWidth="2" />
          </pattern>
        </defs>
        {dibujo.municipios.map((m) => {
          const lago = m.codigo.endsWith("00");
          const relleno = lago ? LAGO : pocos.has(m.codigo) ? "url(#rayado-pocos)" : colorDe(valores[m.codigo], maximo);
          return (
            <path key={m.codigo} d={m.d} style={{ fill: relleno }} strokeWidth="0.8" fillRule="evenodd"
              className={lago ? "stroke-white" : "stroke-white cursor-pointer hover:opacity-80"}
              onMouseMove={(e) => {
                const caja = e.currentTarget.ownerSVGElement.getBoundingClientRect();
                setEncima({ codigo: m.codigo, x: e.clientX - caja.left, y: e.clientY - caja.top });
              }}
              onClick={() => !lago && onElegir?.(m.codigo)}>
              <title>{`${m.nombre}: ${texto(m)}`}</title>
            </path>
          );
        })}
        {/* Bordes de departamento encima (más gruesos), sin capturar el mouse */}
        {dibujo.deptos.map((d) => <path key={d.codigo} d={d.d} fill="none" className="stroke-slate-500" strokeWidth="1.4" pointerEvents="none" />)}
        {/* Municipios con alerta y el elegido: borde encima de todo */}
        {dibujo.municipios.filter((m) => alertas.has(m.codigo)).map((m) => (
          <path key={`a${m.codigo}`} d={m.d} fill="none" stroke={ALERTA} strokeWidth="3" pointerEvents="none" />
        ))}
        {seleccionado && dibujo.municipios.filter((m) => m.codigo === seleccionado).map((m) => (
          <path key="sel" d={m.d} fill="none" className="stroke-slate-900 dark:stroke-slate-100" strokeWidth="3" strokeDasharray="6 3" pointerEvents="none" />
        ))}
      </svg>
      {info && (
        <div className="pointer-events-none absolute z-10 rounded-lg border bg-white px-3 py-2 text-xs shadow-lg"
          style={{ left: Math.min(encima.x + 12, 9999), top: encima.y + 12, transform: encima.x > 260 ? "translateX(-110%)" : undefined }}>
          <p className="font-semibold text-slate-800">{info.nombre}</p>
          <p className="text-slate-600">{texto(info)}</p>
        </div>
      )}
    </div>
  );
}

// Leyenda de la escala (tramos con su rango de casos)
export function LeyendaMapa({ maximo, hayPocos, hayAlertas }) {
  const max = Math.max(1, maximo);
  const tramos = ESCALA.map((c, i) => {
    const desde = Math.floor((i * max) / ESCALA.length) + 1;
    const hasta = Math.floor(((i + 1) * max) / ESCALA.length);
    return { c, texto: desde >= hasta ? `${hasta}` : `${desde}–${hasta}`, vacio: hasta < desde };
  }).filter((t) => !t.vacio);
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-600">
      <span className="font-medium">Casos:</span>
      <span className="flex items-center gap-1"><span className="h-3 w-5 rounded-sm border" style={{ background: SIN_CASOS }} />0</span>
      {tramos.map((t) => <span key={t.c} className="flex items-center gap-1"><span className="h-3 w-5 rounded-sm" style={{ background: t.c }} />{t.texto}</span>)}
      {hayPocos && (
        <span className="flex items-center gap-1">
          <svg width="20" height="12" aria-hidden="true"><rect width="20" height="12" fill="url(#rayado-pocos)" /></svg>
          menos de 3 pacientes
        </span>
      )}
      {hayAlertas && <span className="flex items-center gap-1"><span className="h-3 w-5 rounded-sm border-2" style={{ borderColor: ALERTA }} />⚠ posible brote</span>}
    </div>
  );
}
