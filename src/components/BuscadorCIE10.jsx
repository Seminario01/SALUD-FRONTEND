import { useEffect, useId, useState } from "react";
import client from "../api/client";

// Buscador del catálogo CIE-10 (GET /cie10?q=): por código ("J0", "I10") o por palabras
// ("hiper arter", "gripe"). Al elegir, devuelve { codigo, descripcion }; el diagnóstico escrito
// por el médico sigue siendo libre (el código solo lo clasifica para los reportes).
export default function BuscadorCIE10({ valor, onElegir }) {
  const [texto, setTexto] = useState("");
  const [opciones, setOpciones] = useState([]);
  const [abierto, setAbierto] = useState(false);
  const [activa, setActiva] = useState(0);
  const lista = useId();

  useEffect(() => {
    const q = texto.trim();
    if (q.length < 2) return undefined;
    const t = setTimeout(() => {
      client.get("/cie10", { params: { q, limite: 10 } })
        .then((r) => { setOpciones(r.data.data); setActiva(0); setAbierto(true); })
        .catch(() => setOpciones([]));
    }, 250);
    return () => clearTimeout(t);
  }, [texto]);

  function elegir(o) {
    onElegir(o);
    setTexto("");
    setOpciones([]);
    setAbierto(false);
  }

  function tecla(e) {
    if (!abierto || !opciones.length) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setActiva((i) => Math.min(i + 1, opciones.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActiva((i) => Math.max(i - 1, 0)); }
    else if (e.key === "Enter") { e.preventDefault(); elegir(opciones[activa]); }
    else if (e.key === "Escape") setAbierto(false);
  }

  if (valor) {
    return (
      <div className="flex items-center gap-2 rounded border bg-blue-50 border-blue-200 px-3 py-1.5">
        <span className="font-mono text-sm font-semibold text-blue-900">{valor.codigo}</span>
        <span className="text-sm text-slate-700 flex-1">{valor.descripcion}</span>
        <button type="button" onClick={() => onElegir(null)} className="text-xs text-blue-700 hover:underline">Cambiar</button>
      </div>
    );
  }
  return (
    <div className="relative">
      <input
        role="combobox" aria-expanded={abierto} aria-controls={lista} aria-autocomplete="list" aria-label="Código CIE-10"
        aria-activedescendant={abierto && opciones[activa] ? `${lista}-${activa}` : undefined}
        value={texto} onChange={(e) => { setTexto(e.target.value); if (e.target.value.trim().length < 2) { setOpciones([]); setAbierto(false); } }}
        onKeyDown={tecla} onBlur={() => setTimeout(() => setAbierto(false), 150)} onFocus={() => opciones.length && setAbierto(true)}
        placeholder="Buscar por código o nombre: I10, gripe, hiper arter..." maxLength={60}
        className="border rounded px-3 py-1.5 w-full"
      />
      {abierto && (
        <ul id={lista} role="listbox" className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-lg border bg-white shadow-lg text-sm">
          {opciones.length === 0 && <li className="px-3 py-2 text-slate-500">Sin resultados. Escriba otra palabra o el código.</li>}
          {opciones.map((o, i) => (
            <li key={o.codigo} id={`${lista}-${i}`} role="option" aria-selected={i === activa}
              onMouseDown={(e) => { e.preventDefault(); elegir(o); }} onMouseEnter={() => setActiva(i)}
              className={`px-3 py-2 cursor-pointer flex gap-2 ${i === activa ? "bg-blue-50" : ""}`}>
              <span className="font-mono font-semibold text-blue-900 w-14 shrink-0">{o.codigo}</span>
              <span className="flex-1">{o.descripcion}<span className="block text-xs text-slate-400">{o.capitulo}</span></span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
