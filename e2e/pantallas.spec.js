import { test, expect } from "@playwright/test";
import { entrar, pantallaBien, sinScrollDeLado, vigilarErrores } from "./ayuda";

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
