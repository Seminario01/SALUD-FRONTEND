// Página a la que se vuelve después del Login Único. Se guarda en sessionStorage porque el
// login sale de la aplicación y regresa a la raíz (redirect_uri = origen del sitio).
const CLAVE = "salud.volver";

// Solo rutas internas ("/..."): nunca "//otro-sitio" ni direcciones completas
const esInterna = (ruta) => typeof ruta === "string" && /^\/(?![/\\])/.test(ruta) && !ruta.startsWith("/login");

export function recordarDestino(ruta) {
  try {
    if (esInterna(ruta)) sessionStorage.setItem(CLAVE, ruta);
    else sessionStorage.removeItem(CLAVE);
  } catch { /* sin almacenamiento: se vuelve al inicio */ }
}

export function tomarDestino() {
  try {
    const ruta = sessionStorage.getItem(CLAVE);
    sessionStorage.removeItem(CLAVE);
    return esInterna(ruta) ? ruta : null;
  } catch {
    return null;
  }
}
