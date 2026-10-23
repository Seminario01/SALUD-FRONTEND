import useSede from "../hooks/useSede";
import { elegirSede } from "../utils/sede";

// Sede con la que se trabaja: en el menú del usuario (y en el de celular). Jefatura y Administración
// pueden elegir otra sede o todas; el resto solo la ve.
export function SelectorSede({ claro = false }) {
  const sede = useSede();
  if (!sede || sede.sedes.length === 0) return null;
  const valor = sede.actual === null ? "todas" : String(sede.actual);
  const texto = claro ? "text-blue-100" : "text-slate-500";
  if (!sede.puede_cambiar) {
    return <p className={`text-xs ${texto}`}>{sede.nombre}</p>;
  }
  return (
    <label className={`block text-xs ${texto}`}>
      Sede
      <select
        value={valor}
        onChange={(e) => elegirSede(e.target.value === String(sede.mi_sede) ? "" : e.target.value)}
        className="mt-1 w-full border rounded px-2 py-1 text-sm text-slate-700 bg-white"
      >
        {sede.sedes.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
        <option value="todas">Todas las sedes</option>
      </select>
    </label>
  );
}

// Franja bajo el encabezado cuando Jefatura o Administración ven otra sede (o todas)
export function AvisoOtraSede() {
  const sede = useSede();
  if (!sede || sede.propia) return null;
  return (
    <div className="bg-amber-50 border-b border-amber-200 text-amber-900 text-sm px-4 py-1.5 flex flex-wrap items-center justify-center gap-x-3 print:hidden">
      <span>Viendo: <b>{sede.nombre}</b></span>
      <button onClick={() => elegirSede("")} className="text-blue-700 hover:underline">Volver a mi sede</button>
    </div>
  );
}
