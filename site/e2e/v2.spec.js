// Только для варианта 2 (VARIANT=2 npx playwright test): улучшения из replica/design-alt/DESIGN.md
import { test, expect, PRODUCT } from "./fixtures.js";

test.skip(process.env.VARIANT !== "2", "тесты варианта 2");

test("V2-1 подписи полей всегда над полем, обязательные отмечены", async ({ page }) => {
  await page.goto(PRODUCT);
  await page.locator(".product__buttons").getByRole("button", { name: "Узнать стоимость" }).click();
  const field = page.getByRole("dialog").locator(".ui-input").first();
  const label = field.locator(".ui-input__label"), input = field.locator(".ui-input__input");
  const [lb, ib] = [await label.boundingBox(), await input.boundingBox()];
  expect(lb.y + lb.height).toBeLessThanOrEqual(ib.y + 1); // подпись выше поля, не внутри
  expect(await label.evaluate((el) => getComputedStyle(el, "::after").content)).toContain("*");
});

test("V2-2 в окне заявки есть Telegram", async ({ page }) => {
  await page.goto("/");
  await page.locator(".about").getByRole("button", { name: "Получить консультацию" }).click();
  await expect(page.getByRole("dialog").getByRole("link", { name: "Написать в Telegram" })).toHaveAttribute("href", /t\.me/);
});

test("V2-3 на главной блок «Официальный дилер» с сертификатами", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Официальный дилер" })).toBeVisible();
  await expect(page.locator(".trust__certs img")).toHaveCount(2);
});

test("V2-4 партнёры не прокручиваются сами", async ({ page }) => {
  await page.goto("/");
  await page.waitForFunction(() => document.querySelector(".partners__slider")?.swiper);
  expect(await page.evaluate(() => document.querySelector(".partners__slider").swiper.autoplay.running)).toBe(false);
});

test("V2-5 липкая кнопка на телефоне — только когда основные кнопки ушли с экрана", async ({ page, isMobile, guard }) => {
  test.skip(!isMobile, "только телефон");
  await page.goto(PRODUCT);
  const sticky = page.locator("[data-sticky-cta]");
  await expect(sticky).not.toHaveClass(/is-visible/);
  await page.locator(".product__specifications").scrollIntoViewIfNeeded();
  await page.mouse.wheel(0, 800);
  await expect(sticky).toHaveClass(/is-visible/);
  await sticky.getByRole("button", { name: "Узнать цену" }).click();
  await expect(page.getByRole("dialog", { name: "Оформить заявку" }).getByLabel("Название товара")).toHaveValue(/388-II/);
});

test("V2-6 на телефоне видны «Перейти в каталог» и заявка на лизинг", async ({ page, isMobile }) => {
  test.skip(!isMobile, "только телефон");
  await page.goto("/");
  await expect(page.getByRole("link", { name: "Перейти в каталог" })).toBeVisible();
  await page.locator("#leasing").scrollIntoViewIfNeeded();
  await expect(page.locator("#leasing").getByRole("button", { name: "заявка на лизинг" })).toBeVisible();
});

test("V2-7 секции главной не растянуты на весь экран", async ({ page, isMobile }) => {
  test.skip(isMobile, "проверка раскладки на десктопе");
  await page.goto("/");
  const h = await page.locator("#stages-work").evaluate((el) => el.getBoundingClientRect().height);
  expect(h).toBeLessThan(900); // в варианте 1 — ровно 100vh
});
