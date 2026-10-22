// Genera src/modo-oscuro.css: la versión oscura de las clases de color de Tailwind que usa la app.
//
// En lugar de escribir "dark:..." en cada pantalla, este script busca en src/ las clases de color
// (bg-white, text-slate-500, bg-blue-50, border-red-200, hover:bg-gray-100...) y les da su color
// para el modo oscuro: los fondos claros se vuelven oscuros y los textos oscuros se vuelven claros.
// Los colores fuertes (botones bg-blue-700, triage, insignias) se quedan igual.
// Lo que está dentro de un elemento con la clase "papel" (hojas para imprimir) se queda claro.
//
// Uso (en SALUD-FRONTEND):
//   node scripts/modo-oscuro.mjs            vuelve a generar el archivo (después de agregar clases nuevas)
//   node scripts/modo-oscuro.mjs --revisar  falla si el archivo no está al día (lo corre GitHub)
import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const SALIDA = join(RAIZ, "src", "modo-oscuro.css");

// Colores de Tailwind (oklch) leídos de su propio archivo de tema
const tema = readFileSync(join(RAIZ, "node_modules", "tailwindcss", "theme.css"), "utf8");
const COLOR = {};
for (const [, nombre, valor] of tema.matchAll(/--color-([a-z]+-\d+|white|black):\s*([^;]+);/g)) COLOR[nombre] = valor.trim();

const NEUTROS = ["slate", "gray", "zinc", "neutral", "stone"];
const TONOS = ["red", "orange", "amber", "yellow", "lime", "green", "emerald", "teal", "cyan", "sky", "blue",
  "indigo", "violet", "purple", "fuchsia", "pink", "rose"];
const PROPIEDADES = {
  bg: { css: "background-color", tipo: "fondo" },
  text: { css: "color", tipo: "texto" },
  fill: { css: "fill", tipo: "texto" },
  placeholder: { css: "color", tipo: "texto", extra: "::placeholder" },
  border: { css: "border-color", tipo: "linea" },
  "border-t": { css: "border-top-color", tipo: "linea" },
  "border-b": { css: "border-bottom-color", tipo: "linea" },
  "border-l": { css: "border-left-color", tipo: "linea" },
  "border-r": { css: "border-right-color", tipo: "linea" },
  "border-x": { css: "border-inline-color", tipo: "linea" },
  "border-y": { css: "border-block-color", tipo: "linea" },
  divide: { css: "border-color", tipo: "linea", extra: " > :not(:last-child)" },
  ring: { css: "--tw-ring-color", tipo: "linea" },
  outline: { css: "outline-color", tipo: "linea" },
  stroke: { css: "stroke", tipo: "linea" },
};
const VARIANTES = { hover: ":hover", focus: ":focus", "focus-visible": ":focus-visible", active: ":active", disabled: ":disabled" };

const mezcla = (nombre, porcentaje) => porcentaje >= 100 ? COLOR[nombre] : `color-mix(in oklab, ${COLOR[nombre]} ${porcentaje}%, transparent)`;

// Color oscuro de una clase, o null si se queda igual
function oscuro(tipo, color, tono, alfa) {
  const a = alfa ?? 100;
  if (color === "white") {
    if (alfa != null) return null;                      // velos blancos sobre el encabezado azul
    return tipo === "texto" ? null : COLOR["slate-900"]; // tarjetas y rellenos blancos
  }
  if (color === "black") return tipo === "texto" ? COLOR["slate-100"] : null;
  if (NEUTROS.includes(color)) {
    if (tipo === "texto") {
      const a2 = { 400: "slate-500", 500: "slate-400", 600: "slate-400", 700: "slate-300", 800: "slate-200", 900: "slate-100", 950: "slate-100" }[tono];
      return a2 ? mezcla(a2, a) : null;
    }
    if (tipo === "fondo") {
      if (tono === 50) return mezcla("slate-800", Math.round(a * 0.5));
      const a2 = { 100: "slate-800", 200: "slate-700", 300: "slate-600" }[tono];
      return a2 ? mezcla(a2, a) : null;
    }
    const a2 = { 50: "slate-800", 100: "slate-800", 200: "slate-700", 300: "slate-600", 400: "slate-500" }[tono];
    return a2 ? mezcla(a2, a) : null;
  }
  if (tipo === "texto") {
    const t = { 500: 400, 600: 400, 700: 300, 800: 200, 900: 200 }[tono];
    return t ? mezcla(`${color}-${t}`, a) : null;
  }
  const veces = tipo === "fondo" ? { 50: 12, 100: 20, 200: 30 }[tono] : { 50: 25, 100: 30, 200: 40, 300: 50 }[tono];
  return veces ? mezcla(`${color}-500`, Math.round((veces * a) / 100)) : null;
}

