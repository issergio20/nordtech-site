// Вариант 2 «НОРД Тёмный»: поведение сайта. Без jQuery и Swiper; Fancybox — только полноэкранное фото товара.
// Отправка заявок — общий слой lead-api.js (тот же контракт, что в варианте 1 и в MODX).
import { submitLead, normalizePhone } from "./lead-api.js";
import { initCursor, heroCurtain } from "./cursor.js"; // общий с вариантом 1: src/js/cursor.js

initCursor();
heroCurtain(document.querySelector(".is-home main > .hero"), document.querySelector("[data-hero-video]"));

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
const BASE = window.NORD_BASE || "/";
const root = document.documentElement;

/* ---------- Высота шапки → CSS (отступы первых экранов, якоря) ---------- */
const header = $("[data-header]");
const setHeaderH = () => header && root.style.setProperty("--header-h", `${header.offsetHeight}px`);
setHeaderH();
addEventListener("resize", setHeaderH);

/* ---------- Главная: шапка по сетке первого экрана ---------- */
// Меню — по левому краю заголовка, поиск — по левому краю текста «Мы — гарант…». Только если блок справа
// (поиск, телефон, заявка) помещается до правого поля; иначе остаётся обычная раскладка шапки
const heroTitle = $(".is-home .hero__title"), heroLead = $(".is-home .hero__lead");
if (header && heroTitle && heroLead) {
  const bar = $(".header__bar", header), actions = $(".header__actions", header), logo = $(".header__logo", header);
  const alignHeader = () => {
    header.classList.remove("header--aligned", "header--compact");
    if (innerWidth < 1100) return;
    const bs = getComputedStyle(bar), br = bar.getBoundingClientRect();
    const left = br.left + parseFloat(bs.paddingLeft), right = br.right - parseFloat(bs.paddingRight);
    const t = heroTitle.getBoundingClientRect().left, a = heroLead.getBoundingClientRect().left;
    const logoW = ($("svg", logo) || logo).getBoundingClientRect().width; // сам знак, не ячейка сетки
    if (t - left < logoW + 24) return;
    // Не помещается — на главной убираем «Оставить заявку» из шапки: та же заявка стоит прямо под ней на первом экране
    if (right - a < actions.scrollWidth) header.classList.add("header--compact");
    if (right - a < actions.scrollWidth) { header.classList.remove("header--compact"); return; }
    root.style.setProperty("--hdr-c1", `${Math.round(t - left)}px`);
    root.style.setProperty("--hdr-c2", `${Math.round(a - t)}px`);
    header.classList.add("header--aligned");
  };
  alignHeader();
  addEventListener("resize", alignHeader);
  document.fonts?.ready.then(alignHeader);
}

/* ---------- Шапка: на главной прозрачная до прокрутки ---------- */
if (header) {
  const onScroll = () => header.classList.toggle("is-scrolled", scrollY > 24);
  addEventListener("scroll", onScroll, { passive: true });
  onScroll();
}
const video = $("[data-hero-video]");
if (video && reduced) { video.removeAttribute("autoplay"); video.pause(); }

/* ---------- Мобильное меню ---------- */
const burger = $("[data-menu-toggle]"), menu = $("[data-menu]");
function setMenu(open, focusBack = true) {
  if (!burger || !menu) return;
  menu.classList.toggle("is-open", open);
  burger.setAttribute("aria-expanded", String(open));
  root.style.overflow = open ? "hidden" : "";
  if (open) $("a", menu)?.focus();
  else if (focusBack) burger.focus();
}
burger?.addEventListener("click", () => setMenu(!menu.classList.contains("is-open")));
menu?.addEventListener("click", (e) => { if (e.target.closest("a")) setMenu(false, false); });

