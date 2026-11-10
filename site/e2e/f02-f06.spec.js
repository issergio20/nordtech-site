// F02 консультация, F03 лизинг, F04 поиск, F05 контакты, F06 вопрос по товару, навигация — на разметке оригинала
import { test, expect, PRODUCT, fillLead } from "./fixtures.js";

test("F02-H1 консультация с первого экрана", async ({ page, guard }) => {
  await page.goto("/");
  await page.locator(".about").getByRole("button", { name: "Получить консультацию" }).click();
  const dlg = page.getByRole("dialog", { name: "Получить консультацию" });
  await expect(dlg.getByLabel("Название товара")).toBeHidden();
  await expect(dlg.getByLabel("Комментарий")).toBeVisible();
  await fillLead(page);
  await dlg.getByLabel("Комментарий").fill("Нужен погрузчик на карьер, 3 смены");
  await dlg.getByRole("button", { name: "Получить консультацию" }).click();
  await expect(page.getByRole("heading", { name: "Заявка принята" })).toBeVisible();
  expect(guard.leads).toHaveLength(1);
  expect(guard.leads[0]).toContain("consultation");
});

test("F03-H1 заявка на лизинг со страницы лизинга (ссылка оригинала #modal-application)", async ({ page, guard }) => {
  await page.goto("/uslug/servisnye-uslugi/lizing/");
  await page.getByRole("button", { name: "заявка на лизинг" }).first().click();
  const dlg = page.getByRole("dialog", { name: "Заявка на лизинг" });
  await fillLead(page);
  await dlg.getByLabel("Ближайший филиал").selectOption({ label: "Магадан" });
  await dlg.getByRole("button", { name: "Оставить заявку" }).click();
  await expect(page.getByRole("heading", { name: "Заявка принята" })).toBeVisible();
  expect(guard.leads[0]).toContain("leasing");
});

test("F03-H2 лизинг из блока на главной", async ({ page, isMobile }) => {
  test.skip(isMobile, "на мобильном оригинал прячет кнопку в блоке лизинга — заявка со страницы лизинга (F03-H1)");
  await page.goto("/");
  await page.locator("#leasing").getByRole("button", { name: "заявка на лизинг" }).click();
  await expect(page.getByRole("dialog", { name: "Заявка на лизинг" })).toBeVisible();
});

test("F03-E1 сроки на странице лизинга не противоречат друг другу", async ({ page }) => {
  await page.goto("/uslug/servisnye-uslugi/lizing/");
  await expect(page.getByText("Предварительное решение — в течение 2 часов")).toBeVisible();
  await expect(page.getByText(/3–5 рабочих дней/)).toBeVisible();
  await expect(page.getByText(/одобрим ее в течени/)).toHaveCount(0);
});

test("F04-H1 поиск через оверлей с подсказками", async ({ page, isMobile }) => {
  await page.goto("/");
  if (isMobile) await page.getByRole("navigation", { name: "Быстрые разделы" }).getByRole("link", { name: "Поиск" }).click();
  else await page.getByRole("button", { name: "Открыть поиск" }).click();
  const input = page.getByLabel("Поиск по каталогу");
  await expect(input).toBeFocused();
  await input.fill("лонкинг");
  await expect(page.locator("[data-search-suggest]").getByRole("link", { name: /Lonking LG863G/ })).toBeVisible();
  await input.press("Enter");
  await expect(page.getByText("По запросу «лонкинг» — 5 моделей")).toBeVisible();
});

test("F04-E1 пустая выдача — заглушка с подбором", async ({ page }) => {
  await page.goto("/rezultaty-poiska/?query=трактор");
  await expect(page.getByText("Ничего не нашли")).toBeVisible();
});

test("F04-E2 поиск без запроса — подсказка", async ({ page }) => {
  await page.goto("/rezultaty-poiska/");
  await expect(page.getByText("Введите модель, бренд или тип техники.")).toBeVisible();
});

test("F04-E3 спецсимволы в запросе не ломают страницу", async ({ page }) => {
  await page.goto("/rezultaty-poiska/?query=" + encodeURIComponent('<img src=x onerror=alert(1)> "ёж'));
  await expect(page.getByText("Ничего не нашли")).toBeVisible();
  await expect(page.locator("img[src=x]")).toHaveCount(0);
});

test("F04-E4 Esc закрывает оверлей поиска", async ({ page, isMobile }) => {
  test.skip(isMobile, "кнопка поиска в шапке — на десктопе");
  await page.goto("/");
  const open = page.getByRole("button", { name: "Открыть поиск" });
  await open.click();
  await expect(page.locator("#site-search")).toHaveClass(/show/);
  await page.keyboard.press("Escape");
  await expect(page.locator("#site-search")).not.toHaveClass(/show/);
  await expect(open).toBeFocused();
});

test("F05-H1 контакты: филиалы, телефоны, представитель в Китае без дубля, карта переключается", async ({ page }) => {
  await page.goto("/kontakty/");
  for (const city of ["Чита", "Иркутск", "Магадан"]) await expect(page.getByRole("heading", { name: city })).toBeVisible();
  await expect(page.getByRole("link", { name: "+7 914 350 41 41" })).toHaveAttribute("href", "tel:+79143504141");
  await expect(page.locator(".contacts-china__item")).toHaveCount(1);
  await page.getByRole("button", { name: "Показать Магадан на карте" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("[data-map]")).toHaveAttribute("src", /150\.803555/);
});

test("F06-H1 вопрос по товару", async ({ page, guard }) => {
  await page.goto(PRODUCT);
  await page.locator(".product__buttons").getByRole("button", { name: "Задать вопрос" }).click();
  const dlg = page.getByRole("dialog", { name: "Задать вопрос" });
  await fillLead(page);
  await dlg.getByLabel("Комментарий").fill("Есть ли в наличии в Иркутске?");
  await dlg.getByRole("button", { name: "Отправить вопрос" }).click();
  await expect(page.getByRole("heading", { name: "Заявка принята" })).toBeVisible();
  expect(guard.leads[0]).toContain("question");
});

test("NAV-H1 «Каталог» в шапке ведёт в каталог, «Услуги» раскрываются", async ({ page, isMobile }) => {
  test.skip(isMobile, "шапка с меню — на десктопе");
  await page.goto("/kontakty/");
  await page.getByRole("banner").getByRole("link", { name: "Каталог" }).click();
  await expect(page).toHaveURL("/katalog/");
  await page.getByRole("banner").getByRole("link", { name: "Услуги", exact: true }).hover();
  await expect(page.getByRole("link", { name: "Сервисные услуги" })).toBeVisible();
});

test("NAV-H2 мобильное меню: бургер, Esc, фокус назад", async ({ page, isMobile }) => {
  test.skip(!isMobile, "только мобильный");
  await page.goto("/");
  const burger = page.getByRole("button", { name: "Меню" });
  await burger.click();
  await expect(burger).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByRole("navigation", { name: "Меню сайта" }).getByRole("link", { name: "Контакты" })).toBeInViewport();
  await page.keyboard.press("Escape");
  await expect(burger).toHaveAttribute("aria-expanded", "false");
  await expect(burger).toBeFocused();
});

test("FAQ на «О компании» раскрывается с клавиатуры", async ({ page }) => {
  await page.goto("/o-kompanii/");
  const q = page.locator(".faq__item-button").first();
  await q.focus();
  await page.keyboard.press("Enter");
  await expect(q).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator(".faq__item-content").first()).toBeVisible();
});
