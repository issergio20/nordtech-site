// UX-аудит по чек-листу ui-ux-pro-max: замеры на всех страницах при 390 и 1440 px.
//   node scripts/audit.mjs [http://localhost:8081] > ../replica/design-alt/audit-v2.json
// Метрики: зоны нажатия (<24 — WCAG 2.5.8, <44 — рекомендация на телефоне), мелкий текст, длина строк,
// пропуски уровней заголовков, картинки без размеров, CLS, элементы под фиксированными панелями,
// иконочные контролы без имени, горизонтальная прокрутка.
import { chromium } from "@playwright/test";

const BASE = process.argv[2] || "http://localhost:8081";
const PAGES = [
  "/", "/katalog/", "/katalog/spectehnika/", "/katalog/spectehnika/frontalnyj-pogruzchik/", "/katalog/nasosy/",
  "/katalog/spectehnika/ekskavator-pogruzchik/ekskavator-pogruzchik-gros-shanmon-388-ii/",
  "/katalog/spectehnika/frontalnyj-pogruzchik/frontalnyj-pogruzchik-lonking-lg833gb/",
  "/rezultaty-poiska/?query=погрузчик", "/o-kompanii/", "/uslug/", "/uslug/servisnye-uslugi/",
  "/uslug/servisnye-uslugi/lizing/", "/logistika/", "/kontakty/", "/politika-konfidencialnosti/",
];

const browser = await chromium.launch();
const report = {};
for (const [vp, size, mobile] of [["mobile", { width: 390, height: 844 }, true], ["desktop", { width: 1440, height: 900 }, false]]) {
  const ctx = await browser.newContext({ viewport: size, isMobile: mobile, hasTouch: mobile, locale: "ru-RU", reducedMotion: "reduce" });
  await ctx.route(/yandex\.ru\/map-widget/, (r) => r.fulfill({ status: 200, contentType: "text/html", body: "" }));
  const page = await ctx.newPage();
  await page.addInitScript(() => {
    window.__cls = 0;
    new PerformanceObserver((l) => l.getEntries().forEach((e) => { if (!e.hadRecentInput) window.__cls += e.value; })).observe({ type: "layout-shift", buffered: true });
  });
  for (const url of PAGES) {
    await page.goto(BASE + url, { waitUntil: "networkidle" });
    await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 600) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)); } scrollTo(0, 0); });
    await page.waitForTimeout(400);
    const r = await page.evaluate((mobile) => {
      const vis = (e) => { const s = getComputedStyle(e); const b = e.getBoundingClientRect(); return s.visibility !== "hidden" && s.display !== "none" && b.width > 0 && b.height > 0 && !e.closest("[hidden],dialog:not([open]),.header-menu:not(.show),.search:not(.show),[aria-hidden=true],.visually-hidden,.hp"); };
      const name = (e) => (e.getAttribute("aria-label") || e.textContent || e.getAttribute("title") || "").trim().replace(/\s+/g, " ").slice(0, 40);
      const sel = (e) => e.tagName.toLowerCase() + (e.className && typeof e.className === "string" ? "." + e.className.trim().split(/\s+/)[0] : "");
      const ctrls = [...document.querySelectorAll("a[href],button,input:not([type=hidden]),select,textarea,[role=button],[tabindex='0']")].filter(vis);
      const small = ctrls.map((e) => { const b = e.getBoundingClientRect(); return { e, w: Math.round(b.width), h: Math.round(b.height) }; });
      const t24 = small.filter((x) => (x.w < 24 || x.h < 24) && !x.e.closest("p, li:not([class]), .policy__content, .breadcrumbs, .footer__cooperating"));
      const t44 = mobile ? small.filter((x) => (x.w < 44 || x.h < 44) && !x.e.closest("p, .policy__content")) : [];
      const texts = [...document.querySelectorAll("body *")].filter((e) => vis(e) && [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 2));
      const tiny = texts.filter((e) => parseFloat(getComputedStyle(e).fontSize) < (mobile ? 14 : 12));
      const bodySmall = mobile ? texts.filter((e) => e.matches("p, li, dd, td") && parseFloat(getComputedStyle(e).fontSize) < 16) : [];
      const longLines = texts.filter((e) => e.matches("p, li") && e.textContent.length > 120).filter((e) => {
        const cs = getComputedStyle(e); const chars = e.getBoundingClientRect().width / (parseFloat(cs.fontSize) * 0.5); return chars > (mobile ? 60 : 85);
      });
      const hs = [...document.querySelectorAll("h1,h2,h3,h4,h5,h6")].filter(vis).map((h) => +h.tagName[1]);
      const skips = hs.filter((l, i) => i > 0 && l - hs[i - 1] > 1).length;
      const imgsNoDim = [...document.images].filter((i) => vis(i) && !(i.getAttribute("width") && i.getAttribute("height")) && getComputedStyle(i).aspectRatio === "auto").map((i) => i.getAttribute("src").split("/").pop());
      const unnamed = ctrls.filter((e) => !name(e) && !e.labels?.length).map(sel);
      const fixed = [...document.querySelectorAll("body *")].filter((e) => vis(e) && ["fixed", "sticky"].includes(getComputedStyle(e).position)).map((e) => ({ sel: sel(e), b: e.getBoundingClientRect() })).filter((f) => f.b.height < innerHeight * 0.5);
      const uppercaseLong = texts.filter((e) => getComputedStyle(e).textTransform === "uppercase" && e.textContent.trim().length > 40 && !e.matches("h1,h2,h3")).length;
      const group = (arr) => Object.entries(arr.reduce((a, x) => { const k = typeof x === "string" ? x : `${sel(x.e || x)}${x.w ? ` ${x.w}×${x.h}` : ""}`; a[k] = (a[k] || 0) + 1; return a; }, {})).map(([k, n]) => (n > 1 ? `${k} ×${n}` : k)).slice(0, 12);
      return {
        overflowX: document.documentElement.scrollWidth > innerWidth,
        cls: +window.__cls.toFixed(3),
        h1: document.querySelectorAll("h1").length,
        headingSkips: skips,
        targetsUnder24: group(t24),
        targetsUnder44: group(t44),
        tinyText: group(tiny),
        bodyUnder16: bodySmall.length,
        longLines: longLines.length,
        uppercaseLongText: uppercaseLong,
        imgsWithoutSize: imgsNoDim.slice(0, 8),
        controlsWithoutName: unnamed.slice(0, 8),
        fixedElements: fixed.map((f) => `${f.sel} h=${Math.round(f.b.height)}`),
        pageHeight: document.documentElement.scrollHeight,
      };
    }, mobile);
    (report[url] ||= {})[vp] = r;
  }
  await ctx.close();
}
await browser.close();
console.log(JSON.stringify(report, null, 1));
