import { defineConfig, devices } from "@playwright/test";

// Pruebas de pantallas (navegador de verdad). Necesitan el backend en 5050, el Login Único en 8081
// y los simuladores, igual que para trabajar en la PC. Uso:  npx playwright test
// En GitHub corren dentro de las pruebas completas del backend (SALUD-BACKEND/.github/workflows).
export default defineConfig({
  testDir: "e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,                        // comparten la misma base: una prueba a la vez
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  use: {
    baseURL: "http://localhost:4200",
    locale: "es-GT",
    timezoneId: "America/Guatemala",
    trace: "retain-on-failure",
    // En la PC se puede usar el Chrome instalado (E2E_CANAL=chrome) para no descargar otro navegador
    ...devices["Desktop Chrome"],
    ...(process.env.E2E_CANAL ? { channel: process.env.E2E_CANAL } : {}),
  },
  webServer: {
    command: "npm run dev",
    url: "http://localhost:4200",
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
