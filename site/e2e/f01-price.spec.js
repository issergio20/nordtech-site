// F01 — узнать стоимость техники через каталог (главный сценарий)
import { test, expect, axe, PRODUCT, THIN_PRODUCT, fillLead } from "./fixtures.js";

test.describe("F01 узнать стоимость", () => {
  test("F01-H1 каталог → раздел → подраздел → товар → заявка", async ({ page, guard, isMobile }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Перейти в каталог" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Каталог" })).toBeVisible();
    await page.getByRole("link", { name: /^Спецтехника/ }).first().click();
    await expect(page.getByRole("heading", { level: 1, name: "Спецтехника" })).toBeVisible();
    await page.getByRole("navigation", { name: "Подразделы" }).getByRole("link", { name: /Экскаваторы-погрузчики/ }).click();
    await page.getByRole("link", { name: "Экскаватор-погрузчик GROS (SHANMON) 388-II" }).click();
    await expect(page).toHaveURL(PRODUCT);

    await page.locator(".product__ctas").getByRole("button", { name: "Узнать стоимость" }).click();
    const dlg = page.getByRole("dialog", { name: "Узнать стоимость" });
    await expect(dlg).toBeVisible();
    await expect(dlg.getByLabel("Техника")).toHaveValue("Экскаватор-погрузчик GROS (SHANMON) 388-II");
    await expect(dlg.getByLabel("Как к вам обращаться")).toBeFocused();
    await fillLead(page);
    await expect(dlg.getByLabel("Телефон")).toHaveValue("+7 (914) 350-41-41");
    await dlg.getByRole("button", { name: "Узнать цену" }).click();
    await expect(dlg.getByRole("heading", { name: "Заявка принята" })).toBeVisible();
    expect(guard.leads).toHaveLength(1);
    expect(guard.leads[0]).toContain("ekskavator-pogruzchik-gros-shanmon-388-ii");
  });

  test("F01-H2 с главной через «Чаще всего берут»", async ({ page, guard }) => {
    await page.goto("/");
    const slider = page.getByRole("region", { name: "Популярные модели" });
    await slider.getByRole("button", { name: /Узнать стоимость: .*LG833GB$/ }).first().click();
    await expect(page.getByRole("dialog").getByLabel("Техника")).toHaveValue("Фронтальный погрузчик Lonking LG833GB");
    await fillLead(page);
    await page.getByRole("dialog").getByRole("button", { name: "Узнать цену" }).click();
    await expect(page.getByRole("heading", { name: "Заявка принята" })).toBeVisible();
    expect(guard.leads).toHaveLength(1);
  });

  test("F01-E1 пустая форма — три ошибки, фокус на первой", async ({ page, guard }) => {
    await page.goto(PRODUCT);
    await page.locator(".product__ctas").getByRole("button", { name: "Узнать стоимость" }).click();
    const dlg = page.getByRole("dialog");
    await dlg.getByRole("button", { name: "Узнать цену" }).click();
    await expect(dlg.getByText("Напишите, как к вам обращаться")).toBeVisible();
    await expect(dlg.getByText("Введите номер полностью: +7 и 10 цифр")).toBeVisible();
    await expect(dlg.getByText("Без согласия мы не сможем обработать заявку")).toBeVisible();
    await expect(dlg.getByLabel("Как к вам обращаться")).toBeFocused();
    await expect(dlg.getByLabel("Как к вам обращаться")).toHaveAttribute("aria-invalid", "true");
    expect(guard.leads).toHaveLength(0);
  });

  test("F01-E2 неполный телефон и без согласия — заявка не уходит", async ({ page, guard }) => {
    await page.goto(PRODUCT);
    await page.locator(".product__ctas").getByRole("button", { name: "Узнать стоимость" }).click();
    await fillLead(page, { phone: "914350", consent: false });
    await page.getByRole("dialog").getByRole("button", { name: "Узнать цену" }).click();
    await expect(page.getByText("Введите номер полностью: +7 и 10 цифр")).toBeVisible();
    await expect(page.getByText("Без согласия мы не сможем обработать заявку")).toBeVisible();
    expect(guard.leads).toHaveLength(0);
  });

  test("F01-E3 двойной клик — одна заявка", async ({ page, guard }) => {
    await page.goto(PRODUCT);
    await page.locator(".product__ctas").getByRole("button", { name: "Узнать стоимость" }).click();
    await fillLead(page);
    const submit = page.getByRole("dialog").getByRole("button", { name: "Узнать цену" });
    await submit.dblclick();
    await expect(page.getByRole("heading", { name: "Заявка принята" })).toBeVisible();
    expect(guard.leads).toHaveLength(1);
  });

  test("F01-E4 длинное имя, эмодзи и латиница", async ({ page, guard }) => {
    await page.goto(PRODUCT);
    await page.locator(".product__ctas").getByRole("button", { name: "Узнать стоимость" }).click();
    await fillLead(page, { name: "Ёлкин-Щербакова Анна-Мария 🚜 ".repeat(8) });
    await page.getByRole("dialog").getByRole("button", { name: "Узнать цену" }).click();
    await expect(page.getByRole("heading", { name: "Заявка принята" })).toBeVisible();
    expect(guard.leads).toHaveLength(1);
  });

  test("F01-E5 Esc закрывает окно, фокус возвращается на кнопку", async ({ page }) => {
    await page.goto(PRODUCT);
    const open = page.locator(".product__ctas").getByRole("button", { name: "Узнать стоимость" });
    await open.click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toBeHidden();
    await expect(open).toBeFocused();
  });

  test("F01-E6 только клавиатура: от кнопки до отправки", async ({ page, guard, isMobile }) => {
    test.skip(isMobile, "клавиатурный сценарий — на десктопе");
    await page.goto(PRODUCT);
    await page.locator(".product__ctas").getByRole("button", { name: "Узнать стоимость" }).focus();
    await page.keyboard.press("Enter");
    await page.keyboard.type("Сергей");
    await page.keyboard.press("Tab");
    await page.keyboard.type("9143504141");
    // Техника (readonly) → Филиал → Согласие → ссылка на условия → Отправить
    for (let i = 0; i < 3; i++) await page.keyboard.press("Tab");
    await expect(page.getByRole("checkbox", { name: /Согласен/ })).toBeFocused();
    await page.keyboard.press("Space");
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    await expect(page.getByRole("dialog").getByRole("button", { name: "Узнать цену" })).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("heading", { name: "Заявка принята" })).toBeVisible();
    expect(guard.leads).toHaveLength(1);
  });

  test("F01-E7 повторное открытие — форма чистая, новый токен", async ({ page, guard }) => {
    await page.goto(PRODUCT);
    const open = page.locator(".product__ctas").getByRole("button", { name: "Узнать стоимость" });
    await open.click();
    await fillLead(page);
    await page.getByRole("dialog").getByRole("button", { name: "Узнать цену" }).click();
    await page.getByRole("button", { name: "Хорошо" }).click();
    await open.click();
    await expect(page.getByRole("dialog").getByLabel("Как к вам обращаться")).toHaveValue("");
    await fillLead(page, { name: "Второй" });
    await page.getByRole("dialog").getByRole("button", { name: "Узнать цену" }).click();
    await expect(page.getByRole("heading", { name: "Заявка принята" })).toBeVisible();
    expect(guard.leads).toHaveLength(2);
  });

  test("F01-N1 сбой отправки — уведомление, форма сохранена", async ({ page, guard }) => {
    await page.goto(PRODUCT);
    await page.locator(".product__ctas").getByRole("button", { name: "Узнать стоимость" }).click();
    await fillLead(page, { name: "ошибка" }); // заглушка отвечает сбоем на это имя
    await page.getByRole("dialog").getByRole("button", { name: "Узнать цену" }).click();
    await expect(page.getByRole("alert")).toContainText("Не удалось отправить");
    await expect(page.getByRole("dialog").getByLabel("Телефон")).toHaveValue("+7 (914) 350-41-41");
    expect(guard.leads).toHaveLength(0);
  });

  test("F01-E11 исправление цифры в середине телефона — курсор не прыгает в конец (BUG-001)", async ({ page }) => {
    await page.goto(PRODUCT);
    await page.locator(".product__ctas").getByRole("button", { name: "Узнать стоимость" }).click();
    const phone = page.getByRole("dialog").getByLabel("Телефон");
    await phone.pressSequentially("9143504141", { delay: 5 });
    await expect(phone).toHaveValue("+7 (914) 350-41-41");
    await phone.evaluate((el) => el.setSelectionRange(5, 5)); // курсор после «9»
    await page.keyboard.press("Backspace");
    await page.keyboard.type("8");
    await expect(phone).toHaveValue("+7 (814) 350-41-41");
  });

  test("F01-E8 карточка без характеристик — предложение запросить", async ({ page }) => {
    await page.goto(THIN_PRODUCT);
    await expect(page.getByRole("button", { name: "Запросить характеристики" })).toBeVisible();
    await page.getByRole("button", { name: "Запросить характеристики" }).click();
    await expect(page.getByRole("dialog", { name: "Вопрос по технике" })).toBeVisible();
  });

  test("F01-E9 пустой раздел — понятная заглушка с действием", async ({ page }) => {
    await page.goto("/katalog/nasosy/");
    await expect(page.getByText("Скоро здесь появится техника")).toBeVisible();
    await page.getByRole("button", { name: "Подобрать технику" }).click();
    await expect(page.getByRole("dialog", { name: "Консультация" })).toBeVisible();
  });

  test("F01-E10 фильтр по бренду и счётчик", async ({ page }) => {
    await page.goto("/katalog/spectehnika/");
    await expect(page.getByText("6 моделей")).toBeVisible();
    await page.getByRole("group", { name: "Бренд" }).getByRole("checkbox", { name: "SHANMON" }).check();
    await expect(page.getByText("1 модель")).toBeVisible();
    await expect(page.locator("[data-cards] > .card:visible")).toHaveCount(1);
  });

  test("F01-A11Y окно заявки без нарушений", async ({ page }) => {
    await page.goto(PRODUCT);
    await page.locator(".product__ctas").getByRole("button", { name: "Узнать стоимость" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Узнать цену" }).click(); // с ошибками
    expect(await axe(page)).toEqual([]);
  });
});
