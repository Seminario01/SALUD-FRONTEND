// Piezas comunes de las barras de filtros de las listas.

export const campoFiltro = "border rounded px-2 py-1.5 block";

// Edad "de" ... "a" años (los dos son opcionales).
export function RangoEdad({ desde, hasta, onCambio }) {
  const numero = (v) => v.replace(/\D/g, "").slice(0, 3);
  return (
    <div className="text-sm" role="group" aria-label="Edad (años)">
      <span className="block text-slate-600 dark:text-slate-400">Edad (años)</span>
      <div className="flex items-center gap-1">
        <input inputMode="numeric" value={desde} onChange={(e) => onCambio({ desde: numero(e.target.value), hasta })}
          placeholder="de" aria-label="Edad desde" className={`${campoFiltro} w-16`} />
        <span className="text-slate-400">–</span>
        <input inputMode="numeric" value={hasta} onChange={(e) => onCambio({ desde, hasta: numero(e.target.value) })}
          placeholder="a" aria-label="Edad hasta" className={`${campoFiltro} w-16`} />
      </div>
    </div>
  );
}

// Lista de opciones con "Todos" al inicio. opciones: [[valor, texto], ...]
export function SelectFiltro({ etiqueta, valor, onCambio, opciones, todos = "Todos" }) {
  return (
    <label className="text-sm">
      {etiqueta}
      <select value={valor} onChange={(e) => onCambio(e.target.value)} className={campoFiltro}>
        <option value="">{todos}</option>
        {opciones.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
      </select>
    </label>
  );
}

export function QuitarFiltros({ visible, onQuitar }) {
  if (!visible) return null;
  return (
    <button type="button" onClick={onQuitar} className="text-sm px-3 py-1.5 rounded border hover:bg-gray-100">
      Quitar filtros
    </button>
  );
}
