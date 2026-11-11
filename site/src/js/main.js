// Поведение сайта НОРД поверх разметки и CSS оригинала. Swiper и Fancybox подключены в base.njk (те же библиотеки, что на nordtech.su).
import { submitLead, normalizePhone } from "./lead-api.js";
import { initCursor, heroCurtain } from "./cursor.js";

initCursor();
heroCurtain(document.querySelector(".main-page > .about"), document.querySelector("[data-hero-video]"));

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
// Префикс адресов: "/" локально и в MODX, "/nordtech-site/" на GitHub Pages (задаёт base.njk)
const BASE = window.NORD_BASE || "/";
const ready = (fn) => (document.readyState === "loading" ? addEventListener("DOMContentLoaded", fn) : fn());

/* ---------- --header-height: от неё в CSS оригинала считаются отступы крошек и меню ---------- */
const headerEl = $("[data-header]");
const navTab = $(".nav-tab");
const setHeaderHeight = () => {
  if (headerEl) document.documentElement.style.setProperty("--header-height", `${headerEl.offsetHeight}px`);
  // Вариант 2: липкая кнопка на карточке товара стоит над нижней панелью
  if (navTab) document.documentElement.style.setProperty("--nav-tab-height", `${navTab.offsetHeight}px`);
};
setHeaderHeight();
addEventListener("resize", setHeaderHeight);

/* ---------- Шапка главной: белая при прокрутке (header--move оригинала) ---------- */
const header = $("[data-header-home]");
if (header) {
  const onScroll = () => header.classList.toggle("header--move", scrollY > 10);
  addEventListener("scroll", onScroll, { passive: true });
  onScroll();
}
const video = $("[data-hero-video]");
if (video && reduced) { video.removeAttribute("autoplay"); video.pause(); }

/* ---------- Мобильное меню (.header-menu.show, .hamburger.open) ---------- */
const burger = $("[data-menu-toggle]");
const menu = $("[data-menu]");
function setMenu(open, focusBack = true) {
  if (!burger || !menu) return;
  menu.classList.toggle("show", open);
  burger.classList.toggle("open", open);
  burger.setAttribute("aria-expanded", String(open));
  if (open) $("a", menu)?.focus();
  else if (focusBack) burger.focus();
}
burger?.addEventListener("click", () => setMenu(!menu.classList.contains("show")));

/* ---------- Поиск: оверлей оригинала (.search.show) + подсказки ---------- */
const search = $("[data-search]");
const index = JSON.parse($("#search-index")?.textContent || "[]");
const SYN = { "лонкинг": "lonking", "шанмон": "shanmon", "фронтальник": "фронтальный", "дгу": "дизель-генератор" };
const norm = (s) => s.toLowerCase().replace(/ё/g, "е");
const matchProducts = (q) => {
  const terms = norm(q).split(/\s+/).filter(Boolean).map((t) => SYN[t] || t);
  return index.filter((p) => terms.every((t) => norm(p.text).includes(t.slice(0, Math.max(4, t.length - 2)))));
};
let searchOpener = null;
function setSearch(open) {
  if (!search) return;
  search.classList.toggle("show", open);
  $$("[data-search-open]").forEach((b) => b.setAttribute("aria-expanded", String(open)));
  if (open) setTimeout(() => $("#search-input")?.focus(), 50);
  else searchOpener?.focus();
}
$$("[data-search-open]").forEach((b) => b.addEventListener("click", (e) => { e.preventDefault(); searchOpener = b; setSearch(true); }));
$("[data-search-close]")?.addEventListener("click", () => setSearch(false));
$("#search-input")?.addEventListener("input", (e) => {
  const q = e.target.value.trim();
  const box = $("[data-search-suggest]"), list = $("[data-search-suggest-list]");
  if (q.length < 2) { box.hidden = true; return; }
  const hits = matchProducts(q).slice(0, 5);
  list.innerHTML = "";
  for (const h of hits) {
    const a = document.createElement("a");
    a.className = "search-results__item";
    a.href = h.url;
    a.innerHTML = `<img alt="" width="64" height="48"><span></span>`;
    a.querySelector("img").src = h.thumb;
    a.querySelector("span").textContent = h.title;
    list.append(a);
  }
  if (!hits.length) list.innerHTML = '<p class="search-results__item">Ничего не нашли — нажмите Enter, чтобы искать по всему каталогу</p>';
  $("[data-search-all]").href = `${BASE}rezultaty-poiska/?query=${encodeURIComponent(q)}`;
  box.hidden = false;
});

addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  if (search?.classList.contains("show")) setSearch(false);
  if (menu?.classList.contains("show")) setMenu(false);
});

/* ---------- Слайдеры (Swiper, как на оригинале) ---------- */
ready(() => {
  if (!window.Swiper) return;
  const nav = (name) => ({ prevEl: `.${name}__button--prev`, nextEl: `.${name}__button--next` });
  const common = { keyboard: { enabled: true, onlyInViewport: true }, a11y: { prevSlideMessage: "Назад", nextSlideMessage: "Вперёд", slideLabelMessage: "{{index}} из {{slidesLength}}" }, speed: reduced ? 0 : 500, watchOverflow: true };
  // Параметры слайдеров сняты с nordtech.su (swiper.params на 1440 px), чтобы раскладка совпадала
  const opts = {
    "why-we": { slidesPerView: 1.3, spaceBetween: 15, rewind: true, breakpoints: { 400: { slidesPerView: 2.2, spaceBetween: 15 }, 575: { slidesPerView: 2.7, spaceBetween: 20 }, 992: { slidesPerView: 3.5, spaceBetween: 20 }, 1300: { slidesPerView: 3.5, spaceBetween: 40 } } },
    catalog: { slidesPerView: "auto", spaceBetween: 20 },
    "special-equipment": { slidesPerView: 1.3, spaceBetween: 0, breakpoints: { 575: { slidesPerView: 2 }, 768: { slidesPerView: 3 }, 1200: { slidesPerView: 4 } } },
    escort: { slidesPerView: 1.3, spaceBetween: 15, breakpoints: { 575: { slidesPerView: 2.3, spaceBetween: 15 }, 992: { slidesPerView: 3.5, spaceBetween: 40 } } },
    // Вариант 2: без автопрокрутки (WCAG 2.2.2 — движущийся контент без кнопки паузы)
    partners: { slidesPerView: 1.5, spaceBetween: 15, rewind: true, autoplay: reduced || document.body.classList.contains("v2") ? false : { delay: 3000, disableOnInteraction: true, pauseOnMouseEnter: true }, breakpoints: { 450: { slidesPerView: 2.2, spaceBetween: 15 }, 575: { slidesPerView: 2.5, spaceBetween: 15 }, 768: { slidesPerView: 3.3, spaceBetween: 15 }, 992: { slidesPerView: 4, spaceBetween: 20 } } },
  };

  $$(".partners__slider:not([data-swiper])").forEach((el) => (el.dataset.swiper = "partners")); // «О компании»
  // Вариант 2: каталог и партнёры — сетки, без карусели (ANALYSIS-v2 M1, M2)
  const gridInV2 = new Set(["catalog", "partners"]);
  const isV2 = document.body.classList.contains("v2");
  $$("[data-swiper]").forEach((el) => {
    const name = el.dataset.swiper;
    if (isV2 && gridInV2.has(name)) return;
    const scope = el.closest("section") || document;
    const prev = $(`.${name}__button--prev`, scope), next = $(`.${name}__button--next`, scope);
    new window.Swiper(el, { ...common, ...opts[name], navigation: prev && next ? { prevEl: prev, nextEl: next } : false });
  });

  // Галерея товара: основной слайдер + миниатюры + полноэкранный просмотр
  const g = $("[data-gallery]");
  if (g) {
    const thumbsEl = $(".product-slider__thumb", g);
    const thumbs = thumbsEl ? new window.Swiper(thumbsEl, { slidesPerView: 4, spaceBetween: 10, watchSlidesProgress: true, breakpoints: { 768: { slidesPerView: 5 } } }) : null;
    new window.Swiper($(".product-slider__main", g), { spaceBetween: 10, keyboard: { enabled: true }, thumbs: thumbs ? { swiper: thumbs } : undefined, a11y: { slideLabelMessage: "Фото {{index}} из {{slidesLength}}" } });
  }
  window.Fancybox?.bind('[data-fancybox="gallery"]', { Hash: false });
  window.Fancybox?.bind('[data-fancybox="certificate"]', { Hash: false });
});

