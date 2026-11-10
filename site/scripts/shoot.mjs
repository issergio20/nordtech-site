// Скриншоты для replica-diff: одинаковые размеры окна, одинаковое состояние.
//   node scripts/shoot.mjs clone      — локальная вёрстка (нужен запущенный dev-сервер на :8080)
//   node scripts/shoot.mjs v2         — вариант 2 (npm run dev:v2 на :8081) → replica/clone-screens-v2
//   node scripts/shoot.mjs original   — nordtech.su: 6 страниц × 2 размера, по одной, с паузой 3 с (не нагружаем сайт)
import { chromium } from "@playwright/test";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const which = process.argv[2];
const SCREENS = {
  S01: ["/", "/"],
  S02: ["/katalog", "/katalog/"],
  S03: ["/katalog/spectehnika", "/katalog/spectehnika/"],
  S05: ["/katalog/spectehnika/ekskavator-pogruzchik/ekskavator-pogruzchik-gros-shanmon-388-ii", "/katalog/spectehnika/ekskavator-pogruzchik/ekskavator-pogruzchik-gros-shanmon-388-ii/"],
  S10: ["/uslug/servisnye-uslugi/lizing", "/uslug/servisnye-uslugi/lizing/"],
  S13: ["/kontakty", "/kontakty/"],
};
const base = which === "original" ? "https://nordtech.su" : which === "v2" ? "http://localhost:8081" : "http://localhost:8080";
const outDir = new URL(`../../replica/${which === "original" ? "screens" : which === "v2" ? "clone-screens-v2" : "clone-screens"}/`, import.meta.url);
fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch();
for (const [vp, size] of [["desktop", { width: 1440, height: 900 }], ["mobile", { width: 390, height: 844 }]]) {
  const ctx = await browser.newContext({ viewport: size, locale: "ru-RU", deviceScaleFactor: 1, reducedMotion: "reduce" });
  const page = await ctx.newPage();
  for (const [id, [orig, clone]] of Object.entries(SCREENS)) {
    await page.goto(base + (which === "original" ? orig : clone), { waitUntil: "networkidle", timeout: 45000 });
    await page.addStyleTag({ content: "*{animation:none!important;transition:none!important} .about__video{visibility:hidden!important} .preloader{display:none!important} .header-menu{display:none!important} .nav-tab{display:none!important} .contacts__map{visibility:hidden!important}" });
    await page.waitForTimeout(800);
    const file = fileURLToPath(new URL(`${id}-${vp}.png`, outDir));
    await page.screenshot({ path: file, fullPage: true });
    console.log("saved", file);
    if (which === "original") await page.waitForTimeout(3000);
  }
  await ctx.close();
}
await browser.close();
