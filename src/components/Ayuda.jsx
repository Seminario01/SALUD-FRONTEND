import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import useRoles from "../hooks/useRoles";
import { AYUDA_CIUDADANO, ayudaDe } from "../utils/ayuda";

// Botón "?" del encabezado: ayuda de la pantalla actual, solo con lo que el puesto puede hacer.
export default function BotonAyuda() {
  const { pathname } = useLocation();
  const { puede, puesto, esCiudadano } = useRoles();
  // Se guarda en qué pantalla se abrió: al cambiar de pantalla queda cerrada sola
  const [abiertaEn, setAbiertaEn] = useState(null);
  const abierta = abiertaEn === pathname;
  const setAbierta = (si) => setAbiertaEn(si ? pathname : null);

  // Con Esc se cierra
  useEffect(() => {
    if (!abierta) return undefined;
    const tecla = (e) => e.key === "Escape" && setAbiertaEn(null);
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [abierta]);

  const ayuda = esCiudadano && pathname === "/" ? AYUDA_CIUDADANO : ayudaDe(pathname);
  const consejos = (ayuda?.consejos ?? []).filter((c) => !c.si || puede(c.si));

  return (
    <>
      <button onClick={() => setAbierta(true)} aria-label="Ayuda de esta pantalla" title="Ayuda de esta pantalla"
        className="h-9 w-9 shrink-0 rounded-lg border border-white/30 font-bold hover:bg-white/10 transition print:hidden">?</button>
      {abierta && (
        <div className="fixed inset-0 z-50 print:hidden" role="dialog" aria-modal="true" aria-labelledby="ayuda-titulo">
          <div className="absolute inset-0 bg-slate-900/30" onClick={() => setAbierta(false)} />
          <aside className="absolute right-0 top-0 h-full w-full max-w-md bg-white text-slate-800 shadow-xl flex flex-col">
            <header className="flex items-start justify-between gap-3 border-b px-5 py-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Ayuda</p>
                <h2 id="ayuda-titulo" className="text-lg font-bold">{ayuda?.titulo ?? "Módulo Salud"}</h2>
              </div>
              <button onClick={() => setAbierta(false)} aria-label="Cerrar la ayuda" className="text-slate-400 hover:text-slate-700 text-xl leading-none">✕</button>
            </header>
            <div className="flex-1 overflow-y-auto px-5 py-4">
              {consejos.length ? (
                <ol className="space-y-3">
                  {consejos.map((c, i) => (
                    <li key={i} className="flex gap-3 text-sm leading-relaxed">
                      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-blue-100 text-xs font-bold text-blue-800">{i + 1}</span>
                      <span>{c.texto}</span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-sm text-slate-500">Esta pantalla no tiene ayuda todavía. Use el menú para ir a su sección.</p>
              )}
              <div className="mt-6 rounded-lg bg-slate-50 border p-3 text-xs text-slate-600 space-y-1">
                <p>Usted entró como <span className="font-semibold">{puesto ?? (esCiudadano ? "ciudadano" : "usuario")}</span>: solo ve lo que su puesto puede hacer.</p>
                <p>Los documentos (recetas, constancias, resultados) se imprimen o se guardan en PDF con su botón «Imprimir».</p>
                <p>En el celular puede instalar el sistema como app desde el menú del navegador («Agregar a la pantalla de inicio»).</p>
              </div>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
