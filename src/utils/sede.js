// Sede elegida en esta pestaña (Jefatura y Administración pueden ver otra sede o "todas").
// Va en cada petición como X-Sede (api/client.js); el servidor decide si la acepta: para el resto
// del personal manda siempre su propia sede. Vacío = la sede propia.
const CLAVE = "salud-sede";

export function sedeElegida() {
  try {
    return sessionStorage.getItem(CLAVE) || "";
  } catch {
    return "";
  }
}

// Cambia la sede y recarga la pantalla para que todo se vuelva a pedir con la nueva
export function elegirSede(valor) {
  try {
    if (valor) sessionStorage.setItem(CLAVE, String(valor));
    else sessionStorage.removeItem(CLAVE);
  } catch { /* sin almacenamiento: se queda la sede propia */ }
  window.location.reload();
}
