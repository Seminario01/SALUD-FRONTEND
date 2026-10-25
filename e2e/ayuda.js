import { expect } from "@playwright/test";

// Cuentas de PRUEBA del Login Único local (keycloak-local/import del backend); no existen en producción.
export const CLAVE_PRUEBA = process.env.E2E_CLAVE || "Demo2026*";

// Inicia sesión por la pantalla real del Login Único y espera a volver al módulo
export async function entrar(page, usuario) {
  await page.goto("/");
  await page.getByRole("button", { name: /Iniciar sesión con el Login Único/ }).click();
  await page.locator("#username").fill(usuario);
  await page.locator("#password").fill(CLAVE_PRUEBA);
  await page.locator("#kc-login").click();
  await page.waitForURL((url) => url.port === "4200" && !url.pathname.startsWith("/login"));
  await expect(page.getByText("Módulo Salud").first()).toBeVisible();
}

// Junta los errores de JavaScript y las respuestas 5xx del backend mientras corre la prueba
export function vigilarErrores(page) {
  const errores = [];
  page.on("pageerror", (e) => errores.push(`Error de JavaScript: ${e.message}`));
  // Algo bloqueado por la Content-Security-Policy (se prueba con la app compilada y las cabeceras de nginx)
  page.on("console", (m) => {
    if (m.type() === "error" && /Content Security Policy/i.test(m.text())) errores.push(`CSP: ${m.text().slice(0, 200)}`);
  });
  page.on("response", (r) => {
    if (r.url().includes("/api/") && r.status() >= 500) errores.push(`${r.status()} en ${r.request().method()} ${new URL(r.url()).pathname}`);
  });
  return errores;
}

// La pantalla terminó de cargar: tiene título, ya no dice "Cargando..." y no muestra "No se pudo..."
export async function pantallaBien(page, ruta) {
  const principal = page.locator("main");
  await expect(principal.locator("h1").first(), `${ruta}: sin título`).toBeVisible();
  await expect(principal.getByText(/^Cargando\.\.\.$/), `${ruta}: se quedó cargando`).toHaveCount(0, { timeout: 15_000 });
  await expect(principal.getByText(/No se pudo/), `${ruta}: muestra un error`).toHaveCount(0);
}

// Nada debe obligar a mover la página de lado (las tablas se mueven dentro de su caja)
export async function sinScrollDeLado(page, ruta) {
  const sobra = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(sobra, `${ruta}: la página se sale ${sobra}px a lo ancho`).toBeLessThanOrEqual(1);
}
