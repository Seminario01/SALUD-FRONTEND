import { useEffect } from "react";
import { Link } from "react-router-dom";
import { edadDe } from "../utils/filtros";
import { formatoDia } from "../utils/fechas";

const GENERO = { M: "Masculino", F: "Femenino" };

function Dato({ etiqueta, children }) {
  return (
    <div>
      <dt className="text-xs text-slate-500">{etiqueta}</dt>
      <dd className="text-sm text-slate-800">{children || <span className="text-slate-400">—</span>}</dd>
    </div>
  );
}

// Panel lateral con los datos de una persona de la lista (sin salir de la pantalla).
// `children` agrega lo propio de cada pantalla (por ejemplo, su vacunación) y `acciones` sus botones.
export default function PanelPaciente({ paciente, titulo, onCerrar, verFicha = true, acciones, children }) {
  useEffect(() => {
    const tecla = (e) => { if (e.key === "Escape") onCerrar(); };
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [onCerrar]);

  if (!paciente) return null;
  const anios = edadDe(paciente.fecha_nacimiento);
  const residencia = [paciente.zona, paciente.municipio_nombre, paciente.departamento_nombre].filter(Boolean).join(", ");
  return (
    <div className="fixed inset-0 z-30 flex justify-end print:hidden" role="dialog" aria-modal="true" aria-label={`Detalle de ${paciente.nombre_completo}`}>
      <div className="absolute inset-0 bg-slate-900/40" onClick={onCerrar} />
      <aside className="relative h-full w-full max-w-md bg-white shadow-xl overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-5 py-3 flex items-start justify-between gap-3 z-10">
          <div className="min-w-0">
            {titulo && <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{titulo}</p>}
            <h2 className="text-lg font-bold text-slate-800">{paciente.nombre_completo}</h2>
            <p className="text-sm text-slate-500">
              {paciente.cui ? `DPI ${paciente.cui}` : "Sin DPI"}{anios !== null ? ` · ${anios} años` : ""}
            </p>
          </div>
          <button onClick={onCerrar} className="rounded p-1.5 hover:bg-slate-100" aria-label="Cerrar" autoFocus>
            <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M5 5l10 10M15 5L5 15" /></svg>
          </button>
        </div>

        <div className="p-5 space-y-5">
          {paciente.alergias && (
            <p className="text-sm rounded-lg bg-red-50 text-red-800 border border-red-200 px-3 py-2">⚠ Alergias: {paciente.alergias}</p>
          )}
          <dl className="grid grid-cols-2 gap-3">
            <Dato etiqueta="Fecha de nacimiento">{paciente.fecha_nacimiento ? formatoDia(paciente.fecha_nacimiento) : null}</Dato>
            <Dato etiqueta="Género">{GENERO[paciente.genero] ?? paciente.genero}</Dato>
            <Dato etiqueta="Teléfono">{paciente.telefono}</Dato>
            <Dato etiqueta="Seguro">{paciente.tipo_seguro}</Dato>
            <div className="col-span-2"><Dato etiqueta="Cuidador / responsable">{paciente.cuidador}</Dato></div>
            <div className="col-span-2"><Dato etiqueta="Residencia">{residencia}</Dato></div>
          </dl>

          {children}

          <div className="flex flex-wrap gap-2 pt-1">
            {acciones}
            {verFicha && (
              <Link to={`/pacientes/${paciente.id}`} className="text-sm px-3 py-1.5 rounded border border-blue-700 text-blue-800 hover:bg-blue-50">
                Ver ficha completa →
              </Link>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}
