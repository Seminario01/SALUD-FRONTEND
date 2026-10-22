// Pone el modo claro u oscuro ANTES de dibujar la página, para que no parpadee en blanco.
// La preferencia la guarda el botón del encabezado (src/utils/tema.js); si nunca se eligió,
// se usa la del sistema (Windows, Android, iPhone).
(function () {
  var guardado = null;
  try { guardado = localStorage.getItem("salud-tema"); } catch (e) { /* navegador sin almacenamiento */ }
  var oscuro = guardado ? guardado === "oscuro" : window.matchMedia("(prefers-color-scheme: dark)").matches;
  document.documentElement.classList.toggle("dark", oscuro);
})();
