import * as sass from "sass";
import path from "node:path";
import fs from "node:fs";
import { EleventyHtmlBasePlugin } from "@11ty/eleventy";

// Префикс адресов: локально и в MODX — "/", на GitHub Pages — "/nordtech-site/" (PATH_PREFIX в .github/workflows/pages.yml).
// Плагин сам дописывает префикс ко всем абсолютным адресам в HTML; в JS префикс берётся из window.NORD_BASE.
const PREFIX = process.env.PATH_PREFIX || "/";
const V2 = process.env.VARIANT === "2";
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
  // Вариант дизайна: 1 — оригинальный UI kit nordtech.su (шаблоны src/),
  // 2 — новая дизайн-система «НОРД Тёмный» с нуля (шаблоны src-v2/, replica/design-v2/DESIGN.md). Данные и фото — общие.
  cfg.addGlobalData("v2", V2);
  cfg.addPassthroughCopy({ "src/assets": "assets" });
  if (V2) {
    cfg.addPassthroughCopy({ "src-v2/js": "js", "src/js/lead-api.js": "js/lead-api.js", "src/js/cursor.js": "js/cursor.js" });
    // Unbounded (заголовки) — из npm-пакета, отдаётся с сайта, без запросов к Google
    for (const sub of ["cyrillic", "latin"]) cfg.addPassthroughCopy({ [`node_modules/@fontsource-variable/unbounded/files/unbounded-${sub}-wght-normal.woff2`]: `fonts/unbounded-${sub}.woff2` });
    cfg.addPassthroughCopy({ "node_modules/@fancyapps/ui/dist/fancybox/fancybox.css": "assets/vendor/fancybox.css" });
    cfg.addWatchTarget("src-v2/scss/");
    // Текст юридических страниц берём из импорта оригинала (src/_includes/original) без разметки kit
    cfg.addFilter("policyBody", (name) => {
      const html = fs.readFileSync(`src/_includes/original/${name}.njk`, "utf8");
      return (html.match(/<div class="policy__content">([\s\S]*?)<\/div>\s*<\/div>\s*<\/section>/) || [, ""])[1];
    });
  } else {
    cfg.addPassthroughCopy({ "src/js": "js" });
  }
  // Те же библиотеки, что на nordtech.su: Swiper (слайдеры) и Fancybox (галерея товара)
  cfg.addPassthroughCopy({ "node_modules/swiper/swiper-bundle.min.js": "assets/template/js/swiper-bundle.min.js" });
  // Карта исходников Swiper: без неё инструменты разработчика пишут 404 в консоль
  cfg.addPassthroughCopy({ "node_modules/swiper/swiper-bundle.min.js.map": "assets/template/js/swiper-bundle.min.js.map" });
  cfg.addPassthroughCopy({ "node_modules/@fancyapps/ui/dist/fancybox/fancybox.umd.js": "assets/template/js/fancybox.umd.js" });
  if (!V2) cfg.addWatchTarget("src/scss/");

  cfg.addTemplateFormats("scss");
  cfg.addExtension("scss", {
    outputFileExtension: "css",
    // В выдачу попадает только main.scss → /css/main.css; партиалы (_*.scss) не публикуются
    compileOptions: {
      cache: false, // app.scss сам не меняется, меняются партиалы — без этого сервер отдаёт старый CSS
      permalink: (contents, inputPath) => {
        const name = path.basename(inputPath);
        if (name === "main.scss") return "/css/main.css";
        if (name === "app.scss") return "/css/app.css"; // вариант 2
        return false;
      },
    },
    compile(input, inputPath) {
      if (path.basename(inputPath).startsWith("_")) return;
      const result = sass.compileString(input, { loadPaths: [path.dirname(inputPath)], style: "expanded" });
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

  return { dir: V2 ? { input: "src-v2", data: "../src/_data", output: "_site" } : { input: "src", output: "_site" }, pathPrefix: PREFIX, markdownTemplateEngine: "njk", htmlTemplateEngine: "njk" };
}
