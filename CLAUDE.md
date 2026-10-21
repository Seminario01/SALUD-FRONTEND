# Contexto del proyecto para Claude Code — SALUD-FRONTEND

Soy Antonio (Denilson), estudiante. Trabajo en el **Módulo Salud** del proyecto
"Red Inteligente de Servicios Digitales" (organización de GitHub `Seminario01`).

- **SALUD-FRONTEND** (este repo): React 19 + Vite + Tailwind v4.
- **SALUD-BACKEND** (repo hermano, en la carpeta de al lado): Flask + SQLAlchemy + PyMySQL + gunicorn.
- Login Único: Keycloak, realm `rsd`.

## Metodología de trabajo

1. Los cambios se hacen en local (en la PC de Antonio).
2. Se suben a GitHub, a la rama `denilson-dev`.
3. Antonio entra al servidor por SSH y ahí hace `git pull` de esa rama.
4. Se vuelve a levantar con docker compose en `~/proyecto-salud/SALUD-BACKEND/deploy`
   (ese compose también construye este frontend).

Nunca se edita código directamente en el servidor; todo pasa por git.

## Reglas

- Trabajar siempre en la rama `denilson-dev`. Nunca en `main`.
- No unir (merge) nada de las ramas de los compañeros (`jeffry-dev`, `amilcar-dev`, `sandy-dev`) ni de
  `main` hasta nuevo aviso de Antonio: se trabaja solo en `denilson-dev`.
- Explicar en español, paso a paso y simple.
- Al dar comandos, decir siempre dónde van: en la PC o en el servidor (por SSH).
  Cada comando debe empezar con `cd` a su carpeta, por ejemplo:
  `cd ~/proyecto-salud/SALUD-BACKEND/deploy && docker compose ps`
- Nunca poner API keys ni contraseñas en el código, commits ni documentos
  (van solo en `deploy/.env` del servidor, que no se sube). Todo lo que llega al
  navegador es público, incluidas las variables `VITE_*`.
- No tocar los contenedores `tesis-*` (son de otro proyecto que corre en el mismo servidor).

## Actualizar el servidor (por SSH)

```bash
cd ~/proyecto-salud/SALUD-BACKEND && git pull origin denilson-dev
cd ~/proyecto-salud/SALUD-FRONTEND && git pull origin denilson-dev
cd ~/proyecto-salud/SALUD-BACKEND/deploy && docker compose up -d --build
cd ~/proyecto-salud/SALUD-BACKEND/deploy && docker compose ps
```

## Convenciones

- Todas las peticiones van por `src/api/client.js` (axios con el access token).
- Los errores se muestran con `mensajeError(err)` de ese mismo archivo: usa el mensaje
  del backend y, si no viene, uno en español según el código. No mostrar `err.message`.
- Antes de hacer commit: `npx eslint src` y `npm run build`.

## App instalable (PWA)

`public/manifest.webmanifest`, íconos `public/icono-*.png` y `public/sw.js` (se registra solo en
producción, en `main.jsx`). El service worker **no guarda datos**: solo muestra `sin-conexion.html`
si no hay internet; páginas y API van siempre a la red. Si se cambia, subir `CACHE` de versión.

## Vigilancia epidemiológica (mapa de calor)

`pages/Vigilancia.jsx` dibuja `GET /vigilancia/casos` con `components/MapaGuatemala.jsx` (SVG propio,
sin librerías) sobre `public/mapas/guatemala.geojson`: límites de CONRED/OCHA (HDX `cod-ab-gtm`,
licencia CC BY-IGO, **citar la fuente** donde se muestre), simplificados (~360 KB). Escala secuencial
de un tono (azul); "pocos" con rayado; posible brote con borde rojo + ⚠ y texto. La residencia del
paciente se elige con `components/SelectorResidencia.jsx` (sugiere el municipio de inscripción del DPI).

## Crecimiento infantil

`components/CrecimientoInfantil.jsx` (en la ficha, solo de 0 a 5 años): clasificación de la última
medición, formulario (Médico y Enfermería) y gráficas SVG de talla/edad, peso/edad y peso/talla con las
líneas de la OMS (0, ±2, ±3 DE) que manda `GET /pacientes/{id}/crecimiento`; anillo rojo fuera de ±2.

## Ayuda dentro del sistema

Botón "?" del encabezado (`components/Ayuda.jsx`): consejos de la pantalla actual en `utils/ayuda.js`
(la ruta más larga que coincida; `"/pacientes/"` con barra es la ficha). Cada consejo con `si` solo lo
ve quien tiene ese permiso. Al agregar una pantalla o función, agregar su ayuda ahí.

## Pruebas de pantallas (Playwright)

`e2e/` con `@playwright/test` (versión fija): cada puesto de prueba entra por el Login Único y abre
todas las opciones de su menú en celular (sin salirse de lado) y en computadora, sin errores de
JavaScript ni respuestas 5xx; los recorridos Recepción registra -> Médico receta -> Farmacia despacha
y Médico pide laboratorio -> Enfermería registra el resultado; y que la ayuda filtre por puesto.
En la PC (con backend, Keycloak y simuladores encendidos), usando el Chrome instalado:
`E2E_CANAL=chrome npx playwright test`. En GitHub corren dentro de las pruebas completas del backend.
