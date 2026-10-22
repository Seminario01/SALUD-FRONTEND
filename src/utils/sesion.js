// Tiempos del cierre de sesión por inactividad (components/AvisoSesion.jsx)
export const MINUTOS_SIN_USO = 15;      // sin tocar nada -> aparece el aviso
export const SEGUNDOS_AVISO = 120;      // cuenta regresiva del aviso antes de cerrar
export const CLAVE_USO = "salud.ultimo-uso";

// Por qué se cerró la sesión, para explicarlo en la pantalla de inicio de sesión
const CLAVE_SALIDA = "salud.salida";

export function anotarSalida(motivo) {
  try { sessionStorage.setItem(CLAVE_SALIDA, motivo); } catch { /* sin almacenamiento */ }
}

// Se lee sin borrar (la pantalla de login puede dibujarse más de una vez) y se borra al volver a entrar
export function leerSalida() {
  try { return sessionStorage.getItem(CLAVE_SALIDA); } catch { return null; }
}

export function olvidarSalida() {
  try { sessionStorage.removeItem(CLAVE_SALIDA); } catch { /* sin almacenamiento */ }
}
