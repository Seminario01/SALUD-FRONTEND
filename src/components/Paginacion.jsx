import { useRef } from "react";
import { TAMANOS } from "../hooks/usePaginacion";

// Páginas a mostrar: la primera, la última y dos alrededor de la actual ("…" en los saltos).
function numeros(pagina, total) {
  const lista = [];
  for (let n = 1; n <= total; n++) {
    if (n === 1 || n === total || Math.abs(n - pagina) <= 1) lista.push(n);
    else if (lista[lista.length - 1] !== "…") lista.push("…");
  }
  return lista;
}

// Controles de paginación; los datos los calcula el hook usePaginacion.
export default function Paginacion({ pagina, total, cantidad, porPagina, irA, cambiarPorPagina }) {
  const ref = useRef(null);
  const tamanos = [...new Set([...TAMANOS, porPagina])].sort((a, b) => a - b);
  if (cantidad <= tamanos[0]) return null;
  // Al cambiar de página, si el inicio de la lista quedó arriba de la pantalla, se sube hasta él
  const ir = (n) => {
    irA(n);
    requestAnimationFrame(() => {
      const lista = ref.current?.previousElementSibling;
      if (lista && lista.getBoundingClientRect().top < 0) lista.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };
  const desde = (pagina - 1) * porPagina + 1;
  const hasta = Math.min(pagina * porPagina, cantidad);
  const boton = "min-w-8 px-2.5 py-1 rounded-lg border border-slate-300 text-sm hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed";
  return (
    <nav ref={ref} aria-label="Paginación" className="flex flex-wrap items-center justify-between gap-3 mt-3 text-sm text-slate-500 print:hidden">
      <div className="flex items-center gap-3">
        <span>{desde}–{hasta} de {cantidad}</span>
        {cambiarPorPagina && (
          <label className="flex items-center gap-1.5">
            Mostrar
            <select value={porPagina} onChange={(e) => cambiarPorPagina(Number(e.target.value))}
              className="border border-slate-300 rounded-lg px-1.5 py-1 bg-white text-slate-700">
              {tamanos.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
        )}
      </div>
      {total > 1 && (
        <div className="flex flex-wrap items-center gap-1">
          <button className={boton} onClick={() => ir(pagina - 1)} disabled={pagina === 1}>Anterior</button>
          {numeros(pagina, total).map((n, i) =>
            n === "…" ? (
              <span key={`s${i}`} className="px-1">…</span>
            ) : (
              <button key={n} onClick={() => ir(n)} aria-current={n === pagina ? "page" : undefined}
                className={`${boton} ${n === pagina ? "bg-blue-700 border-blue-700 text-white hover:bg-blue-700" : ""}`}>
                {n}
              </button>
            ),
          )}
          <button className={boton} onClick={() => ir(pagina + 1)} disabled={pagina === total}>Siguiente</button>
        </div>
      )}
    </nav>
  );
}
