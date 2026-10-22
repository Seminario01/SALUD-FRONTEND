import { test, expect } from "@playwright/test";
import { CLAVE_PRUEBA, entrar, pantallaBien, sinScrollDeLado, vigilarErrores } from "./ayuda";

// 1) Cada puesto entra y abre TODAS las opciones de su menú, en celular y en computadora:
//    ninguna pantalla se rompe (error de JavaScript o 5xx), se queda cargando o se sale de lado.
const PUESTOS = ["medico1", "enfermera1", "recepcion1", "farmacia1", "caja1", "jefatura1", "admin.salud", "ciudadano1", "auditor1"];

for (const usuario of PUESTOS) {
  test(`${usuario}: todas las pantallas de su menú cargan bien`, async ({ page }) => {
    const errores = vigilarErrores(page);
    await page.setViewportSize({ width: 390, height: 844 });           // celular
    await entrar(page, usuario);
    await page.getByRole("button", { name: "Abrir menú" }).click();
    const rutas = await page.locator("header nav a").evaluateAll((as) => [...new Set(as.map((a) => a.getAttribute("href")))]);
    expect(rutas.length, "el menú tiene opciones").toBeGreaterThan(0);

    for (const ruta of rutas) {
      await test.step(`celular ${ruta}`, async () => {
        await page.goto(ruta);
        await pantallaBien(page, ruta);
        await sinScrollDeLado(page, ruta);
      });
    }
    await page.setViewportSize({ width: 1366, height: 768 });          // computadora
    for (const ruta of rutas) {
      await test.step(`computadora ${ruta}`, async () => {
        await page.goto(ruta);
        await pantallaBien(page, ruta);
        await sinScrollDeLado(page, ruta);                          // el encabezado cabe con todo su menú
      });
    }
    expect(errores, "sin errores de JavaScript ni del backend").toEqual([]);
  });
}

test("modo oscuro: se activa desde el menú del usuario, se recuerda y no se imprime", async ({ page }) => {
  // Suma R+G+B del fondo (pasando el color por un canvas, porque Tailwind usa oklch)
  const fondo = () => page.evaluate(() => {
    const c = document.createElement("canvas").getContext("2d");
    c.fillStyle = getComputedStyle(document.body).backgroundColor;
    c.fillRect(0, 0, 1, 1);
    const [r, g, b] = c.getImageData(0, 0, 1, 1).data;
    return r + g + b;
  });
  await page.emulateMedia({ colorScheme: "light" });
  await page.setViewportSize({ width: 1366, height: 768 });
  await entrar(page, "medico1");
  expect(await fondo(), "empieza claro (como el sistema)").toBeGreaterThan(600);
  await page.getByRole("button", { name: /^Menú de / }).click();
  await page.getByRole("button", { name: "Cambiar a modo oscuro" }).click();
  await expect(page.locator("html")).toHaveClass(/dark/);
  expect(await fondo(), "fondo oscuro").toBeLessThan(150);
  await page.reload();
  await expect(page.locator("html"), "se recuerda al volver a abrir").toHaveClass(/dark/);
  await page.emulateMedia({ media: "print" });
  expect(await fondo(), "al imprimir sale en blanco").toBeGreaterThan(700);
  await page.emulateMedia({ media: "screen" });
  await page.getByRole("button", { name: /^Menú de / }).click();
  await page.getByRole("button", { name: "Cambiar a modo claro" }).click();
  await expect(page.locator("html")).not.toHaveClass(/dark/);
});

test("sesión: avisa tras 15 minutos sin uso, se puede seguir y si nadie responde se cierra", async ({ page }) => {
  await page.clock.install();                                        // reloj del navegador controlado
  await entrar(page, "medico1");
  await page.clock.fastForward("14:00");
  await expect(page.getByRole("alertdialog"), "antes de 15 minutos no avisa").toHaveCount(0);
  await page.clock.fastForward("01:30");
  await expect(page.getByRole("alertdialog")).toBeVisible();
  await expect(page.getByText("¿Sigue ahí?")).toBeVisible();
  await page.getByRole("button", { name: "Seguir trabajando" }).click();
  await expect(page.getByRole("alertdialog"), "seguir trabajando cierra el aviso").toHaveCount(0);
  await page.clock.fastForward("17:05");                             // nadie responde
  await page.waitForURL((url) => url.port === "4200" && url.pathname.startsWith("/login"), { timeout: 20_000 });
  await expect(page.getByText(/se cerró por inactividad/)).toBeVisible();
});

test("sesión: si se cierra en otra pestaña, avisa y al volver a entrar regresa a la misma pantalla", async ({ page, context }) => {
  await page.clock.install();
  await entrar(page, "medico1");
  await page.goto("/vacunacion");
  await pantallaBien(page, "/vacunacion");
  // Otra pestaña (misma sesión del Login Único) cierra la sesión
  const otra = await context.newPage();
  await otra.goto("/");
  await otra.getByRole("button", { name: /Iniciar sesión con el Login Único/ }).click();
  await otra.waitForURL((url) => url.port === "4200" && !url.pathname.startsWith("/login"));
  await otra.getByRole("button", { name: /^Menú de / }).click();
  await otra.getByRole("button", { name: "Cerrar sesión" }).click();
  await otra.waitForURL((url) => url.port === "4200" && url.pathname.startsWith("/login"));
  await otra.close();
  // En esta pestaña, la siguiente renovación (cada 5 minutos) ya no funciona
  await page.clock.fastForward("05:00");
  await expect(page.getByText("Su sesión terminó")).toBeVisible({ timeout: 15_000 });
  await page.getByRole("button", { name: "Volver a entrar" }).click();
  await page.locator("#username").fill("medico1");
  await page.locator("#password").fill(CLAVE_PRUEBA);
  await page.locator("#kc-login").click();
  await page.waitForURL((url) => url.port === "4200" && url.pathname === "/vacunacion");
  await pantallaBien(page, "/vacunacion");
});

test("una ruta que no existe muestra la página de no encontrado", async ({ page }) => {
  await entrar(page, "medico1");
  await page.goto("/esto-no-existe");
  await expect(page.locator("main h1")).toBeVisible();
  await expect(page.getByRole("link", { name: /inicio|volver/i }).first()).toBeVisible();
});

test("la verificación pública de recetas funciona sin iniciar sesión", async ({ page }) => {
  const errores = vigilarErrores(page);
  await page.setViewportSize({ width: 375, height: 700 });
  await page.goto("/verificar/codigoquenoexiste");
  await expect(page.getByText(/no (existe|se encontr)/i).first()).toBeVisible();
  await sinScrollDeLado(page, "/verificar");
  expect(errores).toEqual([]);
});
