import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

// Avisos que desaparecen solos (esquina inferior derecha) y ventana de confirmación
// para las acciones importantes. Uso:
//   const avisos = useAvisos();
//   avisos.exito("Receta despachada.");     avisos.error("No se pudo...");
//   if (!(await avisos.confirmar({ titulo, mensaje, confirmar: "Anular", peligro: true }))) return;

const Contexto = createContext(null);
const DURACION = { exito: 5000, info: 6000, error: 9000 };

const ESTILO = {
  exito: { caja: "border-green-200 bg-green-50 text-green-900", icono: "text-green-600", d: "M5 10.5l3.5 3.5L15 7" },
  info: { caja: "border-blue-200 bg-blue-50 text-blue-900", icono: "text-blue-600", d: "M10 9v5M10 6.5v.01" },
  error: { caja: "border-red-200 bg-red-50 text-red-900", icono: "text-red-600", d: "M10 6v5M10 14v.01" },
};

function Aviso({ aviso, onQuitar }) {
  const e = ESTILO[aviso.tipo];
  const [pausado, setPausado] = useState(false);
  useEffect(() => {
    if (pausado) return;
    const t = setTimeout(onQuitar, DURACION[aviso.tipo]);
    return () => clearTimeout(t);
  }, [pausado, aviso.tipo, onQuitar]);
  return (
    <div role={aviso.tipo === "error" ? "alert" : "status"} onMouseEnter={() => setPausado(true)} onMouseLeave={() => setPausado(false)}
      className={`pointer-events-auto flex items-start gap-2 w-full sm:w-96 rounded-lg border shadow-lg px-3 py-2.5 text-sm aviso-entra ${e.caja}`}>
      <svg viewBox="0 0 20 20" className={`h-5 w-5 shrink-0 ${e.icono}`} fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <circle cx="10" cy="10" r="8" /><path d={e.d} strokeLinecap="round" />
      </svg>
      <p className="flex-1">{aviso.texto}</p>
      <button type="button" onClick={onQuitar} className="opacity-60 hover:opacity-100" aria-label="Cerrar aviso">
        <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M5 5l10 10M15 5L5 15" /></svg>
      </button>
    </div>
  );
}

function Confirmacion({ datos, onResponder }) {
  const boton = useRef(null);
  useEffect(() => {
    boton.current?.focus();
    const tecla = (ev) => { if (ev.key === "Escape") { ev.stopImmediatePropagation(); onResponder(false); } };
    window.addEventListener("keydown", tecla, true);
    return () => window.removeEventListener("keydown", tecla, true);
  }, [onResponder]);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 print:hidden" role="alertdialog" aria-modal="true" aria-labelledby="confirmar-titulo">
      <div className="absolute inset-0 bg-slate-900/50" onClick={() => onResponder(false)} />
      <div className="relative w-full max-w-md rounded-xl bg-white shadow-2xl p-5">
        <div className="flex items-start gap-3">
          <span className={`mt-0.5 rounded-full p-2 ${datos.peligro ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"}`}>
            <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              {datos.peligro ? <path d="M10 3l8 14H2zM10 8v4M10 14.5v.01" strokeLinejoin="round" /> : <><circle cx="10" cy="10" r="8" /><path d="M10 9v5M10 6.5v.01" /></>}
            </svg>
          </span>
          <div className="flex-1">
            <h2 id="confirmar-titulo" className="text-base font-semibold text-slate-900">{datos.titulo}</h2>
            {/* mensaje: texto o lista de renglones (los vacíos se omiten) */}
            <div className="mt-1 space-y-1.5 text-sm text-slate-600">
              {[].concat(datos.mensaje ?? []).filter(Boolean).map((linea, i) => <p key={i}>{linea}</p>)}
            </div>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={() => onResponder(false)} className="px-4 py-1.5 rounded-lg border text-sm hover:bg-slate-50">
            {datos.cancelar || "Volver"}
          </button>
          <button type="button" ref={boton} onClick={() => onResponder(true)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium text-white ${datos.peligro ? "bg-red-700 hover:bg-red-800" : "bg-blue-700 hover:bg-blue-800"}`}>
            {datos.confirmar || "Confirmar"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function AvisosProvider({ children }) {
  const [avisos, setAvisos] = useState([]);
  const [pregunta, setPregunta] = useState(null);
  const siguiente = useRef(1);

  const quitar = useCallback((id) => setAvisos((l) => l.filter((a) => a.id !== id)), []);
  const agregar = useCallback((tipo, texto) => {
    if (!texto) return;
    const id = siguiente.current++;
    setAvisos((l) => [...l.slice(-3), { id, tipo, texto }]);
  }, []);
  const confirmar = useCallback((datos) => new Promise((resolver) => setPregunta({ ...datos, resolver })), []);
  const responder = useCallback((si) => {
    setPregunta((p) => { p?.resolver(si); return null; });
  }, []);

  const api = useMemo(() => ({
    exito: (t) => agregar("exito", t),
    info: (t) => agregar("info", t),
    error: (t) => agregar("error", t),
    confirmar,
  }), [agregar, confirmar]);

  return (
    <Contexto.Provider value={api}>
      {children}
      <div className="fixed bottom-4 right-4 left-4 sm:left-auto z-50 flex flex-col items-end gap-2 pointer-events-none print:hidden" aria-live="polite">
        {avisos.map((a) => <Aviso key={a.id} aviso={a} onQuitar={() => quitar(a.id)} />)}
      </div>
      {pregunta && <Confirmacion datos={pregunta} onResponder={responder} />}
    </Contexto.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAvisos() {
  return useContext(Contexto);
}
