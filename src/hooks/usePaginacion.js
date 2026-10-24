import { useState } from "react";

export const TAMANOS = [15, 20, 50, 100];

// Paginación en el navegador para listas que ya están cargadas.
// Uso: const pag = usePaginacion(lista, 15, claveFiltros);  pag.items ... <Paginacion {...pag} />
// Cuando cambia `reinicio` (por ejemplo, los filtros) se vuelve a la página 1.
export default function usePaginacion(items, porPaginaInicial = 15, reinicio = "") {
  const [estado, setEstado] = useState({ pagina: 1, reinicio });
  const [porPagina, setPorPagina] = useState(porPaginaInicial);
  const total = Math.max(1, Math.ceil(items.length / porPagina));
  const pagina = Math.min(estado.reinicio === reinicio ? estado.pagina : 1, total);
  return {
    items: items.slice((pagina - 1) * porPagina, pagina * porPagina),
    pagina,
    total,
    cantidad: items.length,
    porPagina,
    irA: (n) => setEstado({ pagina: Math.max(1, Math.min(n, total)), reinicio }),
    cambiarPorPagina: (n) => {
      setPorPagina(n);
      setEstado({ pagina: 1, reinicio });
    },
  };
}
