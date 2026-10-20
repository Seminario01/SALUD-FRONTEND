import { test, expect } from "@playwright/test";
import { entrar, vigilarErrores } from "./ayuda";

// 2) Un recorrido completo entre puestos, como en el día a día:
//    Recepción registra a un paciente nuevo -> el médico le receta -> Farmacia despacha la receta.
// Usa un nombre al azar (solo letras) para no chocar con corridas anteriores.
const letras = Array.from({ length: 6 }, () => "abcdefghijklmnopqrstuvwxyz"[Math.floor(Math.random() * 26)]).join("");
const NOMBRE = `Paciente Pantallas ${letras[0].toUpperCase()}${letras.slice(1)}`;

test.describe.configure({ mode: "serial" });
let receta;

test("Recepción registra un paciente nuevo", async ({ page }) => {
  const errores = vigilarErrores(page);
  await entrar(page, "recepcion1");
  await page.goto("/pacientes");
  await page.getByLabel("Nombre completo *").fill(NOMBRE);
  await page.getByLabel("Género").selectOption("F");
  await page.getByLabel("Tipo de seguro").selectOption("Ninguno");
  await page.getByRole("button", { name: "Registrar", exact: true }).click();
  // Si el sistema avisa de alguien parecido (de otra corrida), es otra persona
  const parecido = page.getByRole("button", { name: "Sí, es otra persona" });
  const exito = page.getByText(/Paciente registrado con ID \d+/);
  await expect(parecido.or(exito)).toBeVisible();
  if (await parecido.isVisible()) await parecido.click();
  await expect(exito).toBeVisible();
  await expect(page.getByRole("link", { name: `Ver ficha de ${NOMBRE} →` })).toBeVisible();
  expect(errores).toEqual([]);
});

test("el médico le emite una receta", async ({ page }) => {
  const errores = vigilarErrores(page);
  await entrar(page, "medico1");
  await page.goto("/recetas");
  const buscador = page.getByRole("combobox", { name: "Paciente" });
  await buscador.fill(NOMBRE);
  await page.getByRole("option", { name: new RegExp(NOMBRE) }).first().click();
  await expect(page.getByText(NOMBRE).first()).toBeVisible();

  const medicamento = page.getByLabel("Medicamento 1");
  const opcion = await medicamento.locator("option").evaluateAll((os) => os.map((o) => o.textContent).find((t) => t.startsWith("Acetaminofén")));
  expect(opcion, "existe Acetaminofén en el catálogo").toBeTruthy();
  await medicamento.selectOption({ label: opcion });
  await page.getByLabel("Cantidad 1").fill("2");
  await page.getByLabel("Dosis 1").fill("1 tableta cada 8 horas si hay dolor");
  await page.getByRole("button", { name: "Emitir receta" }).click();
  const aviso = page.getByText(/Receta No\. \d+ emitida/);
  await expect(aviso).toBeVisible();
  receta = Number((await aviso.textContent()).match(/No\. (\d+)/)[1]);
  expect(errores).toEqual([]);
});

test("Farmacia despacha esa receta", async ({ page }) => {
  expect(receta, "la receta del paso anterior").toBeTruthy();
  const errores = vigilarErrores(page);
  await entrar(page, "farmacia1");
  await page.goto("/recetas");
  const tarjeta = page.locator(`article[data-receta="${receta}"]`);
  await expect(tarjeta).toContainText(NOMBRE);
  await tarjeta.getByRole("button", { name: "Despachar" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Despachar" }).click();
  await expect(page.getByText(`Receta No. ${receta} despachada`)).toBeVisible();
  expect(errores).toEqual([]);
});
