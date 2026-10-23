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

## Modo oscuro

Se cambia en el menú del usuario (círculo con sus iniciales; en celular, el ícono junto a "Cerrar
sesión") y se recuerda en el navegador (`localStorage` "salud-tema"); si nunca se eligió, sigue al
sistema. `public/tema.js` pone la clase `dark` en `<html>` antes de dibujar (sin parpadeo) y
`src/utils/tema.js` la cambia. Los colores **no** se escriben pantalla por pantalla:
`scripts/modo-oscuro.mjs` busca las clases de color de `src/` (bg-white, text-slate-500, bg-blue-50,
border-red-200, hover:...) y genera `src/modo-oscuro.css` (fondos claros -> oscuros, textos oscuros ->
claros; los colores fuertes de botones, triage e insignias no cambian). **Después de agregar clases de
color nuevas, correr `node scripts/modo-oscuro.mjs`** (GitHub falla si el archivo no está al día).
Casos especiales con `dark:` (por ejemplo `dark:stroke-slate-300`). En las gráficas SVG usar clases
(`fill-slate-500`, `stroke-slate-200`), no colores fijos. Lo que va dentro de `.papel` (hojas para
imprimir) sigue blanco, y al imprimir todo sale claro. El mapa usa variables `--mapa-*` de `index.css`.

## Pantallas por partes y sesión

Cada pantalla se baja recién cuando se abre (`utils/cargarPantalla.js` con `React.lazy`; el
encabezado se queda mientras tanto). Si después de actualizar el servidor una pestaña vieja pide un
archivo que ya no existe, se recarga una vez sola; si aun así falla, dice "No se pudo abrir esta pantalla".
Al agregar una pantalla en `App.jsx`, cargarla con `cargar(() => import("./pages/..."))`.

`components/AvisoSesion.jsx` (dentro de Layout): tras 15 minutos sin uso en ninguna pestaña del
módulo (`utils/sesion.js`) muestra "¿Sigue ahí?" con 2 minutos de cuenta regresiva y luego cierra la
sesión también en el Login Único (el login lo explica). Si el Login Único ya no renueva la sesión,
muestra "Su sesión terminó" con "Volver a entrar", que regresa a la misma pantalla. La pantalla de
turnos de la sala de espera no lleva Layout, así que no se cierra por inactividad.

## Puestos y permisos, presupuesto

`pages/Permisos.jsx` (`/permisos`, menú Gestión de Jefatura y Administración): la matriz de `permisos.js`
por área y puesto, solo lectura, con el puesto del usuario resaltado. Al agregar un permiso, ponerlo
también en su área de esa pantalla (y en `auth.py`, que es la que manda). `components/Presupuesto.jsx`
(inicio): barra de ejecución y, con `presupuesto.editar` (Administración), el formulario de `PUT /presupuesto`.

## Asignar puestos

`pages/AsignarPuestos.jsx` (`/puestos`, Gestión, permiso `puestos.asignar`): Administración da un puesto de
Salud a una cuenta del Login Único (por el código de "Mi resumen" o eligiéndola en "Entraron sin puesto").
`utils/puestosAsignados.js` lee los `asignados` de `GET /mis-permisos` una vez por sesión (ProtectedRoute
espera a tenerlos) y `useRoles` los suma a los roles del token; el servidor los aplica en cada petición.

## Auditoría Social (en Integraciones)

`components/AuditoriaSocial.jsx`: lista de comprobación de los servicios para Auditoría, última consulta
exitosa, rechazos con su motivo (para compartírselo a Auditoría) y "Probar ahora"
(`GET /integraciones/auditoria`, `POST /integraciones/auditoria/probar`).

## Red de establecimientos y referencias

`pages/RedEstablecimientos.jsx` (`/red`, todo el personal): los 45 hospitales del MSPAS y los que agregue
Administración, con mapa por municipio, filtros y la fuente citada; con `establecimientos.gestionar` se
completan dirección, teléfono, estado y atención. `components/ReferenciasPaciente.jsx` (ficha): el médico
refiere a un establecimiento activo y se abre la hoja `/imprimir/referencia/:id` (`ReferenciaImpresa` en
`Documentos.jsx`, en la misma pestaña). `pages/Referencias.jsx` (`/referencias`): por confirmar primero;
Enfermería, Médico o Jefatura la marcan recibida o cancelada. `utils/red.js`: textos y la red en memoria.

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