function archivos(dir) {
  return readdirSync(dir).flatMap((n) => {
    const ruta = join(dir, n);
    return statSync(ruta).isDirectory() ? archivos(ruta) : /\.(jsx?|tsx?)$/.test(n) ? [ruta] : [];
  });
}

const escapar = (clase) => clase.replace(/[^a-zA-Z0-9_-]/g, (c) => `\\${c}`);
const colores = [...NEUTROS, ...TONOS, "white", "black"].join("|");
const patron = new RegExp(`(?<![\\w:/-])((?:[a-z-]+:)*)(${Object.keys(PROPIEDADES).join("|")})-(${colores})(?:-(\\d{2,3}))?(?:/(\\d{1,3}))?(?![\\w/-])`, "g");

const reglas = new Map();
const omitidas = new Set();
for (const ruta of archivos(join(RAIZ, "src"))) {
  for (const m of readFileSync(ruta, "utf8").matchAll(patron)) {
    const [clase, prefijos, prop, color, tonoTxt, alfaTxt] = m;
    const variantes = prefijos.split(":").filter(Boolean);
    if (variantes.includes("print") || variantes.includes("dark")) continue;   // papel: claro; dark: ya es a mano
    if (variantes.some((v) => !(v in VARIANTES))) { omitidas.add(clase); continue; }
    if (!["white", "black"].includes(color) && !tonoTxt) continue;
    const { css, tipo, extra = "" } = PROPIEDADES[prop];
    const valor = oscuro(tipo, color, tonoTxt ? Number(tonoTxt) : null, alfaTxt ? Number(alfaTxt) : null);
    if (!valor) continue;
    const pseudo = variantes.map((v) => VARIANTES[v]).join("");
    reglas.set(clase, `:where(html.dark) .${escapar(clase)}:not(:where(.papel, .papel *))${pseudo}${extra} { ${css}: ${valor}; }`);
  }
}

const css = `/* ARCHIVO GENERADO por scripts/modo-oscuro.mjs: no se edita a mano. */
/* Colores del modo oscuro para las clases de Tailwind que usa la app (${reglas.size} clases). */
/* Van en la capa "utilities" con :where() para que hover:, focus: y dark: sigan ganando. */
@media screen {
  @layer utilities {
${[...reglas.keys()].sort().map((k) => "    " + reglas.get(k)).join("\n")}
  }
}
`;

if (process.argv.includes("--revisar")) {
  let actual = "";
  try { actual = readFileSync(SALIDA, "utf8").replace(/\r\n/g, "\n"); } catch { /* no existe */ }
  if (actual !== css) {
    console.error("src/modo-oscuro.css no está al día: corra  node scripts/modo-oscuro.mjs  y súbalo.");
    process.exit(1);
  }
  console.log(`modo-oscuro.css al día (${reglas.size} clases)`);
} else {
  writeFileSync(SALIDA, css);
  console.log(`src/modo-oscuro.css: ${reglas.size} clases`);
}
if (omitidas.size) console.log(`Sin versión oscura automática (variantes de pantalla como sm: o md:): ${[...omitidas].sort().join(" ")}`);
