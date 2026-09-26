// Configuración en tiempo de ejecución.
// En desarrollo (npm run dev) queda vacía y se usan las variables VITE_* del .env.local.
// En el contenedor de producción, este archivo se REGENERA al arrancar a partir de
// las variables de entorno AUTH_URL y CLIENT_ID (ver docker/40-config-runtime.sh),
// así que cambiar la URL del día del Login Único no requiere recompilar el frontend.
window.__SALUD_CONFIG__ = {};
