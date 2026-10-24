import { useCallback, useState } from "react";
import { createPortal } from "react-dom";
import PanelPaciente from "./PanelPaciente";

// Nombre de una persona en una lista: al hacer clic abre su panel de detalle (sin salir de la
// pantalla), con "Ver ficha completa". Es la forma única de abrir a una persona desde las listas.
// Con `paciente` usa los datos que ya tiene la lista; con `id` los pide al abrir.
export default function NombrePaciente({ id, nombre, paciente, dpi, titulo, className = "" }) {
  const [abierto, setAbierto] = useState(false);
  const cerrar = useCallback(() => setAbierto(false), []);
  const texto = nombre ?? paciente?.nombre_completo ?? `Paciente ${id}`;
  return (
    <>
      <button type="button" onClick={() => setAbierto(true)} title="Ver el detalle de la persona"
        className={`font-medium text-blue-700 hover:underline text-left ${className}`}>
        {texto}
      </button>
      {dpi && <span className="block text-xs text-slate-500">DPI {dpi}</span>}
      {/* Fuera de la tabla (portal) y sin que los clics lleguen a la fila (que abre otro detalle) */}
      {abierto && createPortal(
        <div onClick={(e) => e.stopPropagation()}>
          <PanelPaciente paciente={paciente} pacienteId={id ?? paciente?.id} nombre={texto} titulo={titulo} onCerrar={cerrar} />
        </div>,
        document.body,
      )}
    </>
  );
}
