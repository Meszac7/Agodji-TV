import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT ?? 3100);

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
    { name: "android", use: { ...devices["Pixel 7"] } },
    // Seul Chromium est installé : on émule le format iPhone avec Chromium (le vrai Safari sera testé sur appareil).
    { name: "iphone-format", use: { ...devices["iPhone 14"], browserName: "chromium", defaultBrowserType: "chromium" } },
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
  ],
  webServer: {
    command: `npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    env: { APP_ENV: "development", DATABASE_URL: process.env.DATABASE_URL ?? "" },
    timeout: 60_000,
  },
});
