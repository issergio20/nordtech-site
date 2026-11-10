// Общие проверки для всех спеков: ошибки консоли, ответы 5xx, сканер доступности, счётчик заявок заглушки.
import { test as base, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

export const test = base.extend({
  guard: [async ({ page }, use) => {
    const problems = [];
    const leads = [];
    page.on("console", (m) => {
      if (m.type() === "error") problems.push(`console: ${m.text()}`);
      if (m.text().startsWith("[lead:fake] сохранена заявка")) leads.push(m.text());
    });
    page.on("pageerror", (e) => problems.push(`pageerror: ${e.message}`));
    page.on("response", (r) => { if (r.status() >= 500) problems.push(`${r.status()} ${r.url()}`); });
    // Внешние шрифты в тестах не нужны: обрываем, чтобы не зависеть от сети
    await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.fulfill({ status: 200, contentType: "text/css", body: "" }));
    const g = { leads, ignore: [] };
    await use(g);
    const real = problems.filter((p) => !g.ignore.some((re) => re.test(p)));
    expect(real, "ошибки в консоли или 5xx").toEqual([]);
  }, { auto: true }],
});

export { expect };

export async function axe(page, exclude = []) {
  let b = new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]);
  for (const sel of exclude) b = b.exclude(sel);
  const res = await b.analyze();
  return res.violations.map((v) => `${v.id} (${v.impact}): ${v.nodes.slice(0, 3).map((n) => n.target.join(" ")).join(" | ")}`);
}

export const PRODUCT = "/katalog/spectehnika/ekskavator-pogruzchik/ekskavator-pogruzchik-gros-shanmon-388-ii/";
export const THIN_PRODUCT = "/katalog/spectehnika/frontalnyj-pogruzchik/frontalnyj-pogruzchik-lonking-lg833gb/";

export async function fillLead(page, { name = "Сергей Тестов", phone = "9143504141", consent = true } = {}) {
  const dlg = page.getByRole("dialog");
  await dlg.getByLabel("Как к вам обращаться").fill(name);
  await dlg.getByLabel("Телефон").pressSequentially(phone, { delay: 5 });
  if (consent) await dlg.getByRole("checkbox", { name: /Согласен/ }).check();
  return dlg;
}
