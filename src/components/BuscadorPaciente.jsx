import { useEffect, useId, useMemo, useRef, useState } from "react";

// Buscador de paciente por nombre o DPI (CUI) para los formularios.
// Recibe la misma lista que usaba el <select> (usePacientesSeleccionables) y filtra en el
// navegador: sin acentos ni mayúsculas en el nombre, y por dígitos en el CUI.
// onCambio recibe el id como texto ("" al quitar la selección), igual que e.target.value.

const sinAcentos = (t) => String(t ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

function edad(nacimiento) {
  if (!nacimiento || nacimiento === "None") return null;
  const n = new Date(`${nacimiento}T12:00:00`);
  const hoy = new Date();
  let anios = hoy.getFullYear() - n.getFullYear();
  if (hoy < new Date(hoy.getFullYear(), n.getMonth(), n.getDate())) anios -= 1;
  return anios >= 0 ? anios : null;
}

export default function BuscadorPaciente({
  pacientes, valor, onCambio, requerido = false, deshabilitado = false,
  placeholder = "Escriba el nombre o el DPI", etiquetaAria = "Paciente", className = "", autoFocus = false,
}) {
  const [texto, setTexto] = useState("");
  const [abierto, setAbierto] = useState(false);
  const [activo, setActivo] = useState(0);
  const entrada = useRef(null);
  const lista = useId();
  const elegido = useMemo(() => pacientes.find((p) => String(p.id) === String(valor)), [pacientes, valor]);

  const resultados = useMemo(() => {
    const t = texto.trim();
    if (!t) return pacientes.slice(0, 8);
    const digitos = t.replace(/\D/g, "");
    const palabras = sinAcentos(t).split(/\s+/).filter(Boolean);
    return pacientes.filter((p) => {
      if (digitos.length >= 3 && String(p.cui ?? "").includes(digitos)) return true;
      const nombre = sinAcentos(p.nombre_completo);
      return palabras.every((w) => nombre.includes(w));
    }).slice(0, 8);
  }, [pacientes, texto]);

  // Si el texto escrito no termina en una selección, el formulario no se puede enviar
  useEffect(() => {
    if (!entrada.current) return;
    entrada.current.setCustomValidity(requerido && !elegido && texto.trim() ? "Elija un paciente de la lista" : "");
  }, [requerido, elegido, texto]);

  function elegir(p) {
    onCambio(String(p.id));
    setTexto("");
    setAbierto(false);
  }

  function quitar() {
    onCambio("");
    setTexto("");
    setAbierto(true);
    setTimeout(() => entrada.current?.focus(), 0);
  }

  function teclado(e) {
    if (e.key === "ArrowDown") { e.preventDefault(); setAbierto(true); setActivo((i) => Math.min(i + 1, resultados.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActivo((i) => Math.max(i - 1, 0)); }
    else if (e.key === "Enter" && abierto && resultados[activo]) { e.preventDefault(); elegir(resultados[activo]); }
    else if (e.key === "Escape") setAbierto(false);
  }

  if (elegido) {
    const anios = edad(elegido.fecha_nacimiento);
    return (
      <div className={`flex items-center gap-2 border rounded px-3 py-1.5 bg-blue-50 border-blue-200 ${className}`}>
        <span className="flex-1 min-w-0 leading-tight" aria-label={`${etiquetaAria} elegido`}>
          <span className="block font-medium truncate">{elegido.nombre_completo}</span>
          <span className="block text-slate-600 text-xs">
            {elegido.cui ? `DPI ${elegido.cui}` : "Sin DPI"}{anios !== null ? ` · ${anios} años` : ""}
          </span>
        </span>
        {!deshabilitado && pacientes.length > 1 && (
          <button type="button" onClick={quitar} className="text-xs text-blue-800 hover:underline shrink-0">Cambiar</button>
        )}
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <input
        ref={entrada}
        value={texto}
        onChange={(e) => { setTexto(e.target.value); setAbierto(true); setActivo(0); }}
        onFocus={() => setAbierto(true)}
        onBlur={() => setTimeout(() => setAbierto(false), 150)}
        onKeyDown={teclado}
        required={requerido}
        disabled={deshabilitado}
        autoFocus={autoFocus}
        placeholder={placeholder}
        aria-label={etiquetaAria}
        role="combobox"
        aria-expanded={abierto}
        aria-controls={lista}
        aria-autocomplete="list"
        autoComplete="off"
        className="border rounded px-3 py-1.5 w-full"
      />
      {abierto && !deshabilitado && (
        <ul id={lista} role="listbox" className="absolute z-20 mt-1 w-full max-h-72 overflow-auto bg-white border rounded shadow-lg text-sm">
          {resultados.length === 0 && <li className="px-3 py-2 text-slate-500">Ningún paciente coincide con «{texto}».</li>}
          {resultados.map((p, i) => {
            const anios = edad(p.fecha_nacimiento);
            return (
              <li key={p.id} role="option" aria-selected={i === activo}
                onMouseDown={(e) => { e.preventDefault(); elegir(p); }}
                onMouseEnter={() => setActivo(i)}
                className={`px-3 py-1.5 cursor-pointer ${i === activo ? "bg-blue-50" : ""}`}>
                <div className="font-medium">{p.nombre_completo}</div>
                <div className="text-xs text-slate-600">
                  {p.cui ? `DPI ${p.cui}` : "Sin DPI"}{anios !== null ? ` · ${anios} años` : ""} · No. {p.id}
                </div>
              </li>
            );
          })}
          {!texto.trim() && pacientes.length > 8 && (
            <li className="px-3 py-1.5 text-xs text-slate-500 border-t">Escriba para buscar entre {pacientes.length} pacientes.</li>
          )}
        </ul>
      )}
    </div>
  );
}
