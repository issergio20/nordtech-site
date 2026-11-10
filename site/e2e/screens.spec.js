// Каждый экран: открывается, один H1, нет горизонтальной прокрутки, нет нарушений WCAG 2.2 AA (axe), есть title и description.
import { test, expect, axe } from "./fixtures.js";

const SCREENS = {
  S01: "/",
  S02: "/katalog/",
  S03: "/katalog/spectehnika/",
  S04: "/katalog/spectehnika/frontalnyj-pogruzchik/",
  "S04-empty": "/katalog/drugoe/angary/",
  S05: "/katalog/spectehnika/ekskavator-pogruzchik/ekskavator-pogruzchik-gros-shanmon-388-ii/",
  "S05-thin": "/katalog/spectehnika/frontalnyj-pogruzchik/frontalnyj-pogruzchik-lonking-lg833gb/",
  S06: "/rezultaty-poiska/?query=погрузчик",
  S07: "/o-kompanii/",
  S08: "/uslug/",
  S09: "/uslug/servisnye-uslugi/",
  S10: "/uslug/servisnye-uslugi/lizing/",
  S11: "/uslug/spectehnika/",
  S12: "/logistika/",
  S13: "/kontakty/",
  S14: "/politika-konfidencialnosti/",
  S15: "/obrabotka-dannyh/",
  "UI-kit": "/ui-kit/",
};

for (const [id, url] of Object.entries(SCREENS)) {
  test(`${id} ${url}`, async ({ page }) => {
    const res = await page.goto(url);
    expect(res.status()).toBe(200);
    await expect(page.locator("h1")).toHaveCount(1);
    expect(await page.title()).toMatch(/НОРД/);
    await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", /.{40,}/);
    // Сравниваем с заданной шириной окна: в мобильной эмуляции браузер растягивает и innerWidth, если что-то шире экрана (BUG-003)
    const vw = page.viewportSize().width;
    const overflow = await page.evaluate((w) => document.documentElement.scrollWidth > w || window.innerWidth > w, vw);
    expect(overflow, "горизонтальная прокрутка").toBe(false);
    expect(await axe(page)).toEqual([]);
  });
}

test("404 отдаёт страницу с выходом в каталог", async ({ page, guard }) => {
  guard.ignore.push(/status of 404/); // сам ответ 404 — ожидаемый
  const res = await page.goto("/nesuschestvuyuschaya-stranica/");
  expect(res.status()).toBe(404);
  await expect(page.getByRole("link", { name: "Каталог" }).first()).toBeVisible();
});

test("редиректы погрузчиков сгенерированы без слэша на конце", async ({ request }) => {
  const txt = await (await request.get("/redirects.nginx.conf")).text();
  expect(txt.match(/return 301/g)).toHaveLength(5);
  expect(txt).not.toMatch(/return 301 \S+\/;/);
});
