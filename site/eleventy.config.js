import * as sass from "sass";
import path from "node:path";
import { EleventyHtmlBasePlugin } from "@11ty/eleventy";

// Префикс адресов: локально и в MODX — "/", на GitHub Pages — "/nordtech-site/" (PATH_PREFIX в .github/workflows/pages.yml).
// Плагин сам дописывает префикс ко всем абсолютным адресам в HTML; в JS префикс берётся из window.NORD_BASE.
const PREFIX = process.env.PATH_PREFIX || "/";
const withPrefix = (u) => (u.startsWith("/") ? PREFIX.replace(/\/$/, "") + u : u);

export default function (cfg) {
  cfg.addPlugin(EleventyHtmlBasePlugin);
  cfg.addGlobalData("base", PREFIX);
  // Плагин не трогает <use href> у SVG-иконок из спрайта — дописываем префикс сами.
  // Eleventy 3: путь выходного файла — в this.page.outputPath (не вторым аргументом)
  if (PREFIX !== "/") {
    cfg.addTransform("svg-use-prefix", function (content) {
      const out = this.page?.outputPath || "";
      return out.endsWith(".html") ? content.replace(/(<use\b[^>]*\shref=")\/(?!\/)/g, `$1${PREFIX}`) : content;
    });
  }
  // Демо на GitHub Pages закрываем от поисковиков, чтобы не конкурировать с настоящим nordtech.su
  cfg.addGlobalData("isDemo", !!process.env.DEMO);
  // Вариант дизайна: 1 — оригинальный UI kit nordtech.su, 2 — тот же kit с улучшенной подачей (replica/design-alt/DESIGN.md)
  cfg.addGlobalData("v2", process.env.VARIANT === "2");
  cfg.addPassthroughCopy({ "src/js": "js", "src/assets": "assets" });
  // Те же библиотеки, что на nordtech.su: Swiper (слайдеры) и Fancybox (галерея товара)
  cfg.addPassthroughCopy({ "node_modules/swiper/swiper-bundle.min.js": "assets/template/js/swiper-bundle.min.js" });
  // Карта исходников Swiper: без неё инструменты разработчика пишут 404 в консоль
  cfg.addPassthroughCopy({ "node_modules/swiper/swiper-bundle.min.js.map": "assets/template/js/swiper-bundle.min.js.map" });
  cfg.addPassthroughCopy({ "node_modules/@fancyapps/ui/dist/fancybox/fancybox.umd.js": "assets/template/js/fancybox.umd.js" });
  cfg.addWatchTarget("src/scss/");

  cfg.addTemplateFormats("scss");
  cfg.addExtension("scss", {
    outputFileExtension: "css",
    // В выдачу попадает только main.scss → /css/main.css; партиалы (_*.scss) не публикуются
    compileOptions: {
      permalink: (contents, inputPath) => {
        const name = path.basename(inputPath);
        if (name === "main.scss") return "/css/main.css";
        if (name === "v2.scss") return process.env.VARIANT === "2" ? "/css/v2.css" : false;
        return false;
      },
    },
    compile(input, inputPath) {
      if (path.basename(inputPath).startsWith("_")) return;
      const result = sass.compileString(input, { loadPaths: ["src/scss"], style: "expanded" });
      return () => result.css;
    },
  });

  // 1 товар, 2 товара, 5 товаров
  cfg.addFilter("plural", (n, one, few, many) => {
    const a = Math.abs(n) % 100, b = a % 10;
    const w = a > 10 && a < 20 ? many : b > 1 && b < 5 ? few : b === 1 ? one : many;
    return `${n} ${w}`;
  });
  cfg.addFilter("json", (v) => JSON.stringify(v));
  // Заглавная первая буква без изменения остальных (в отличие от встроенного capitalize)
  const cap = (t) => (t ? t[0].toUpperCase() + t.slice(1) : t);
  cfg.addFilter("cap", cap);
  cfg.addFilter("capitalizeTitles", (items) => items.map((i) => ({ ...i, title: cap(i.title) })));
  // Индекс для поиска-заглушки: в MODX его заменит mSearch2 с морфологией
  cfg.addFilter("searchIndex", (products) =>
    JSON.stringify(products.map((p) => ({
      slug: p.slug,
      url: withPrefix(p.url),
      title: p.title,
      thumb: withPrefix(p.thumb),
      text: [p.title, p.vendor, p.categoryTitle, ...p.specs.map((s) => s.value)].join(" "),
    }))).replace(/</g, "\\u003c"));
  cfg.addFilter("year", () => new Date().getFullYear());

  return { dir: { input: "src", output: "_site" }, pathPrefix: PREFIX, markdownTemplateEngine: "njk", htmlTemplateEngine: "njk" };
}
