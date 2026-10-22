import { useEffect, useRef } from "react";
import { useAuth } from "react-oidc-context";
import { LogoSalud } from "./Layout";

// Piezas para los documentos imprimibles (Imprimir / Guardar como PDF del navegador).
// El encabezado y el pie solo se ven al imprimir; el botón solo se ve en pantalla.

const ahora = () => new Date().toLocaleString("es-GT", { dateStyle: "long", timeStyle: "short" });

export function EncabezadoImpreso({ titulo, detalle, siempre = false }) {
  const auth = useAuth();
  const perfil = auth.user?.profile;
  return (
    <header className={`${siempre ? "flex" : "hidden print:flex"} items-start justify-between gap-6 border-b-2 border-blue-800 pb-3 mb-5`}>
      <div className="flex items-center gap-3">
        <LogoSalud className="h-10 w-10 text-blue-800" />
        <div>
          <p className="text-lg font-bold text-blue-900 leading-tight">Módulo de Salud</p>
          <p className="text-xs text-slate-600">Red Inteligente de Servicios Digitales</p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-base font-bold leading-tight">{titulo}</p>
        {detalle && <p className="text-xs text-slate-700">{detalle}</p>}
        <p className="text-[11px] text-slate-500 mt-1">
          Generado el {ahora()}{perfil ? ` por ${perfil.name || perfil.preferred_username}` : ""}
        </p>
      </div>
    </header>
  );
}

export function PieImpreso({ siempre = false }) {
  return (
    <footer className={`${siempre ? "block" : "hidden print:block"} mt-8 pt-2 border-t text-[10px] text-slate-500`}>
      Documento generado por el Módulo de Salud. Contiene datos personales y de salud: uso confidencial,
      solo para el paciente y el personal autorizado.
    </footer>
  );
}

export function BotonImprimir({ texto = "Imprimir / Guardar PDF" }) {
  return (
    <button type="button" onClick={() => window.print()}
      className="print:hidden inline-flex items-center gap-2 text-sm px-3 py-1.5 rounded border border-blue-700 text-blue-800 hover:bg-blue-50">
      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v7H6z" />
      </svg>
      {texto}
    </button>
  );
}

// Hoja de un documento formal (receta, estado de cuenta, constancia): se abre en la misma pestaña
// (la sesión del Login Único es por pestaña), se ve como papel en pantalla y abre la ventana de
// impresión al terminar de cargar. "Volver" regresa a la pantalla anterior.
export function HojaDocumento({ titulo, detalle, cargando, error, children }) {
  const yaImpreso = useRef(false);
  useEffect(() => {
    document.title = titulo ? `${titulo} · Módulo de Salud` : "Módulo de Salud";
    // Con ?vista en la dirección se muestra el documento sin abrir la ventana de impresión
    const soloVer = new URLSearchParams(window.location.search).has("vista");
    if (!cargando && !error && !yaImpreso.current && !soloVer) {
      yaImpreso.current = true;
      const t = setTimeout(() => window.print(), 500);
      return () => clearTimeout(t);
    }
  }, [cargando, error, titulo]);

  return (
    <div className="min-h-screen bg-slate-100 print:bg-white py-6 print:py-0 px-4 print:px-0">
      <div className="max-w-3xl mx-auto mb-3 flex justify-end gap-2 print:hidden">
        <BotonImprimir />
        <button type="button" onClick={() => (window.history.length > 1 ? window.history.back() : window.location.assign("/"))}
          className="text-sm px-3 py-1.5 rounded border hover:bg-white">← Volver</button>
      </div>
      {/* "papel": en modo oscuro la hoja sigue blanca, como se va a imprimir */}
      <article className="papel max-w-3xl mx-auto bg-white shadow print:shadow-none rounded-lg print:rounded-none p-10 print:p-0 text-sm text-slate-800">
        <EncabezadoImpreso titulo={titulo} detalle={detalle} siempre />
        {cargando && <p className="text-slate-500">Cargando el documento...</p>}
        {error && <p className="text-red-700">{error}</p>}
        {!cargando && !error && children}
        <PieImpreso siempre />
      </article>
    </div>
  );
}

// Fila "Etiqueta: valor" de los datos del documento
export function Dato({ etiqueta, children }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-wide text-slate-500">{etiqueta}</dt>
      <dd className="font-medium">{children ?? "—"}</dd>
    </div>
  );
}

export function LineaFirma({ texto }) {
  return (
    <div className="mt-14 w-64 border-t border-slate-500 pt-1 text-xs text-slate-600 text-center">{texto}</div>
  );
}
