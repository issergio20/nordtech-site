import { defineConfig, devices } from "@playwright/test";

// Тесты гоняются только против локальной вёрстки, не против nordtech.su.
export default defineConfig({
  testDir: "e2e",
  timeout: 20_000,
  fullyParallel: true,
  reporter: [["list"]],
  use: {
    baseURL: "http://127.0.0.1:8090",
    locale: "ru-RU",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
    { name: "mobile", use: { ...devices["Pixel 7"], viewport: { width: 390, height: 844 } } },
  ],
  webServer: {
    command: "npm run build && npx @11ty/eleventy --serve --port=8090 --quiet",
    url: "http://127.0.0.1:8090/",
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