/* ---------- Поиск: оверлей + подсказки ---------- */
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
  search.classList.toggle("is-open", open);
  root.style.overflow = open ? "hidden" : "";
  $$("[data-search-open]").forEach((b) => b.setAttribute("aria-expanded", String(open)));
  if (open) setTimeout(() => $("#search-input")?.focus(), 30);
  else searchOpener?.focus();
}
$$("[data-search-open]").forEach((b) => b.addEventListener("click", (e) => { e.preventDefault(); searchOpener = b; setSearch(true); }));
$("[data-search-close]")?.addEventListener("click", () => setSearch(false));
$("#search-input")?.addEventListener("input", (e) => {
  const q = e.target.value.trim();
  const box = $("[data-search-suggest]"), list = $("[data-search-suggest-list]");
  if (q.length < 2) { box.hidden = true; return; }
  const hits = matchProducts(q).slice(0, 6);
  list.innerHTML = "";
  for (const h of hits) {
    const a = document.createElement("a");
    a.className = "search__hit";
    a.href = h.url;
    a.innerHTML = `<img alt="" width="80" height="60"><span></span>`;
    a.querySelector("img").src = h.thumb;
    a.querySelector("span").textContent = h.title;
    list.append(a);
  }
  if (!hits.length) list.innerHTML = '<p class="search__none">Ничего не нашли — нажмите Enter, чтобы искать по всему каталогу</p>';
  $("[data-search-all]").href = `${BASE}rezultaty-poiska/?query=${encodeURIComponent(q)}`;
  box.hidden = false;
});
addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  if (search?.classList.contains("is-open")) setSearch(false);
  if (menu?.classList.contains("is-open")) setMenu(false);
});

/* ---------- Карусель на прокрутке с привязкой: кнопки «назад/вперёд» и их состояние ---------- */
$$("[data-carousel]").forEach((c) => {
  const track = $("[data-track]", c);
  const prev = $("[data-prev]", c), next = $("[data-next]", c);
  if (!track) return;
  const step = () => (track.firstElementChild?.getBoundingClientRect().width || 300) + parseFloat(getComputedStyle(track).columnGap || 0);
  const sync = () => {
    if (prev) prev.disabled = track.scrollLeft < 4;
    if (next) next.disabled = track.scrollLeft + track.clientWidth > track.scrollWidth - 4;
  };
  prev?.addEventListener("click", () => track.scrollBy({ left: -step(), behavior: reduced ? "auto" : "smooth" }));
  next?.addEventListener("click", () => track.scrollBy({ left: step(), behavior: reduced ? "auto" : "smooth" }));
  track.addEventListener("scroll", () => requestAnimationFrame(sync), { passive: true });
  addEventListener("resize", sync);
  sync();
});

/* ---------- Галерея товара: миниатюры переключают фото, большое открывается на весь экран ---------- */
const gallery = $("[data-gallery]");
if (gallery) {
  const main = $("[data-gallery-main]", gallery), img = $("img", main);
  const thumbs = $$("[data-thumb]", gallery);
  thumbs.forEach((t, i) => t.addEventListener("click", () => {
    thumbs.forEach((x) => x.setAttribute("aria-pressed", String(x === t)));
    img.src = t.dataset.big;
    img.alt = t.dataset.alt;
    main.href = t.dataset.full;
    main.dataset.index = i;
  }));
  const open = (e) => {
    if (!window.Fancybox) return; // без библиотеки ссылка просто откроет фото
    e.preventDefault();
    const items = thumbs.length ? thumbs.map((t) => ({ src: t.dataset.full, thumb: t.dataset.small })) : [{ src: main.href }];
    window.Fancybox.show(items, { startIndex: +main.dataset.index || 0, Hash: false });
  };
  main.addEventListener("click", open);
}
addEventListener("load", () => window.Fancybox?.bind('[data-fancybox="certificate"]', { Hash: false }));

/* ---------- Липкая кнопка на карточке товара (телефон) ---------- */
const sticky = $("[data-sticky-cta]"), buy = $("[data-buy]");
if (sticky && buy) {
  const btn = $("button", sticky);
  let ticking = false;
  const update = () => {
    ticking = false;
    const show = buy.getBoundingClientRect().bottom < 0;
    if (show === sticky.classList.contains("is-visible")) return;
    sticky.classList.toggle("is-visible", show);
    sticky.setAttribute("aria-hidden", String(!show));
    btn.tabIndex = show ? 0 : -1;
  };
  addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
  addEventListener("resize", update);
  update();
}

