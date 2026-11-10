// F02 консультация, F03 лизинг, F04 поиск, F05 контакты, F06 вопрос по товару
import { test, expect, PRODUCT, fillLead } from "./fixtures.js";

test("F02-H1 консультация из подвала", async ({ page, guard }) => {
  await page.goto("/o-kompanii/");
  await page.getByRole("contentinfo").getByRole("button", { name: "Получить консультацию" }).click();
  const dlg = page.getByRole("dialog", { name: "Консультация" });
  await expect(dlg.getByLabel("Техника")).toBeHidden();
  await expect(dlg.getByLabel(/Комментарий/)).toBeVisible();
  await fillLead(page);
  await dlg.getByLabel(/Комментарий/).fill("Нужен погрузчик на карьер, 3 смены");
  await dlg.getByRole("button", { name: "Получить консультацию" }).click();
  await expect(page.getByRole("heading", { name: "Заявка принята" })).toBeVisible();
  expect(guard.leads).toHaveLength(1);
  expect(guard.leads[0]).toContain("consultation");
});

test("F03-H1 заявка на лизинг со страницы лизинга", async ({ page, guard }) => {
  await page.goto("/uslug/servisnye-uslugi/lizing/");
  await page.getByRole("button", { name: "Рассчитать лизинг" }).first().click();
  const dlg = page.getByRole("dialog", { name: "Заявка на лизинг" });
  await fillLead(page);
  await dlg.getByLabel("Ближайший филиал").selectOption({ label: "Магадан" });
  await dlg.getByRole("button", { name: "Рассчитать лизинг" }).click();
  await expect(page.getByRole("heading", { name: "Заявка принята" })).toBeVisible();
  expect(guard.leads[0]).toContain("leasing");
});

test("F03-H2 лизинг с карточки товара — товар подставлен", async ({ page }) => {
  await page.goto(PRODUCT);
  await page.getByRole("button", { name: "Купить в лизинг" }).click();
  await expect(page.getByRole("dialog", { name: "Заявка на лизинг" }).getByLabel("Техника")).toHaveValue(/388-II/);
});

test("F03-E1 сроки на странице лизинга не противоречат друг другу", async ({ page }) => {
  await page.goto("/uslug/servisnye-uslugi/lizing/");
  await expect(page.getByText("Даём предварительное решение и расчёт платежа")).toBeVisible();
  await expect(page.getByText("3–5 рабочих дней")).toBeVisible();
});

test("F04-H1 поиск из шапки по русскому названию бренда", async ({ page, isMobile }) => {
  if (isMobile) {
    await page.goto("/");
    await page.getByRole("navigation", { name: "Быстрые разделы" }).getByRole("link", { name: "Поиск" }).click();
    await page.getByLabel("Что ищем").fill("лонкинг");
    await page.getByRole("button", { name: "Найти" }).click();
  } else {
    await page.goto("/");
    await page.getByRole("button", { name: "Найти" }).click(); // первый клик раскрывает поле
    await expect(page.getByLabel("Поиск по каталогу")).toBeFocused();
    await page.getByLabel("Поиск по каталогу").fill("лонкинг");
    await page.keyboard.press("Enter");
  }
  await expect(page.getByText("По запросу «лонкинг» — 5 моделей")).toBeVisible();
});

test("F04-E1 пустая выдача — заглушка с подбором", async ({ page }) => {
  await page.goto("/rezultaty-poiska/?query=трактор");
  await expect(page.getByText("Ничего не нашли")).toBeVisible();
});

test("F04-E2 поиск без запроса — подсказка, без пустой ошибки", async ({ page }) => {
  await page.goto("/rezultaty-poiska/");
  await expect(page.getByText("Введите модель, бренд или тип техники.")).toBeVisible();
});

test("F04-E3 спецсимволы в запросе не ломают страницу", async ({ page }) => {
  await page.goto("/rezultaty-poiska/?query=" + encodeURIComponent('<img src=x onerror=alert(1)> "ёж'));
  await expect(page.getByText("Ничего не нашли")).toBeVisible();
  await expect(page.locator("img[src=x]")).toHaveCount(0);
});

test("F05-H1 контакты: телефоны кликабельны, три филиала и представитель", async ({ page }) => {
  await page.goto("/kontakty/");
  for (const city of ["Чита", "Иркутск", "Магадан", "Маньчжурия, Китай"]) {
    await expect(page.getByRole("heading", { name: city })).toBeVisible();
  }
  await expect(page.getByRole("link", { name: "+7 914 350-41-41" })).toHaveAttribute("href", "tel:+79143504141");
  await expect(page.getByRole("heading", { name: "Маньчжурия, Китай" })).toHaveCount(1); // без дубля
});

test("F06-H1 вопрос по товару", async ({ page, guard }) => {
  await page.goto(PRODUCT);
  await page.getByRole("button", { name: "Задать вопрос" }).click();
  const dlg = page.getByRole("dialog", { name: "Вопрос по технике" });
  await fillLead(page);
  await dlg.getByLabel(/Комментарий/).fill("Есть ли в наличии в Иркутске?");
  await dlg.getByRole("button", { name: "Отправить вопрос" }).click();
  await expect(page.getByRole("heading", { name: "Заявка принята" })).toBeVisible();
  expect(guard.leads[0]).toContain("question");
});

test("NAV-H1 меню каталога: открыть, Esc, фокус назад", async ({ page, isMobile }) => {
  test.skip(isMobile, "кнопка «Каталог» в шапке — на десктопе; на мобильном — нижняя панель");
  await page.goto("/");
  const btn = page.getByRole("button", { name: "Каталог", exact: true });
  await btn.click();
  await expect(btn).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator("#catalog-menu").getByRole("link", { name: /Фронтальные погрузчики/ })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(btn).toHaveAttribute("aria-expanded", "false");
  await expect(btn).toBeFocused();
});

test("NAV-H2 мобильное меню открывается бургером", async ({ page, isMobile }) => {
  test.skip(!isMobile, "только мобильный");
  await page.goto("/");
  await page.getByRole("button", { name: "Меню" }).click();
  await expect(page.getByRole("navigation", { name: "Меню сайта" }).getByRole("link", { name: "Контакты" })).toBeVisible();
});
