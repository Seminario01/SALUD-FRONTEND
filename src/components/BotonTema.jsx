import { useSyncExternalStore } from "react";
import { cambiarTema, esOscuro, suscribirTema } from "../utils/tema";

// Pasa a modo oscuro o claro (se recuerda en este navegador). En el encabezado del celular va
// como ícono; en el menú del usuario (enMenu), como una opción con texto.
export default function BotonTema({ enMenu = false }) {
  const oscuro = useSyncExternalStore(suscribirTema, esOscuro);
  const texto = oscuro ? "Cambiar a modo claro" : "Cambiar a modo oscuro";
  return (
    <button onClick={() => cambiarTema(!oscuro)} aria-label={texto} title={texto}
      className={enMenu
        ? "w-full flex items-center gap-3 px-4 py-2 text-sm hover:bg-slate-50 print:hidden"
        : "h-9 w-9 shrink-0 inline-flex items-center justify-center rounded-lg border border-white/30 hover:bg-white/10 transition print:hidden"}>
      {oscuro ? (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
        </svg>
      )}
      {enMenu && <span>{oscuro ? "Modo claro" : "Modo oscuro"}</span>}
    </button>
  );
}
