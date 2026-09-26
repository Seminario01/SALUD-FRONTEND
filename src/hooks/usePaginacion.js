import { useState } from "react";

// Paginación en el navegador para listas que ya están cargadas.
// Uso: const pag = usePaginacion(lista, 15);  pag.pagina (items) ... <Paginacion {...pag} />
export default function usePaginacion(items, porPagina = 15) {
  const [actual, setActual] = useState(1);
  const total = Math.max(1, Math.ceil(items.length / porPagina));
  const pagina = Math.min(actual, total);
  return {
    items: items.slice((pagina - 1) * porPagina, pagina * porPagina),
    pagina,
    total,
    cantidad: items.length,
    porPagina,
    irA: (n) => setActual(Math.max(1, Math.min(n, total))),
  };
}
