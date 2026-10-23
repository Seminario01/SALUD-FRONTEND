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

// 3) Laboratorio: el médico pide glucosa -> Enfermería toma la muestra y registra un valor alto
let orden;

test("el médico pide un examen de glucosa urgente", async ({ page }) => {
  const errores = vigilarErrores(page);
  await entrar(page, "medico1");
  await page.goto("/laboratorio");
  await page.getByRole("combobox", { name: "Paciente" }).fill(NOMBRE);
  await page.getByRole("option", { name: new RegExp(NOMBRE) }).first().click();
  await page.getByLabel("Glucosa en ayunas").check();
  await page.getByLabel("Urgente").check();
  await page.getByRole("button", { name: "Pedir 1 examen" }).click();
  const aviso = page.getByText(/Orden de laboratorio No\. \d+ creada/);
  await expect(aviso).toBeVisible();
  orden = Number((await aviso.textContent()).match(/No\. (\d+)/)[1]);
  expect(errores).toEqual([]);
});

test("Enfermería toma la muestra y el resultado alto sale en rojo", async ({ page }) => {
  expect(orden, "la orden del paso anterior").toBeTruthy();
  const errores = vigilarErrores(page);
  await entrar(page, "enfermera1");
  await page.goto("/laboratorio");
  const tarjeta = page.locator(`article[data-orden="${orden}"]`);
  await expect(tarjeta).toContainText("URGENTE");
  await tarjeta.getByRole("button", { name: "Tomar muestra" }).click();
  await tarjeta.getByRole("button", { name: "Registrar resultados" }).click();
  await tarjeta.getByLabel(/Glucosa/).fill("182");
  await expect(tarjeta.getByText("Alto ↑")).toBeVisible();          // se marca mientras se digita
  await tarjeta.getByRole("button", { name: "Guardar y entregar resultados" }).click();
  await expect(page.getByText(`Resultados de la orden No. ${orden} completados`)).toBeVisible();
  expect(errores).toEqual([]);
});

test("la ayuda muestra solo lo que el puesto puede hacer", async ({ page }) => {
  await entrar(page, "farmacia1");
  await page.goto("/recetas");
  await page.getByRole("button", { name: "Ayuda de esta pantalla" }).filter({ visible: true }).click();
  const ayuda = page.getByRole("dialog", { name: "Recetas" });
  await expect(ayuda).toContainText("Despache las pendientes");
  await expect(ayuda).not.toContainText("Al elegir al paciente");       // eso es del médico
  await page.keyboard.press("Escape");
  await expect(ayuda).toBeHidden();
});

test("Administración le asigna un puesto a una cuenta sin puesto, y se lo quita", async ({ browser }) => {
  test.setTimeout(120_000);
  const ventana = { viewport: { width: 1366, height: 768 } };
  const persona = await (await browser.newContext(ventana)).newPage();   // cada uno con su propia sesión
  const admin = await (await browser.newContext(ventana)).newPage();
  admin.on("dialog", (d) => d.accept());
  const errores = vigilarErrores(admin);

  await entrar(persona, "ciudadano1");
  await expect(persona.getByRole("link", { name: "Mi resumen" })).toBeVisible();
  // El código del usuario (sub): el mismo que "Mi resumen" muestra a quien no está vinculado
  const codigo = await persona.evaluate(() => {
    const [, guardado] = Object.entries(sessionStorage).find(([k]) => k.startsWith("oidc.user"));
    return JSON.parse(guardado).profile.sub;
  });

  await entrar(admin, "admin.salud");
  await admin.goto("/puestos");
  await expect(admin.getByRole("heading", { name: "Asignar puestos" })).toBeVisible();
  const fila = admin.locator("tr", { hasText: codigo });
  if (await fila.count()) {                                     // quedó de una corrida anterior
    await fila.getByRole("button", { name: "Quitar" }).click();
    await expect(fila).toHaveCount(0);
  }
  await admin.getByLabel("Código del usuario").fill(codigo);
  await admin.getByLabel("Puesto").selectOption({ label: "Jefatura médica" });
  await admin.getByRole("button", { name: "Asignar", exact: true }).click();
  await expect(admin.getByText(/Puesto Jefatura médica asignado/)).toBeVisible();
  await expect(fila).toContainText("Jefatura médica");

  await persona.reload();                                       // al recargar ya trae su puesto
  await persona.getByRole("button", { name: /^Menú de / }).click();
  await expect(persona.getByText("Jefatura médica").first()).toBeVisible();
  await persona.goto("/vigilancia");
  await expect(persona.getByRole("heading", { name: "Vigilancia epidemiológica" })).toBeVisible();

  await fila.getByRole("button", { name: "Quitar" }).click();
  await expect(admin.getByText("Puesto quitado.")).toBeVisible();
  await persona.goto("/");
  await persona.reload();
  await expect(persona.getByRole("link", { name: "Mi resumen" })).toBeVisible();
  expect(errores).toEqual([]);
});

test("el médico refiere a una paciente al Roosevelt y Enfermería confirma que llegó", async ({ browser }) => {
  test.setTimeout(120_000);
  const ventana = { viewport: { width: 1366, height: 768 } };
  const medico = await (await browser.newContext(ventana)).newPage();
  const errores = vigilarErrores(medico);
  await entrar(medico, "medico1");
  await medico.goto("/pacientes");
  await medico.getByPlaceholder("Buscar por nombre o CUI").fill("María José López");
  await medico.getByRole("button", { name: "Buscar", exact: true }).click();
  await medico.getByRole("link", { name: "María José López Hernández" }).first().click();
  await medico.getByRole("button", { name: "Referir" }).click();
  const seccion = medico.locator("section", { hasText: "Referencias a otros establecimientos" });
  await seccion.getByLabel("Departamento").selectOption({ label: "Guatemala" });
  await seccion.getByLabel("Establecimiento").selectOption({ label: "Hospital Roosevelt — Guatemala" });
  await seccion.getByLabel("Prioridad").selectOption("URGENTE");
  const motivo = `Valoración por cardiología ${Date.now()}`;
  await seccion.getByLabel("Motivo de la referencia").fill(motivo);
  medico.on("dialog", (d) => d.dismiss());                          // la hoja abre la ventana de imprimir
  await seccion.getByRole("button", { name: "Referir e imprimir la hoja" }).click();
  await medico.waitForURL(/\/imprimir\/referencia\/\d+/);
  await expect(medico.getByText(motivo)).toBeVisible();               // la hoja trae el motivo y el destino
  await expect(medico.getByText("Hospital Roosevelt").first()).toBeVisible();
  await medico.getByRole("button", { name: "← Volver" }).click();
  await expect(medico.locator("section", { hasText: "Referencias a otros establecimientos" }).getByText(motivo)).toBeVisible();

  const enfermera = await (await browser.newContext(ventana)).newPage();
  enfermera.on("dialog", (d) => d.accept("Confirmado por teléfono con emergencia"));
  await entrar(enfermera, "enfermera1");
  await enfermera.goto("/referencias");
  const fila = enfermera.locator("tr", { hasText: motivo });
  await expect(fila).toContainText("Urgente");
  await fila.getByRole("button", { name: "Recibida" }).click();
  await expect(enfermera.getByText("Referencia marcada como recibida")).toBeVisible();
  expect(errores).toEqual([]);
});
