import * as sass from "sass";
import path from "node:path";

export default function (cfg) {
  cfg.addPassthroughCopy({ "src/js": "js", "src/img": "img" });
  cfg.addWatchTarget("src/scss/");

  cfg.addTemplateFormats("scss");
  cfg.addExtension("scss", {
    outputFileExtension: "css",
    // В выдачу попадает только main.scss → /css/main.css; партиалы (_*.scss) не публикуются
    compileOptions: {
      permalink: (contents, inputPath) => (path.basename(inputPath) === "main.scss" ? "/css/main.css" : false),
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
  // Индекс для поиска-заглушки: в MODX его заменит mSearch2 с морфологией
  cfg.addFilter("searchIndex", (products) =>
    JSON.stringify(products.map((p) => ({
      slug: p.slug,
      text: [p.title, p.vendor, p.categoryTitle, ...p.specs.map((s) => s.value)].join(" "),
    }))).replace(/</g, "\\u003c"));
  cfg.addFilter("year", () => new Date().getFullYear());

  return { dir: { input: "src", output: "_site" }, markdownTemplateEngine: "njk", htmlTemplateEngine: "njk" };
}