/* ---------- FAQ оригинала (.faq__item.active) — с клавиатурой и aria-expanded ---------- */
$$(".faq__item").forEach((item, i) => {
  const btn = $(".faq__item-button", item), panel = $(".faq__item-content", item);
  if (!btn || !panel) return;
  panel.id ||= `faq-panel-${i}`;
  Object.assign(btn, { tabIndex: 0 });
  btn.setAttribute("role", "button");
  btn.setAttribute("aria-controls", panel.id);
  btn.setAttribute("aria-expanded", String(item.classList.contains("active")));
  const toggle = () => btn.setAttribute("aria-expanded", String(item.classList.toggle("active")));
  btn.addEventListener("click", toggle);
  btn.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); } });
});

/* ---------- Вариант 2: липкая кнопка на карточке товара, когда основные кнопки ушли с экрана ---------- */
const sticky = $("[data-sticky-cta]"), mainButtons = $(".product__buttons");
if (sticky && mainButtons) {
  // Проверка положения при прокрутке, а не IntersectionObserver: при резком переходе (якорь, быстрый свайп)
  // кнопки «пролетают» экран без пересечения, и наблюдатель не срабатывал
  const btn = $("button", sticky);
  let ticking = false;
  const update = () => {
    ticking = false;
    const show = mainButtons.getBoundingClientRect().bottom < 0; // кнопки целиком выше экрана
    if (show === sticky.classList.contains("is-visible")) return;
    sticky.classList.toggle("is-visible", show);
    sticky.setAttribute("aria-hidden", String(!show));
    btn.tabIndex = show ? 0 : -1;
  };
  addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
  addEventListener("resize", update);
  update();
}

/* ---------- Появление блоков при прокрутке ---------- */
// Карточки и пункты появляются по очереди; крупные блоки секций — целиком. Видимое при загрузке не трогаем.
// После появления атрибут снимается: у карточек возвращаются переходы kit для наведения. Только transform/opacity (main.scss)
if (!reduced && "IntersectionObserver" in window) {
  const ITEMS = [".catalog-slide", ".partners__slide", ".why-we__block", ".stages-work__item", ".trust__certs li", ".leasing__stage",
    ".card-product", ".basic-conditions__item", ".leasing-advantages__item", ".leasing-registration-process__item",
    ".leasing-registration__item", ".about-company__advantage", ".about-company__benefit", ".contacts__item", ".escort__slide"].join(",");
  const main = $("#main");
  const belowFold = (el) => el.getBoundingClientRect().top > innerHeight * 0.9;
  const targets = new Set($$(ITEMS, main).filter(belowFold));
  $$(".section:not(.about)", main).forEach((section) => {
    const box = $(":scope > .container", section) || section;
    [...box.children].forEach((el) => {
      if (el.matches(ITEMS + ",.visually-hidden,script,template,[hidden]") || el.querySelector(ITEMS + ",[data-sticky-cta]")) return;
      if (belowFold(el)) targets.add(el);
    });
  });
  const done = (el) => { el.removeAttribute("data-reveal"); el.classList.remove("is-in"); el.style.transitionDelay = ""; };
  const io = new IntersectionObserver((entries) => {
    // Задержка по порядку внутри одной пачки: что вошло в экран вместе, появляется «лесенкой»
    entries.filter((e) => e.isIntersecting).forEach((e, i) => {
      const el = e.target, delay = Math.min(i, 6) * 70;
      io.unobserve(el);
      el.style.transitionDelay = `${delay}ms`;
      el.classList.add("is-in");
      setTimeout(() => done(el), 850 + delay);
    });
  }, { rootMargin: "0px 0px -8% 0px" });
  targets.forEach((el) => { el.setAttribute("data-reveal", ""); io.observe(el); });
  document.body.classList.add("reveal-on");
  addEventListener("beforeprint", () => targets.forEach(done));
}

