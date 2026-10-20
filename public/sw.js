// Service worker del Módulo Salud: solo hace que la app se pueda instalar y muestra una página
// "Sin conexión" si se cae el internet. NO guarda datos de pacientes ni respuestas de la API:
// las páginas y la API siempre van a la red (así nunca se ve información vieja o ajena).
const CACHE = "salud-sin-conexion-v1";
const SIN_CONEXION = "/sin-conexion.html";

self.addEventListener("install", (evento) => {
  evento.waitUntil(caches.open(CACHE).then((c) => c.addAll([SIN_CONEXION, "/icono-192.png"])));
  self.skipWaiting();
});

self.addEventListener("activate", (evento) => {
  evento.waitUntil(caches.keys().then((claves) => Promise.all(claves.filter((k) => k !== CACHE).map((k) => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener("fetch", (evento) => {
  if (evento.request.mode !== "navigate") return;      // archivos y API: directo a la red
  evento.respondWith(fetch(evento.request).catch(() => caches.match(SIN_CONEXION)));
});
