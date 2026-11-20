import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT ?? 3100);
// Serveurs de PRÉPRODUCTION pour les tests de sécurité : l'un protégé par code, l'autre sans code (doit rester fermé).
// Ces valeurs sont des données de test, pas des secrets réels.
const PREPROD_PORT = PORT + 1;
const LOCKED_PORT = PORT + 2;
export const E2E_PREVIEW_CODE = "code-de-test-e2e-0123456789";
const preprodEnv = {
  APP_ENV: "preview",
  DATABASE_URL: process.env.DATABASE_URL ?? "",
  VIDEO_PROVIDER: "simulator",
  SIMULATOR_SIGNING_SECRET: "secret-simulateur-e2e-0123456789",
};
const preprodOnly = /preprod-.*\.spec\.ts/;

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "off",
    // Lecture automatique autorisée dans les tests (sur un vrai téléphone, l'entrée dans le lecteur est un geste de l'utilisateur).
    launchOptions: { args: ["--autoplay-policy=no-user-gesture-required"] },
  },
  projects: [
    { name: "android", use: { ...devices["Pixel 7"] }, testIgnore: preprodOnly },
    // Seul Chromium est installé : on émule le format iPhone avec Chromium (le vrai Safari sera testé sur appareil).
    { name: "iphone-format", use: { ...devices["iPhone 14"], browserName: "chromium", defaultBrowserType: "chromium" }, testIgnore: preprodOnly },
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } }, testIgnore: preprodOnly },
    { name: "preprod-protegee", use: { ...devices["Pixel 7"], baseURL: `http://localhost:${PREPROD_PORT}` }, testMatch: /preprod-protection\.spec\.ts/ },
    { name: "preprod-verrouillee", use: { ...devices["Desktop Chrome"], baseURL: `http://localhost:${LOCKED_PORT}` }, testMatch: /preprod-locked\.spec\.ts/ },
  ],
  webServer: [
    {
      command: `npx next start -p ${PORT}`,
      url: `http://localhost:${PORT}`,
      reuseExistingServer: !process.env.CI,
      env: { APP_ENV: "development", DATABASE_URL: process.env.DATABASE_URL ?? "" },
      timeout: 60_000,
    },
    {
      command: `npx next start -p ${PREPROD_PORT}`,
      url: `http://localhost:${PREPROD_PORT}/robots.txt`,
      reuseExistingServer: false,
      env: { ...preprodEnv, PREVIEW_ACCESS_CODE: E2E_PREVIEW_CODE },
      timeout: 60_000,
    },
    {
      command: `npx next start -p ${LOCKED_PORT}`,
      url: `http://localhost:${LOCKED_PORT}/robots.txt`,
      reuseExistingServer: false,
      env: { ...preprodEnv, PREVIEW_ACCESS_CODE: "" },
      timeout: 60_000,
    },
  ],
});
