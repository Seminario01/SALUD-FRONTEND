// Modo claro / oscuro. public/tema.js lo aplica al abrir la página; aquí se cambia desde el botón.
// Si el usuario nunca eligió, se sigue al sistema (y cambia solo si el sistema cambia).
const CLAVE = "salud-tema";
const COLOR_BARRA = { claro: "#1e40af", oscuro: "#0f172a" };
const sistema = window.matchMedia("(prefers-color-scheme: dark)");

function guardado() {
  try { return localStorage.getItem(CLAVE); } catch { return null; }
}

export const esOscuro = () => document.documentElement.classList.contains("dark");

function aplicar(oscuro) {
  document.documentElement.classList.toggle("dark", oscuro);
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", oscuro ? COLOR_BARRA.oscuro : COLOR_BARRA.claro);
  window.dispatchEvent(new Event("salud-tema"));
}

export function cambiarTema(oscuro) {
  try { localStorage.setItem(CLAVE, oscuro ? "oscuro" : "claro"); } catch { /* sin almacenamiento: vale solo esta vez */ }
  aplicar(oscuro);
}

// Para useSyncExternalStore: avisa cuando cambia el modo (botón u otro cambio del sistema)
export function suscribirTema(aviso) {
  const delSistema = () => !guardado() && aplicar(sistema.matches);
  sistema.addEventListener("change", delSistema);
  window.addEventListener("salud-tema", aviso);
  return () => {
    sistema.removeEventListener("change", delSistema);
    window.removeEventListener("salud-tema", aviso);
  };
}

aplicar(esOscuro());
