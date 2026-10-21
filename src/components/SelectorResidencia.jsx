import { useState } from "react";
import useUbicaciones from "../hooks/useUbicaciones";

// Residencia del paciente: departamento -> municipio (códigos del INE) y zona/aldea.
// Si el DPI está escrito, sugiere el municipio de inscripción (últimos 4 dígitos), que es donde
// se registró al nacer: puede ser distinto de donde vive, por eso solo se sugiere.

export default function SelectorResidencia({ municipio, zona, cui, onCambio, campo = "border rounded px-3 py-1.5 w-full" }) {
  const ub = useUbicaciones();
  const [depto, setDepto] = useState(municipio ? municipio.slice(0, 2) : "");
  const deptoActual = municipio ? municipio.slice(0, 2) : depto;
  const municipios = ub ? ub.municipios.filter((m) => m.departamento === deptoActual) : [];
  const digitos = String(cui || "").replace(/\D/g, "");
  const sugerido = ub && digitos.length === 13 ? ub.municipios.find((m) => m.codigo === digitos.slice(-4)) : null;
  const nombreDepto = (c) => ub?.departamentos.find((d) => d.codigo === c)?.nombre;

  if (ub === false) return <p className="text-sm text-amber-700 md:col-span-3">No se pudo cargar la lista de municipios.</p>;
  return (
    <>
      <label className="text-sm">Departamento de residencia
        <select value={deptoActual} disabled={!ub} onChange={(e) => { setDepto(e.target.value); onCambio({ municipio: "" }); }} className={campo}>
          <option value="">—</option>
          {ub?.departamentos.map((d) => <option key={d.codigo} value={d.codigo}>{d.nombre}</option>)}
        </select>
      </label>
      <label className="text-sm">Municipio
        <select value={municipio || ""} disabled={!deptoActual} onChange={(e) => onCambio({ municipio: e.target.value })} className={campo}>
          <option value="">{deptoActual ? "Elija el municipio" : "Elija primero el departamento"}</option>
          {municipios.map((m) => <option key={m.codigo} value={m.codigo}>{m.nombre}</option>)}
        </select>
      </label>
      <label className="text-sm">Zona, colonia o aldea
        <input value={zona || ""} onChange={(e) => onCambio({ zona: e.target.value })} maxLength={120}
          placeholder="Ej.: Zona 4, colonia El Paraíso" className={campo} />
      </label>
      {sugerido && sugerido.codigo !== municipio && (
        <p className="text-xs text-slate-600 md:col-span-3 -mt-1">
          Según el DPI se inscribió en <span className="font-medium">{sugerido.nombre}, {nombreDepto(sugerido.departamento)}</span>.{" "}
          <button type="button" onClick={() => { setDepto(sugerido.departamento); onCambio({ municipio: sugerido.codigo }); }}
            className="text-blue-700 hover:underline">¿Vive ahí? Usar este municipio</button>
        </p>
      )}
    </>
  );
}
