#!/bin/sh
# Se ejecuta automáticamente al arrancar el contenedor nginx (docker-entrypoint.d).
# Genera /config.js con la URL del Login Único a partir de variables de entorno,
# para no tener que recompilar el frontend cuando cambia la URL del día.
set -eu

DESTINO=/usr/share/nginx/html/config.js
AUTH_URL="${AUTH_URL:-}"
CLIENT_ID="${CLIENT_ID:-salud-web}"

if [ -z "$AUTH_URL" ]; then
  echo "[config-runtime] AVISO: AUTH_URL vacío; el login no va a funcionar." >&2
fi

# Escapa comillas y barras invertidas para que el valor sea un string JS válido
esc() { printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g'; }

cat > "$DESTINO" <<JS
// Generado al arrancar el contenedor. No editar a mano.
window.__SALUD_CONFIG__ = {
  AUTH_URL: "$(esc "$AUTH_URL")",
  CLIENT_ID: "$(esc "$CLIENT_ID")"
};
JS

echo "[config-runtime] Login Único: $AUTH_URL (client $CLIENT_ID)"
