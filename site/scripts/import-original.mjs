// Импорт статичных страниц из сохранённой разметки nordtech.su (replica/nord-source/html) в шаблоны сайта.
// Разметка и классы — как в оригинале, поверх — исправления из replica/recon.md и replica/bugs.md.
//   node scripts/import-original.mjs
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const src = (f) => fileURLToPath(new URL(`../../replica/nord-source/html/${f}.pretty.html`, import.meta.url));
const out = (f) => fileURLToPath(new URL(`../src/_includes/original/${f}.njk`, import.meta.url));

function mainInner(html) {
  const m = html.match(/<main[^>]*>([\s\S]*?)<\/main>/);
  if (!m) throw new Error("нет <main>");
  return m[1];
}

// Общие правки для всех импортированных страниц
function common(h) {
  return h
    .replace(/xlink:href=/g, "href=")
    .replace(/(src|poster|href)="assets\//g, '$1="/assets/')
    .replace(/href="(katalog|uslug|o-kompanii|kontakty|logistika)/g, 'href="/$1')
    // внутренние ссылки без слэша на конце → со слэшем (как отдаёт прототип; в MODX — без слэша)
    .replace(/href="(\/[a-z0-9\-/]+?)(#[a-z0-9-]+)?"/g, (m, p, hash = "") =>
      /\.[a-z0-9]+$/.test(p) || p.endsWith("/") ? m : `href="${p}/${hash}"`)
    .replace(/href="\/uslug\/servisnye-uslugi\/lizing\/#basic-conditions"/g, 'href="#basic-conditions"')
    .replace(/<svg(?![^>]*aria-hidden)/g, '<svg aria-hidden="true"')
    .replace(/target="_blank" rel="nofollow"/g, 'target="_blank" rel="noopener"')
    .replace(/в течении/g, "в течение")
    .replace(/говоренные/g, "оговорённые");
}

// Горизонтальные ленты на мобильном прокручиваются — даём им фокус и имя, чтобы листать с клавиатуры
function scrollRegions(h, map) {
  for (const [cls, label] of Object.entries(map)) {
    h = h.replace(new RegExp(`<div class="([^"]*(?:^|\\s|")?${cls}(?:\\s[^"]*)?)">`), `<div class="$1" tabindex="0" role="region" aria-label="${label}">`);
  }
  return h;
}

const pages = {
  lizing(h) {
    return scrollRegions(h, { "conditions-slider": "Условия кратко", "leasing-advantages__list": "Преимущества лизинга" })
      .replace(/мы рассмотрим и одобрим<br \/>\s*ее в течение 2 часов\./, "мы дадим предварительное решение<br />\n              в течение 2 часов.")
      .replace(/<p>Мы рассмотрим и одобрим ее в течение 2 часов<\/p>/, "<p>Предварительное решение — в течение 2 часов</p>")
      .replace(/наши специалисты рассмотрят вашу заявку в течение 3-5 рабочих дней/, "лизинговая компания рассматривает документы 3–5 рабочих дней, мы ведём процесс за вас");
  },
  "o-kompanii"(h) {
    // Сертификаты — ссылки-картинки без подписи: даём имя для скринридеров
    let n = 0;
    h = scrollRegions(h, { "about-company__benefits": "Преимущества компании" });
    return h.replace(/<a href="([^"]+)" data-fancybox="certificate">/g, (m, href) => `<a href="${href}" data-fancybox="certificate" aria-label="Сертификат ${++n} — открыть">`);
  },
  kontakty(h) {
    // Представитель в Китае выводился дважды
    const items = h.match(/<div class="contacts-china__item">[\s\S]*?<\/div>/g) || [];
    if (items.length > 1) items.slice(1).forEach((it) => (h = h.replace(it, "")));
    // Карта: Яндекс-виджет без ключа API, переключается кликом по филиалу (main.js)
    h = h.replace(
      /<div class="contacts__map" id="map"><\/div>/,
      '<div class="contacts__map" id="map"><iframe title="Карта: площадка выбранного филиала" data-map loading="lazy" src="https://yandex.ru/map-widget/v1/?ll=113.450151%2C52.065183&amp;z=15&amp;pt=113.450151%2C52.065183%2Cpm2rdm" allowfullscreen></iframe></div>'
    );
    // Филиалы переключают карту: клик мышью по карточке + отдельная кнопка для клавиатуры (карточка содержит ссылки,
    // поэтому сама кнопкой быть не может)
    h = h.replace(/(<div class="contacts__item(?: active)?" data-coords="[^"]+">\s*<div class="contacts__item-top">\s*<h3 class="contacts__item-title">)([^<]+)(<\/h3>)/g,
      (m, a, city, b) => `${a}${city}${b}<button class="contacts__map-btn visually-hidden-focusable" type="button" data-map-btn>Показать ${city} на карте</button>`);
    return h.replace(/<p>13134933773<\/p>/, '<p><a href="tel:+8613134933773">+86 131 3493 3773</a></p>');
  },
  // Юридические тексты переносятся как есть: менять их должен юрист клиента.
  // ВНИМАНИЕ: в политике оригинала указан чужой сайт zabpoc.ru — см. replica/bugs.md
  "politika-konfidencialnosti"(h) {
    return h.replace(/zabpoc\.ru/g, '<mark title="На текущем сайте указан чужой домен — исправить юристу">zabpoc.ru</mark>');
  },
  "obrabotka-dannyh"(h) {
    return h.replace(
      /<div class="policy__content"><\/div>/,
      '<div class="policy__content"><p><mark>[На текущем сайте эта страница пустая, хотя на неё ссылается согласие в каждой форме. Текст согласия на обработку персональных данных нужен от юриста клиента.]</mark></p></div>'
    );
  },
};

for (const [name, fix] of Object.entries(pages)) {
  const html = common(mainInner(fs.readFileSync(src(name), "utf8")));
  const body = fix(html).replace(/<h2 class="section__title section__title--white section__title--indent-secondary">/g, '<h1 class="section__title section__title--white section__title--indent-secondary">');
  fs.writeFileSync(out(name), `{# Сгенерировано scripts/import-original.mjs из разметки nordtech.su — правки вносить в скрипт #}\n${body.trim()}\n`);
  console.log("ok", name);
}