/* ---------- Уведомления ---------- */
function toast(kind, title, text) {
  const box = $("#toasts");
  if (!box) return;
  const el = document.createElement("div");
  el.className = `toast toast--${kind}`;
  el.setAttribute("role", kind === "error" ? "alert" : "status");
  el.innerHTML = `<div><b></b><p></p></div><button class="toast__close icon-btn" type="button" aria-label="Закрыть уведомление">✕</button>`;
  $("b", el).textContent = title;
  $("p", el).textContent = text;
  $(".toast__close", el).onclick = () => el.remove();
  box.append(el);
  while (box.children.length > 2) box.firstElementChild.remove();
  setTimeout(() => el.remove(), 6000);
}

/* ---------- Окно заявки ---------- */
const LEAD = {
  price: { title: "Оформить заявку", sub: "Назовём цену с доставкой до вашего города и условия лизинга", submit: "Оставить заявку", fields: ["product", "city"] },
  question: { title: "Задать вопрос", sub: "Спросите про комплектацию, сроки или доставку — ответим по телефону или в мессенджере", submit: "Отправить вопрос", fields: ["product", "comment"] },
  leasing: { title: "Заявка на лизинг", sub: "Предварительное решение — в течение 2 часов", submit: "Оставить заявку", fields: ["email", "product", "city", "comment"] },
  consultation: { title: "Получить консультацию", sub: "Расскажите о задаче — подберём технику и перезвоним", submit: "Получить консультацию", fields: ["email", "city", "comment"] },
};
const dlg = $("#lead-dialog"), form = $("[data-lead-form]");
let opener = null;

function openLead(btn, type) {
  const cfg = LEAD[type] || LEAD.consultation;
  form.reset();
  $$(".field__error", form).forEach((e) => (e.hidden = true));
  $$("[aria-invalid]", form).forEach((e) => e.removeAttribute("aria-invalid"));
  $("[data-lead-title]", dlg).textContent = cfg.title;
  $("[data-lead-sub]", dlg).textContent = cfg.sub;
  $("[data-submit-label]", dlg).textContent = cfg.submit;
  const title = btn.dataset.productTitle || "";
  $$("[data-field]", form).forEach((f) => {
    const name = f.dataset.field;
    f.hidden = !cfg.fields.includes(name) || (name === "product" && !title);
  });
  form.elements.type.value = type;
  form.elements.product_id.value = btn.dataset.productId || "";
  form.elements.product_title.value = title;
  form.elements.page_url.value = location.pathname;
  form.elements.submit_token.value = crypto.randomUUID();
  $("[data-lead-body]", dlg).hidden = false;
  $("[data-lead-done]", dlg).hidden = true;
  opener = btn;
  setMenu(false, false);
  dlg.showModal();
  form.elements.name.focus();
}
document.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-lead]");
  if (!btn) return;
  e.preventDefault();
  openLead(btn, btn.dataset.lead);
});
$$("[data-dialog-close]", dlg || document).forEach((b) => b.addEventListener("click", () => dlg.close()));
dlg?.addEventListener("click", (e) => { if (e.target === dlg) dlg.close(); });
dlg?.addEventListener("close", () => opener?.focus());

function showErrors(errors, { focus = true } = {}) {
  let first = null;
  for (const [name, msg] of Object.entries(errors)) {
    const input = form.elements[name], err = document.getElementById(`lead-${name}-err`);
    if (!input || !err) continue;
    input.setAttribute("aria-invalid", "true");
    err.textContent = msg;
    err.hidden = false;
    first ||= input;
  }
  if (focus) first?.focus();
}
function clearError(input) {
  input.removeAttribute("aria-invalid");
  const err = document.getElementById(`lead-${input.name}-err`);
  if (err) err.hidden = true;
}

