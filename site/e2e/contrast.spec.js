// Контраст палитры оригинала. Тест помечен как «ожидаемо падает»: он фиксирует известные нарушения AA,
// пока заказчик не решит, затемнять ли цвета. Если цвета исправят — тест начнёт проходить и Playwright попросит снять пометку.
import { test, expect } from "./fixtures.js";
import AxeBuilder from "@axe-core/playwright";

test("CONTRAST палитра оригинала проходит WCAG AA", async ({ page, isMobile }) => {
  test.skip(isMobile, "палитра одна, достаточно десктопа");
  test.fail(true, "Известно: белый на #217bc5, статусы #2cae8a/#e1a13e, серые крошки и ссылки подвала < 4.5:1 — см. replica/parity.md");
  const seen = new Set();
  for (const url of ["/", "/katalog/spectehnika/", "/katalog/spectehnika/ekskavator-pogruzchik/ekskavator-pogruzchik-gros-shanmon-388-ii/", "/uslug/servisnye-uslugi/lizing/", "/kontakty/"]) {
    await page.goto(url);
    const r = await new AxeBuilder({ page }).withRules(["color-contrast"]).analyze();
    r.violations.forEach((v) => v.nodes.forEach((n) => seen.add(`${n.target.join(" ")} — ${n.any[0]?.data?.contrastRatio}:1 (${n.any[0]?.data?.fgColor} на ${n.any[0]?.data?.bgColor})`)));
  }
  console.log([...seen].join("\n"));
  expect([...seen]).toEqual([]);
});