/* ---------- Уведомления ---------- */
function toast(kind, title, text) {
  const box = $("#toasts");
  if (!box) return;
  const el = document.createElement("div");
  el.className = `toast toast--${kind}`;
  el.setAttribute("role", kind === "error" ? "alert" : "status");
  el.innerHTML = `<div><b></b><p></p></div><button class="toast__close" type="button" aria-label="Закрыть уведомление">✕</button>`;
  $("b", el).textContent = title;
  $("p", el).textContent = text;
  $(".toast__close", el).onclick = () => el.remove();
  box.append(el);
  while (box.children.length > 2) box.firstElementChild.remove();
  setTimeout(() => el.remove(), 6000);
}

/* ---------- Окно заявки ---------- */
const LEAD = {
  price: { title: "Оформить заявку", sub: "Наш специалист свяжется с вами в ближайшее время", submit: "Оставить заявку", fields: ["product", "city"] },
  question: { title: "Задать вопрос", sub: "Спросите про комплектацию, сроки или доставку — ответим по телефону или в мессенджере", submit: "Отправить вопрос", fields: ["product", "comment"] },
  leasing: { title: "Заявка на лизинг", sub: "Свяжитесь с нами одним из удобных способов", submit: "Оставить заявку", fields: ["email", "product", "city", "comment"] },
  consultation: { title: "Получить консультацию", sub: "Свяжитесь с нами одним из удобных способов", submit: "Получить консультацию", fields: ["email", "city", "comment"] },
};
// Ссылки оригинала href="#modal-…" → тип заявки
const HASH_TYPE = { "#modal-feedback": "consultation", "#modal-application": "leasing", "#modal-application-second": "price" };
const dlg = $("#lead-dialog");
const form = $("[data-lead-form]");
let opener = null;

const syncLabel = (input) => input.closest(".ui-input")?.classList.toggle("ui-input--active", !!input.value || input.tagName === "SELECT");

function openLead(btn, type) {
  const cfg = LEAD[type] || LEAD.consultation;
  form.reset();
  $$(".field__error", form).forEach((e) => (e.hidden = true));
  $$("[aria-invalid]", form).forEach((e) => e.removeAttribute("aria-invalid"));
  $$(".ui-input--error", form).forEach((e) => e.classList.remove("ui-input--error"));
  $("[data-lead-title]", dlg).textContent = cfg.title;
  $("[data-lead-sub]", dlg).textContent = cfg.sub;
  $("[data-submit-label]", dlg).textContent = cfg.submit;
  const title = btn.dataset.productTitle || btn.dataset.product || "";
  $$("[data-field]", form).forEach((f) => {
    const name = f.dataset.field;
    f.hidden = !cfg.fields.includes(name) || (name === "product" && !title);
  });
  form.elements.type.value = type;
  form.elements.product_id.value = btn.dataset.productId || "";
  form.elements.product_title.value = title;
  form.elements.page_url.value = location.pathname;
  form.elements.submit_token.value = crypto.randomUUID();
  $$(".ui-input__input", form).forEach(syncLabel);
  $("[data-lead-body]", dlg).hidden = false;
  $("[data-lead-done]", dlg).hidden = true;
  opener = btn;
  setMenu(false, false);
  dlg.showModal();
  form.elements.name.focus(); // не form.name: это имя самой формы
}
document.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-lead], a[href^='#modal-']");
  if (!btn) return;
  e.preventDefault();
  openLead(btn, btn.dataset.lead || HASH_TYPE[btn.getAttribute("href")] || "consultation");
});
// Ссылки-открывашки оригинала ведут себя как кнопки
$$("a[href^='#modal-']").forEach((a) => { a.setAttribute("role", "button"); a.setAttribute("aria-haspopup", "dialog"); });
$$("[data-dialog-close]", dlg || document).forEach((b) => b.addEventListener("click", () => dlg.close()));
dlg?.addEventListener("click", (e) => { if (e.target === dlg) dlg.close(); });
dlg?.addEventListener("close", () => opener?.focus());

