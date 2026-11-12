// Меню разделов слева (вариант 1): светлое над тёмным фоном, тёмное над светлым — по реальным пикселям под меню.
// Заменяет для светлого меню проверку контраста axe, которая не видит фон шапок, нарисованный ::before или картинкой.
import { test, expect } from "./fixtures.js";

test.skip(process.env.VARIANT === "2", "меню разделов с подписями — вариант 1");

const PAGES = ["/", "/uslug/servisnye-uslugi/lizing/", "/o-kompanii/", "/kontakty/", "/katalog/spectehnika/"];

for (const url of PAGES) {
  test(`SIDEBAR цвет меню совпадает с фоном: ${url}`, async ({ page, isMobile }) => {
    test.skip(isMobile, "меню — от 1440px");
    test.setTimeout(60_000);
    await page.setViewportSize({ width: 1920, height: 1000 });
    await page.goto(url, { waitUntil: "networkidle" });
    const height = await page.evaluate(() => document.documentElement.scrollHeight);
    const mismatches = [];
    for (let y = 0; y < height; y += 600) {
      await page.evaluate((top) => scrollTo({ top, behavior: "instant" }), y);
      await page.mouse.wheel(0, 1);
      await page.waitForTimeout(200);
      const box = await page.evaluate(() => {
        const s = document.querySelector(".sidebar:not([hidden])");
        if (!s || getComputedStyle(s).display === "none") return null;
        s.style.visibility = "hidden"; // снимаем фон без самого меню
        const r = s.getBoundingClientRect();
        return { x: Math.max(0, r.left), y: Math.max(0, r.top + r.height / 2 - 30), width: Math.max(40, r.width), height: 60, white: s.classList.contains("sidebar--white") };
      });
      if (!box) return;
      const png = (await page.screenshot({ clip: { x: box.x, y: box.y, width: box.width, height: box.height } })).toString("base64");
      const brightness = await page.evaluate(async (b64) => {
        const img = new Image(); img.src = `data:image/png;base64,${b64}`; await img.decode();
        const c = document.createElement("canvas"); c.width = img.width; c.height = img.height;
        const ctx = c.getContext("2d"); ctx.drawImage(img, 0, 0);
        const d = ctx.getImageData(0, 0, c.width, c.height).data; let t = 0;
        for (let i = 0; i < d.length; i += 4) t += 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
        document.querySelector(".sidebar").style.visibility = "";
        return t / (d.length / 4);
      }, png);
      // Тёмный фон (< 100) — меню должно быть светлым; светлый (> 160) — тёмным; середину (край блока) не оцениваем
      if (brightness < 100 && !box.white) mismatches.push(`${y}px: тёмный фон (${Math.round(brightness)}), а меню тёмное`);
      if (brightness > 160 && box.white) mismatches.push(`${y}px: светлый фон (${Math.round(brightness)}), а меню светлое`);
    }
    expect(mismatches).toEqual([]);
  });
}
