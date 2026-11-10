// Только для варианта 2 (VARIANT=2 npx playwright test): дизайн-система «НОРД Тёмный», replica/design-v2/DESIGN.md
import { test, expect, PRODUCT } from "./fixtures.js";

test.skip(process.env.VARIANT !== "2", "тесты варианта 2");

test("V2-1 подписи полей над полем, обязательные отмечены", async ({ page }) => {
  await page.goto(PRODUCT);
  await page.locator("[data-buy]").getByRole("button", { name: "Узнать стоимость" }).click();
  const field = page.getByRole("dialog").locator(".field").filter({ has: page.locator("#lead-name") });
  const [lb, ib] = [await field.locator("label").boundingBox(), await field.locator("input").boundingBox()];
  expect(lb.y + lb.height).toBeLessThanOrEqual(ib.y + 1);
  expect(await field.locator("label").evaluate((el) => getComputedStyle(el, "::after").content)).toContain("*");
});

test("V2-2 в окне заявки есть Telegram", async ({ page }) => {
  await page.goto("/");
  await page.locator("#about").getByRole("button", { name: "Получить консультацию" }).click();
  await expect(page.getByRole("dialog").getByRole("link", { name: "Написать в Telegram" })).toHaveAttribute("href", /t\.me/);
});

test("V2-3 на главной нет блока «Официальный дилер»", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Официальный дилер" })).toHaveCount(0);
  await expect(page.locator("#trust")).toHaveCount(0);
});

test("V2-4 первый экран на всю высоту, заголовки — Unbounded, текст — Onest", async ({ page }) => {
  await page.goto("/");
  const vh = page.viewportSize().height;
  expect((await page.locator("#about").boundingBox()).height).toBeGreaterThanOrEqual(vh - 1);
  await expect(page.locator("#about").getByRole("button", { name: "Получить консультацию" })).toBeInViewport();
  const font = (sel) => page.locator(sel).first().evaluate((el) => getComputedStyle(el).fontFamily);
  expect(await font("h1")).toMatch(/^"?Unbounded/);
  expect(await font(".hero__lead")).toMatch(/^"?Onest/);
  await page.evaluate(() => document.fonts.ready);
  expect(await page.evaluate(() => document.fonts.check('600 32px "Unbounded"', "Ж"))).toBe(true);
});

test("V2-5 сетка на всю ширину экрана", async ({ page }) => {
  await page.setViewportSize({ width: 2200, height: 1000 });
  await page.goto("/katalog/");
  const box = await page.locator(".tiles").boundingBox();
  expect(box.width).toBeGreaterThan(2200 - 2 * 80 - 4); // ограничения ширины нет — только поля страницы
});

test("V2-6 шрифты масштабируются с экраном", async ({ page }) => {
  const size = async (w) => {
    await page.setViewportSize({ width: w, height: 900 });
    await page.goto("/");
    return page.evaluate(() => ({
      h2: parseFloat(getComputedStyle(document.querySelector("#catalog-title")).fontSize),
      body: parseFloat(getComputedStyle(document.querySelector(".hero__lead")).fontSize),
    }));
  };
  const [s, l] = [await size(360), await size(1920)];
  expect(s.body).toBeGreaterThanOrEqual(16);
  expect(l.h2).toBeGreaterThan(s.h2 * 1.8);
  expect(l.body).toBeGreaterThan(s.body);
});

test("V2-7 липкая кнопка на телефоне — когда основные кнопки ушли с экрана", async ({ page, isMobile }) => {
  test.skip(!isMobile, "только телефон");
  await page.goto(PRODUCT);
  const sticky = page.locator("[data-sticky-cta]");
  await expect(sticky).not.toHaveClass(/is-visible/);
  await page.locator(".specs").scrollIntoViewIfNeeded();
  await page.mouse.wheel(0, 600);
  await expect(sticky).toHaveClass(/is-visible/);
  await sticky.getByRole("button", { name: "Узнать цену" }).click();
  await expect(page.getByRole("dialog", { name: "Оформить заявку" }).getByLabel("Название товара")).toHaveValue(/388-II/);
});

test("V2-8 галерея: миниатюра меняет большое фото", async ({ page }) => {
  await page.goto(PRODUCT);
  const main = page.locator("[data-gallery-main] img");
  const before = await main.getAttribute("src");
  await page.getByRole("button", { name: "Фото 3 из 5" }).click();
  await expect(page.getByRole("button", { name: "Фото 3 из 5" })).toHaveAttribute("aria-pressed", "true");
  expect(await main.getAttribute("src")).not.toBe(before);
});

test("V2-9 карусель популярных моделей листается кнопками", async ({ page, isMobile }) => {
  test.skip(isMobile, "на телефоне листают пальцем");
  await page.goto("/");
  const track = page.getByRole("region", { name: "Популярные модели" });
  await expect(page.getByRole("button", { name: "Назад: популярные модели" })).toBeDisabled();
  await page.getByRole("button", { name: "Вперёд: популярные модели" }).click();
  await expect.poll(() => track.evaluate((el) => el.scrollLeft)).toBeGreaterThan(100);
});

test("V2-10 подвал: навигация по разделам", async ({ page }) => {
  await page.goto("/kontakty/");
  const nav = page.getByRole("navigation", { name: "Разделы сайта" });
  for (const n of ["Каталог", "Услуги", "Лизинг", "Логистика", "О компании", "Контакты"]) await expect(nav.getByRole("link", { name: n, exact: true })).toBeVisible();
});

test.describe("с движением", () => {
  test.use({ reducedMotion: "no-preference" });
  test("V2-11 блоки ниже первого экрана появляются при прокрутке и остаются видимыми", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("html")).toHaveClass(/reveal-on/);
    const card = page.locator("#escort .s-card").first();
    await expect(card).toHaveAttribute("data-reveal", "");
    expect(await card.evaluate((el) => getComputedStyle(el).opacity)).toBe("0");
    await card.scrollIntoViewIfNeeded();
    await expect(card).not.toHaveAttribute("data-reveal", "", { timeout: 3000 });
    expect(await card.evaluate((el) => getComputedStyle(el).opacity)).toBe("1");
    expect(await page.locator("h1").getAttribute("data-reveal")).toBeNull();
  });
});
