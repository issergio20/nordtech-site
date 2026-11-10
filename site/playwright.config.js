import { defineConfig, devices } from "@playwright/test";

// Тесты гоняются только против локальной вёрстки, не против nordtech.su.
// VARIANT=2 npx playwright test — те же тесты на варианте 2 (отдельный порт, чтобы не переиспользовать сервер варианта 1).
const PORT = process.env.VARIANT === "2" ? 8092 : 8090;
export default defineConfig({
  testDir: "e2e",
  timeout: 20_000,
  fullyParallel: true,
  reporter: [["list"]],
  use: {
    reducedMotion: "reduce", // анимации появления варианта 2 не мешают проверкам; отдельный тест включает их
    baseURL: `http://127.0.0.1:${PORT}`,
    locale: "ru-RU",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
    { name: "mobile", use: { ...devices["Pixel 7"], viewport: { width: 390, height: 844 } } },
  ],
  webServer: {
    command: `npx @11ty/eleventy --serve --port=${PORT} --quiet --output=${process.env.VARIANT === "2" ? "_site_test_v2" : "_site"}`,
    url: `http://127.0.0.1:${PORT}/`,
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
