import { defineConfig, devices } from "@playwright/test";

/**
 * Pruebas e2e sin red (CLAUDE.md: «@playwright/test con red bloqueada»).
 * Se ejecutan contra el build de producción servido en local: npm run build && npm run test:e2e
 */
export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60_000,
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL: "http://localhost:4173",
    trace: "off",
    reducedMotion: "reduce",
    // PW_CHROMIUM permite usar un Chromium ya instalado (p. ej. en entornos sin descarga de navegadores).
    launchOptions: process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {},
  },
  webServer: {
    command: "npx vite preview --port 4173 --strictPort",
    url: "http://localhost:4173",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile-390", use: { ...devices["Desktop Chrome"], viewport: { width: 390, height: 844 } } },
  ],
});
