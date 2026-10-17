import { descargarCSV, descargarExcel } from "../utils/exportar";

// Botones "Excel" y "CSV" para bajar la lista que se ve en pantalla (con los filtros aplicados).
export default function BotonesExportar({ nombre, titulo, columnas, filas, className = "" }) {
  const vacio = !filas?.length;
  const boton = "inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded border border-emerald-700 text-emerald-800 hover:bg-emerald-50 disabled:opacity-40 disabled:hover:bg-transparent";
  return (
    <div className={`inline-flex items-center gap-1.5 print:hidden ${className}`}>
      <button type="button" disabled={vacio} onClick={() => descargarExcel(nombre, titulo, columnas, filas)} className={boton}
        title={vacio ? "No hay datos para exportar" : `Descargar ${filas.length} registro(s) en Excel`}>
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" /><path d="M14 3v6h6M9 13l4 5M13 13l-4 5" />
        </svg>
        Excel
      </button>
      <button type="button" disabled={vacio} onClick={() => descargarCSV(nombre, columnas, filas)}
        className="text-xs px-2 py-1.5 rounded border text-slate-600 hover:bg-slate-50 disabled:opacity-40"
        title={vacio ? "No hay datos para exportar" : "Descargar como CSV (texto separado por ;)"}>
        CSV
      </button>
    </div>
  );
}
