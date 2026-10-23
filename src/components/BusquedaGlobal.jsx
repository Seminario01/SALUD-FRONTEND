import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import client, { mensajeError } from "../api/client";
import BuscadorPaciente from "./BuscadorPaciente";

// Botón del encabezado que abre la búsqueda (puede haber varios: escritorio y celular)
export function BotonBuscar({ compacto = false, onClick }) {
  return (
    <button type="button" onClick={onClick} aria-label="Buscar paciente por nombre o DPI"
      className={`flex items-center gap-2 rounded-lg border border-white/25 bg-white/10 hover:bg-white/20 text-sm text-blue-50 transition ${compacto ? "px-2 py-1.5" : "px-3 py-1.5 w-full"}`}>
      <svg viewBox="0 0 20 20" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <circle cx="9" cy="9" r="6" /><path d="M14 14l4 4" strokeLinecap="round" />
      </svg>
      {!compacto && <span className="flex-1 text-left">Buscar paciente…</span>}
      {!compacto && <kbd className="text-[10px] border border-white/30 rounded px-1">Ctrl K</kbd>}
    </button>
  );
}

// Búsqueda de pacientes desde el encabezado (o con Ctrl + K): se escribe el nombre o el DPI
// y lleva directo a la ficha del paciente. La lista se pide al abrir, no en cada pantalla.
// Se monta una sola vez (en Layout); los botones solo la abren.
export default function BusquedaGlobal({ abierto, setAbierto }) {
  const [pacientes, setPacientes] = useState(null);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const tecla = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setAbierto(true); }
    };
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [setAbierto]);

  useEffect(() => {
    if (!abierto) return;
    const tecla = (e) => { if (e.key === "Escape") setAbierto(false); };
    window.addEventListener("keydown", tecla);
    client.get("/pacientes")
      .then((r) => { setPacientes(r.data.data); setError(null); })
      .catch((err) => setError(mensajeError(err)));
    return () => window.removeEventListener("keydown", tecla);
  }, [abierto, setAbierto]);

  function ir(id) {
    if (!id) return;
    setAbierto(false);
    navigate(`/pacientes/${id}`);
  }

  return (
    <>
      {abierto && (
        <div className="fixed inset-0 z-40 flex items-start justify-center p-4 pt-[12vh] print:hidden" role="dialog" aria-modal="true" aria-label="Buscar paciente">
          <div className="absolute inset-0 bg-slate-900/50" onClick={() => setAbierto(false)} />
          <div className="relative w-full max-w-xl rounded-xl bg-white text-slate-800 shadow-2xl p-4">
            <p className="text-sm font-semibold mb-2">Buscar paciente</p>
            {error ? <p className="text-sm text-red-600">{error}</p> : !pacientes ? <p className="text-sm text-slate-500">Cargando pacientes...</p> : (
              <BuscadorPaciente pacientes={pacientes} valor="" onCambio={ir} autoFocus
                placeholder="Nombre o DPI del paciente" etiquetaAria="Buscar paciente" />
            )}
          </div>
        </div>
      )}
    </>
  );
}
