// Контраст палитры: после затемнения (2026-11-10) все пары проходят AA. Отдельный тест — по ключевым страницам с перечнем нарушений в логе.
import { test, expect } from "./fixtures.js";
import AxeBuilder from "@axe-core/playwright";

test("CONTRAST палитра оригинала проходит WCAG AA", async ({ page, isMobile }) => {
  test.skip(isMobile, "палитра одна, достаточно десктопа");
  test.setTimeout(60_000); // пять страниц подряд: под нагрузкой полного прогона общий лимит 20 с не укладывался
  const seen = new Set();
  for (const url of ["/", "/katalog/spectehnika/", "/katalog/spectehnika/ekskavator-pogruzchik/ekskavator-pogruzchik-gros-shanmon-388-ii/", "/uslug/servisnye-uslugi/lizing/", "/kontakty/"]) {
    await page.goto(url);
    const r = await new AxeBuilder({ page }).withRules(["color-contrast"]).exclude(".sidebar--white").analyze() // см. fixtures.js и sidebar-tone.spec.js;
    r.violations.forEach((v) => v.nodes.forEach((n) => seen.add(`${n.target.join(" ")} — ${n.any[0]?.data?.contrastRatio}:1 (${n.any[0]?.data?.fgColor} на ${n.any[0]?.data?.bgColor})`)));
  }
  console.log([...seen].join("\n"));
  expect([...seen]).toEqual([]);
});
