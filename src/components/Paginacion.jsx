// Controles de paginación; los datos los calcula el hook usePaginacion.
export default function Paginacion({ pagina, total, cantidad, porPagina, irA }) {
  if (total <= 1) return null;
  const desde = (pagina - 1) * porPagina + 1;
  const hasta = Math.min(pagina * porPagina, cantidad);
  const boton = "px-3 py-1 rounded-lg border border-slate-300 text-sm hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed";
  return (
    <div className="flex items-center justify-between mt-3 text-sm text-slate-500">
      <span>{desde}–{hasta} de {cantidad}</span>
      <div className="flex items-center gap-2">
        <button className={boton} onClick={() => irA(pagina - 1)} disabled={pagina === 1}>Anterior</button>
        <span>Página {pagina} de {total}</span>
        <button className={boton} onClick={() => irA(pagina + 1)} disabled={pagina === total}>Siguiente</button>
      </div>
    </div>
  );
}