if (form) {
  $$(".field__input", form).forEach((i) => i.addEventListener("input", () => clearError(i)));
  form.elements.consent.addEventListener("change", () => clearError(form.elements.consent));

  // Маска +7 (XXX) XXX-XX-XX; курсор остаётся после той же цифры при правке в середине
  form.elements.phone.addEventListener("input", () => {
    const el = form.elements.phone, raw = el.value, caret = el.selectionStart ?? raw.length;
    let before = raw.slice(0, caret).replace(/\D/g, "").length;
    let d = raw.replace(/\D/g, "");
    if (d[0] === "8") d = "7" + d.slice(1);
    if (d && d[0] !== "7") { d = "7" + d; before += 1; }
    d = d.slice(0, 11);
    const p = [d.slice(1, 4), d.slice(4, 7), d.slice(7, 9), d.slice(9, 11)];
    const out = d ? `+7${p[0] ? " (" + p[0] : ""}${p[1] ? ") " + p[1] : ""}${p[2] ? "-" + p[2] : ""}${p[3] ? "-" + p[3] : ""}` : "";
    el.value = out;
    if (document.activeElement !== el) return;
    before = Math.min(Math.max(before, 1), d.length);
    let pos = 0;
    for (let seen = 0; pos < out.length && seen < before; pos++) if (/\d/.test(out[pos])) seen++;
    el.setSelectionRange(pos, pos);
  });
  form.elements.phone.addEventListener("blur", (e) => {
    if (e.relatedTarget?.type === "submit") return; // ошибку покажет отправка, кнопка не уезжает из-под пальца
    const v = form.elements.phone.value;
    if (v && !normalizePhone(v)) showErrors({ phone: "Введите номер полностью: +7 и 10 цифр" }, { focus: false });
  });

  let busy = false;
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (busy) return;
    const fields = Object.fromEntries(new FormData(form));
    fields.consent = form.elements.consent.checked ? "1" : "";
    fields.consent_doc_ver = "2026-11";
    const btn = $("[type=submit]", form), label = $("[data-submit-label]", btn), prev = label.textContent;
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
    } else if (res.errors && Object.keys(res.errors).length) showErrors(res.errors);
    else if (res.message && !["network", "server"].includes(res.message)) toast("error", "Не удалось отправить", res.message);
    else toast("error", "Не удалось отправить", "Проверьте интернет и попробуйте ещё раз или позвоните 8 800 101 65 54.");
  });
}

/* ---------- Каталог: фильтр по бренду, «Показать ещё», номера страниц ---------- */
const plural = (n) => {
  const a = n % 100, b = n % 10;
  return `${n} ${a > 10 && a < 20 ? "моделей" : b === 1 ? "модель" : b > 1 && b < 5 ? "модели" : "моделей"}`;
};
$$("[data-catalog]").forEach((rootEl) => {
  const cards = $$("[data-cards] > [data-card]", rootEl);
  const more = $("[data-more]", rootEl), pagesNav = $("[data-pages-nav]", rootEl), pages = $("[data-pages]", rootEl), count = $("[data-count]", rootEl);
  const size = +rootEl.dataset.pageSize || 8;
  let from = 0, to = size;
  const matching = () => {
    const vendors = $$("[data-filter] input:checked", rootEl).map((i) => i.value);
    return cards.filter((c) => !vendors.length || vendors.includes(c.dataset.vendor));
  };
  const focusCard = (c) => $(".p-card__title a", c)?.focus();
  function render() {
    const m = matching();
    cards.forEach((c) => (c.hidden = true));
    m.slice(from, to).forEach((c) => (c.hidden = false));
    if (count) count.textContent = plural(m.length);
    const rest = m.length - to;
    if (more) { more.hidden = rest <= 0; $("[data-more-label]", more).textContent = `Показать ещё ${Math.min(rest, size)} из ${rest}`; }
    const total = Math.ceil(m.length / size);
    if (pages) {
      pagesNav.hidden = total < 2;
      pages.innerHTML = "";
      const page = Math.floor(from / size) + 1;
      const go = (n) => { from = (n - 1) * size; to = n * size; render(); focusCard(m[from]); };
      const item = (label, n, { disabled = false, current = false } = {}) => {
        const li = document.createElement("li"), b = document.createElement("button");
        b.type = "button"; b.textContent = label; b.disabled = disabled;
        if (current) b.setAttribute("aria-current", "page");
        if (/^\d+$/.test(label)) b.setAttribute("aria-label", `Страница ${label}`);
        b.addEventListener("click", () => go(n));
        li.append(b); pages.append(li);
      };
      item("Назад", page - 1, { disabled: page <= 1 });
      for (let i = 1; i <= total; i++) item(String(i), i, { current: from === (i - 1) * size && to === i * size });
      item("Вперёд", page + 1, { disabled: page >= total });
    }
    return m;
  }
  $$("[data-filter] input", rootEl).forEach((i) => i.addEventListener("change", () => { from = 0; to = size; render(); }));
  more?.addEventListener("click", () => { const before = to; to += size; const m = render(); focusCard(m[before]); });
  render();
});