function showErrors(errors, { focus = true } = {}) {
  let first = null;
  for (const [name, msg] of Object.entries(errors)) {
    const input = form.elements[name];
    const err = document.getElementById(`lead-${name}-err`);
    if (!input || !err) continue;
    input.setAttribute("aria-invalid", "true");
    input.closest(".ui-input")?.classList.add("ui-input--error");
    err.textContent = msg;
    err.hidden = false;
    first ||= input;
  }
  if (focus) first?.focus();
}
function clearError(input) {
  input.removeAttribute("aria-invalid");
  input.closest(".ui-input")?.classList.remove("ui-input--error");
  const err = document.getElementById(`lead-${input.name}-err`);
  if (err) err.hidden = true;
}

if (form) {
  $$(".ui-input__input", form).forEach((i) => {
    i.addEventListener("input", () => { syncLabel(i); clearError(i); });
    i.addEventListener("change", () => syncLabel(i));
  });
  form.elements.consent.addEventListener("change", () => clearError(form.elements.consent));

  // Маска +7 (XXX) XXX-XX-XX; курсор остаётся после той же цифры при правке в середине (BUG-001)
  form.elements.phone.addEventListener("input", () => {
    const el = form.elements.phone;
    const raw = el.value;
    const caret = el.selectionStart ?? raw.length;
    let before = raw.slice(0, caret).replace(/\D/g, "").length;
    let d = raw.replace(/\D/g, "");
    if (d[0] === "8") d = "7" + d.slice(1);
    if (d && d[0] !== "7") { d = "7" + d; before += 1; }
    d = d.slice(0, 11);
    const p = [d.slice(1, 4), d.slice(4, 7), d.slice(7, 9), d.slice(9, 11)];
    const out = d ? `+7${p[0] ? " (" + p[0] : ""}${p[1] ? ") " + p[1] : ""}${p[2] ? "-" + p[2] : ""}${p[3] ? "-" + p[3] : ""}` : "";
    el.value = out;
    syncLabel(el);
    if (document.activeElement !== el) return;
    before = Math.min(Math.max(before, 1), d.length);
    let pos = 0;
    for (let seen = 0; pos < out.length && seen < before; pos++) if (/\d/.test(out[pos])) seen++;
    el.setSelectionRange(pos, pos);
  });
  form.elements.phone.addEventListener("blur", (e) => {
    // Ушли на «Отправить» — ошибку покажет отправка. Иначе текст ошибки сдвигает кнопку и нажатие промахивается (BUG-002)
    if (e.relatedTarget?.type === "submit") return;
    const v = form.elements.phone.value;
    // Без переноса фокуса: иначе на телефоне ошибка перехватывает нажатие «Отправить» (BUG-002)
    if (v && !normalizePhone(v)) showErrors({ phone: "Введите номер полностью: +7 и 10 цифр" }, { focus: false });
  });

  let busy = false;
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (busy) return;
    const fields = Object.fromEntries(new FormData(form));
    fields.consent = form.elements.consent.checked ? "1" : "";
    fields.consent_doc_ver = "2026-11";
    const btn = $("[type=submit]", form);
    const label = $("[data-submit-label]", btn);
    const prev = label.textContent;
    busy = true;
    btn.disabled = true;
    btn.setAttribute("aria-busy", "true");
    label.textContent = "Отправляем…";
    const res = await submitLead(fields);
    busy = false;
    btn.disabled = false;
    btn.removeAttribute("aria-busy");
    label.textContent = prev;
    if (res.ok) {
      $("[data-lead-body]", dlg).hidden = true;
      const done = $("[data-lead-done]", dlg);
      done.hidden = false;
      done.focus();
      window.ym?.(0, "reachGoal", `lead_${fields.type}`);
    } else if (res.errors && Object.keys(res.errors).length) {
      showErrors(res.errors);
    } else if (res.message && !["network", "server"].includes(res.message)) {
      toast("error", "Не удалось отправить", res.message);
    } else {
      toast("error", "Не удалось отправить", "Проверьте интернет и попробуйте ещё раз или позвоните 8 800 101 65 54.");
    }
  });
}

