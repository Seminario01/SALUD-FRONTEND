import client from "../api/client";

// Red de establecimientos y referencias (backend: routes/red.py). Textos para mostrar.
export const ATENCION = { EMERGENCIA: "Emergencia", CONSULTA_GENERAL: "Consulta general", ESPECIALIDAD: "Especialidades", VACUNACION: "Vacunación" };
export const ESTADO_SERVICIO = { ACTIVO: "Activo", INACTIVO: "Inactivo", EN_MANTENIMIENTO: "En mantenimiento" };
export const ESTADO_REFERENCIA = {
  ENVIADA: { texto: "Enviada", clase: "bg-amber-100 text-amber-800" },
  RECIBIDA: { texto: "Recibida", clase: "bg-emerald-100 text-emerald-800" },
  CANCELADA: { texto: "Cancelada", clase: "bg-slate-100 text-slate-600" },
};
export const PRIORIDAD = {
  URGENTE: { texto: "Urgente", clase: "bg-red-100 text-red-800" },
  NORMAL: { texto: "Normal", clase: "bg-slate-100 text-slate-700" },
};

// La red se pide una vez por sesión (son unos 50 establecimientos); recargarRed() la vuelve a pedir.
let red = null;
export function cargarRed() {
  red ??= client.get("/establecimientos").then((r) => r.data.data).catch((e) => { red = null; throw e; });
  return red;
}
export function recargarRed() {
  red = null;
  return cargarRed();
}