/* ---------- Контакты: филиал → карта ---------- */
const map = $("[data-map]");
$$("[data-branch]").forEach((item) => {
  const show = () => {
    $$("[data-branch]").forEach((x) => x.classList.toggle("is-active", x === item));
    const [lat, lon] = item.dataset.coords.split(",");
    if (map) map.src = `https://yandex.ru/map-widget/v1/?ll=${lon}%2C${lat}&z=15&pt=${lon}%2C${lat}%2Cpm2rdm`;
  };
  item.addEventListener("click", (e) => { if (!e.target.closest("a")) show(); });
  $("[data-map-btn]", item)?.addEventListener("click", (e) => { e.stopPropagation(); show(); });
});

/* ---------- Страница поиска ---------- */
const results = $("[data-search-results]");
if (results) {
  const q = new URLSearchParams(location.search).get("query")?.trim() || "";
  $("#q-page").value = q;
  const status = $("[data-search-status]");
  if (!q) status.textContent = "Введите модель, бренд или тип техники.";
  else {
    const hits = matchProducts(q);
    $$("[data-search-card]", results).forEach((c) => (c.hidden = !hits.some((h) => h.slug === c.dataset.searchCard)));
    status.textContent = hits.length ? `По запросу «${q}» — ${plural(hits.length)}` : "";
    $("[data-search-empty]").hidden = hits.length > 0;
  }
}

/* ---------- Левое меню главной: подсветка раздела, который сейчас в середине экрана ---------- */
const sidenav = $("[data-sidenav]");
if (sidenav) {
  // Текущий — последний раздел, чей верх уже поднялся выше середины экрана. Не IntersectionObserver: первый экран
  // закреплён «шторкой» и всё время пересекает середину — при возврате наверх наблюдатель не получал события
  const items = $$("a", sidenav).map((a) => ({ a, el: document.getElementById(a.getAttribute("href").slice(1)) })).filter((x) => x.el);
  let ticking = false, current = null;
  const spy = () => {
    ticking = false;
    const mid = innerHeight * 0.5;
    let found = items[0];
    for (const it of items) if (it.el.getBoundingClientRect().top <= mid) found = it;
    if (found === current) return;
    current = found;
    items.forEach((it) => (it === found ? it.a.setAttribute("aria-current", "true") : it.a.removeAttribute("aria-current")));
  };
  addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(spy); } }, { passive: true });
  addEventListener("resize", spy);
  spy();
}

/* ---------- Появление блоков при прокрутке ---------- */
// Карточки ([data-reveal-item]) — «лесенкой», секционные блоки — целиком. Видимое при загрузке не трогаем.
if (!reduced && "IntersectionObserver" in window) {
  const mainEl = $("#main");
  const belowFold = (el) => el.getBoundingClientRect().top > innerHeight * 0.9;
  const targets = new Set($$("[data-reveal-item], .step", mainEl).filter(belowFold));
  $$("[data-reveal-block], .sec-head", mainEl).forEach((el) => { if (belowFold(el) && !el.querySelector("[data-reveal-item], .step")) targets.add(el); });
  const done = (el) => { el.removeAttribute("data-reveal"); el.classList.remove("is-in"); el.style.transitionDelay = ""; if (el.classList.contains("step")) el.classList.add("is-in"); };
  const io = new IntersectionObserver((entries) => {
    entries.filter((e) => e.isIntersecting).forEach((e, i) => {
      const el = e.target, delay = Math.min(i, 6) * 70;
      io.unobserve(el);
      el.style.transitionDelay = `${delay}ms`;
      el.classList.add("is-in");
      setTimeout(() => done(el), 900 + delay);
    });
  }, { rootMargin: "0px 0px -8% 0px" });
  targets.forEach((el) => { el.setAttribute("data-reveal", ""); io.observe(el); });
  $$(".step", mainEl).forEach((s) => { if (!targets.has(s)) s.classList.add("is-in"); }); // видимые сразу — линия уже заполнена
  root.classList.add("reveal-on");
  addEventListener("beforeprint", () => targets.forEach(done));
} else root.classList.add("no-reveal");