/* ---------- Каталог: фильтр по бренду, «Показать еще» и номера страниц ---------- */
const plural = (n) => {
  const a = n % 100, b = n % 10;
  return `${n} ${a > 10 && a < 20 ? "моделей" : b === 1 ? "модель" : b > 1 && b < 5 ? "модели" : "моделей"}`;
};
$$("[data-catalog]").forEach((root) => {
  const cards = $$("[data-cards] > .card-product", root);
  const more = $("[data-more]", root);
  const pagesNav = $("[data-pages-nav]", root), pages = $("[data-pages]", root);
  const count = $("[data-count]", root);
  const size = +root.dataset.pageSize || 4;
  let from = 0, to = size;
  const matching = () => {
    const vendors = $$("[data-filter] input:checked", root).map((i) => i.value);
    return cards.filter((c) => !vendors.length || vendors.includes(c.dataset.vendor));
  };
  function render() {
    const m = matching();
    cards.forEach((c) => (c.hidden = true));
    m.slice(from, to).forEach((c) => (c.hidden = false));
    if (count) count.textContent = plural(m.length);
    const rest = m.length - to;
    if (more) {
      more.hidden = rest <= 0;
      $("[data-more-label]", more).textContent = `Показать еще ${Math.min(rest, size)} из ${rest}`;
    }
    const total = Math.ceil(m.length / size);
    if (pages) {
      pagesNav.hidden = total < 2;
      pages.innerHTML = "";
      const page = Math.floor(from / size) + 1;
      const go = (n) => { from = (n - 1) * size; to = n * size; render(); $(".card-product__title a", m[from])?.focus(); };
      const item = (label, n, { disabled = false, current = false, cls = "" } = {}) => {
        const li = document.createElement("li");
        li.className = `pagination__item ${cls}`;
        const b = document.createElement("button");
        b.type = "button";
        b.className = "pagination__link";
        b.textContent = label;
        b.disabled = disabled;
        if (current) b.setAttribute("aria-current", "page");
        if (/^\d+$/.test(label)) b.setAttribute("aria-label", `Страница ${label}`);
        b.addEventListener("click", () => go(n));
        li.append(b);
        pages.append(li);
      };
      item("Назад", page - 1, { disabled: page <= 1, cls: "pagination__item--prev" });
      for (let i = 1; i <= total; i++) item(String(i), i, { current: from === (i - 1) * size && to === i * size });
      item("Вперёд", page + 1, { disabled: page >= total, cls: "pagination__item--next" });
    }
    return m;
  }
  $$("[data-filter] input", root).forEach((i) => i.addEventListener("change", () => { from = 0; to = size; render(); }));
  more?.addEventListener("click", () => { const before = to; to += size; const m = render(); $(".card-product__title a", m[before])?.focus(); });
  render();
});

/* ---------- Контакты: филиал → карта (клик по карточке или кнопка «Показать … на карте» для клавиатуры) ---------- */
const map = $("[data-map]");
$$(".contacts__item[data-coords]").forEach((item) => {
  const show = () => {
    $$(".contacts__item").forEach((x) => x.classList.remove("active"));
    item.classList.add("active");
    const [lat, lon] = item.dataset.coords.split(",");
    if (map) map.src = `https://yandex.ru/map-widget/v1/?ll=${lon}%2C${lat}&z=15&pt=${lon}%2C${lat}%2Cpm2rdm`;
  };
  item.addEventListener("click", (e) => { if (!e.target.closest("a")) show(); });
  $("[data-map-btn]", item)?.addEventListener("click", (e) => { e.stopPropagation(); show(); });
});

/* ---------- Страница поиска (S06) ---------- */
const results = $("[data-search-results]");
if (results) {
  const q = new URLSearchParams(location.search).get("query")?.trim() || "";
  $("#q-page").value = q;
  const status = $("[data-search-status]");
  if (!q) {
    status.textContent = "Введите модель, бренд или тип техники.";
  } else {
    const hits = matchProducts(q);
    $$("[data-search-card]", results).forEach((c) => (c.hidden = !hits.some((h) => h.slug === c.dataset.searchCard)));
    status.textContent = hits.length ? `По запросу «${q}» — ${plural(hits.length)}` : "";
    $("[data-search-empty]").hidden = hits.length > 0;
    $("[data-search-empty-q]").textContent = q;
  }
}
