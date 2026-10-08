import { defineConfig, devices } from "@playwright/test";

/**
 * E2E (R5.1/R4.8): navegador de verdade, 390 px e 1280 px, sobre o protótipo
 * (mock com a matriz v3). Localmente usa o Chrome instalado; no CI, o Chromium
 * do Playwright. Porta 5179 (a 5173 da máquina da dupla é de outro projeto).
 */
const PORTA = 5179;
const canal = process.env.CI ? {} : { channel: "chrome" as const };

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]] : "list",
  use: {
    baseURL: `http://localhost:${PORTA}`,
    locale: "pt-BR",
    contextOptions: { reducedMotion: "reduce" },
    trace: "retain-on-failure",
    ...canal,
  },
  projects: [
    { name: "celular-390", use: { ...devices["Desktop Chrome"], viewport: { width: 390, height: 844 }, hasTouch: true, ...canal } },
    { name: "desktop-1280", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 }, ...canal } },
  ],
  webServer: {
    command: `npx vite --port ${PORTA} --strictPort`,
    url: `http://localhost:${PORTA}`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
