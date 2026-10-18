import { useState } from "react";
import client, { mensajeError } from "../api/client";
import useRoles from "../hooks/useRoles";
import { useAvisos } from "./Avisos";

// Alergias del paciente (ficha). Rojo si tiene; Médico, Enfermería y Recepción las editan.
// Se revisan al recetar: si un medicamento choca, el sistema avisa al médico.
export default function AlergiasPaciente({ paciente, onGuardado }) {
  const { puede } = useRoles();
  const avisos = useAvisos();
  const [editando, setEditando] = useState(false);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);
  const tiene = Boolean(paciente.alergias);

  function abrir() {
    setTexto(paciente.alergias || "");
    setError(null);
    setEditando(true);
  }

  function guardar(e) {
    e.preventDefault();
    setEnviando(true);
    setError(null);
    client
      .put(`/pacientes/${paciente.id}/alergias`, { alergias: texto })
      .then(() => { setEditando(false); avisos.exito(texto.trim() ? "Alergias guardadas." : "Se quitaron las alergias."); onGuardado(); })
      .catch((err) => setError(mensajeError(err)))
      .finally(() => setEnviando(false));
  }

  return (
    <div role={tiene ? "alert" : undefined}
      className={`rounded-lg border px-4 py-2.5 text-sm ${tiene ? "bg-red-50 border-red-200 text-red-900" : "bg-slate-50 border-slate-200 text-slate-600"}`}>
      {!editando ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p>
            <span className="font-semibold">{tiene ? "⚠ Alergias: " : "Alergias: "}</span>
            {tiene ? paciente.alergias : "sin alergias registradas"}
          </p>
          {puede("pacientes.alergias") && (
            <button onClick={abrir} className="text-xs px-2.5 py-1 rounded border bg-white hover:bg-slate-50 text-slate-700 print:hidden">
              {tiene ? "Cambiar" : "Registrar alergias"}
            </button>
          )}
        </div>
      ) : (
        <form onSubmit={guardar} className="flex flex-wrap items-center gap-2">
          <label className="font-semibold" htmlFor="alergias">Alergias</label>
          <input id="alergias" value={texto} onChange={(e) => setTexto(e.target.value)} maxLength={500} autoFocus
            placeholder="Ej.: Penicilina, AINE, látex (vacío = sin alergias)" className="border rounded px-2 py-1 flex-1 min-w-56 bg-white text-slate-800" />
          <button type="submit" disabled={enviando} className="text-xs px-3 py-1.5 rounded bg-blue-700 text-white hover:bg-blue-800 disabled:opacity-50">
            {enviando ? "Guardando..." : "Guardar"}
          </button>
          <button type="button" onClick={() => setEditando(false)} className="text-xs px-3 py-1.5 rounded border bg-white hover:bg-slate-50 text-slate-700">Cancelar</button>
          {error && <span className="text-xs text-red-700 w-full">{error}</span>}
          <span className="text-xs text-slate-500 w-full">Separe con comas. Al recetar, el sistema avisa si un medicamento choca con estas alergias (también por familia: penicilinas, sulfas, AINE...).</span>
        </form>
      )}
    </div>
  );
}
