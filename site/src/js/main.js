import { submitLead, normalizePhone } from "./lead-api.js";

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---------- Шапка: состояние при прокрутке ---------- */
const header = $("[data-header]");
if (header) {
  const onScroll = () => header.classList.toggle("is-scrolled", scrollY > 80);
  addEventListener("scroll", onScroll, { passive: true });
  onScroll();
}

/* ---------- Поиск в шапке: первый клик раскрывает поле, второй — ищет ---------- */
$$(".header__search").forEach((f) => f.addEventListener("submit", (e) => {
  const input = $("input", f);
  if (input.value.trim().length < 2) { e.preventDefault(); input.focus(); }
}));

/* ---------- Меню (каталог, мобильное меню) ---------- */
let openMenu = null;
function closeMenu(returnFocus = true) {
  if (!openMenu) return;
  const { panel, btn } = openMenu;
  panel.hidden = true;
  $$(`[aria-controls="${panel.id}"]`).forEach((b) => b.setAttribute("aria-expanded", "false"));
  document.body.classList.remove("menu-open");
  if (returnFocus) btn.focus();
  openMenu = null;
}
$$("[data-menu-toggle]").forEach((btn) =>
  btn.addEventListener("click", () => {
    const panel = document.getElementById(btn.dataset.menuToggle);
    const wasOpen = openMenu?.panel === panel;
    closeMenu(false);
    if (wasOpen) return;
    panel.hidden = false;
    btn.setAttribute("aria-expanded", "true");
    document.body.classList.add("menu-open");
    openMenu = { panel, btn };
    $("a, button", panel)?.focus();
  })
);
$$("[data-menu-close]").forEach((b) => b.addEventListener("click", () => closeMenu()));
addEventListener("keydown", (e) => { if (e.key === "Escape") closeMenu(); });
addEventListener("click", (e) => {
  if (openMenu && !openMenu.panel.contains(e.target) && !openMenu.btn.contains(e.target)) closeMenu(false);
});

/* ---------- Уведомления ---------- */
function toast(kind, title, text) {
  const box = $("#toasts");
  if (!box) return;
  const el = document.createElement("div");
  el.className = `toast toast--${kind}`;
  el.setAttribute("role", kind === "error" ? "alert" : "status");
  el.innerHTML = `<svg class="icon"><use href="#i-${kind === "error" ? "alert" : "check"}"/></svg><div><b></b><p></p></div>
    <button class="toast__close" type="button" aria-label="Закрыть уведомление"><svg class="icon"><use href="#i-x"/></svg></button>`;
  $("b", el).textContent = title;
  $("p", el).textContent = text;
  $(".toast__close", el).onclick = () => el.remove();
  box.append(el);
  while (box.children.length > 2) box.firstElementChild.remove();
  setTimeout(() => el.remove(), 6000);
}

/* ---------- Окно заявки (M01–M03, вопрос) ---------- */
const LEAD = {
  price: { title: "Узнать стоимость", sub: "Менеджер перезвонит и назовёт цену с доставкой до вашего объекта.", submit: "Узнать цену", fields: ["product", "city"] },
  question: { title: "Вопрос по технике", sub: "Спросите про комплектацию, сроки или доставку — ответим по телефону или в мессенджере.", submit: "Отправить вопрос", fields: ["product", "comment"] },
  leasing: { title: "Заявка на лизинг", sub: "Рассчитаем платёж и подберём лизинговую компанию. Документы в банк подаём сами.", submit: "Рассчитать лизинг", fields: ["product", "city", "comment"] },
  consultation: { title: "Консультация", sub: "Расскажите о задаче — подберём технику под объём работ и условия.", submit: "Получить консультацию", fields: ["city", "comment"] },
};
const dlg = $("#lead-dialog");
let opener = null;

function openLead(btn) {
  const type = LEAD[btn.dataset.lead] ? btn.dataset.lead : "consultation";
  const cfg = LEAD[type];
  const form = $("[data-lead-form]", dlg);
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
  form.product_id.value = btn.dataset.productId || "";
  form.product_title.value = title;
  form.page_url.value = location.pathname;
  form.submit_token.value = crypto.randomUUID();
  $("[data-lead-body]", dlg).hidden = false;
  $("[data-lead-done]", dlg).hidden = true;
  opener = btn;
  dlg.showModal();
  form.elements.name.focus(); // не form.name: это имя самой формы
}
document.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-lead]");
  if (btn) { e.preventDefault(); openLead(btn); }
});
$$("[data-dialog-close]", dlg).forEach((b) => b.addEventListener("click", () => dlg.close()));
dlg?.addEventListener("click", (e) => { if (e.target === dlg) dlg.close(); });
dlg?.addEventListener("close", () => opener?.focus());

function showErrors(form, errors) {
  let first = null;
  for (const [name, msg] of Object.entries(errors)) {
    const input = form.elements[name];
    const err = document.getElementById(`lead-${name}-err`);
    if (!input || !err) continue;
    input.setAttribute("aria-invalid", "true");
    err.textContent = msg;
    err.hidden = false;
    first ||= input;
  }
  first?.focus();
}
function clearError(input) {
  input.removeAttribute("aria-invalid");
  const err = document.getElementById(`lead-${input.name}-err`);
  if (err) err.hidden = true;
}

const form = $("[data-lead-form]");
if (form) {
  // Маска телефона: +7 (XXX) XXX-XX-XX
  form.phone.addEventListener("input", () => {
    const el = form.phone;
    const raw = el.value;
    const caret = el.selectionStart ?? raw.length;
    // Сколько цифр стояло перед курсором — после форматирования курсор ставим после того же числа цифр (BUG-001)
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
  form.phone.addEventListener("blur", () => {
    if (form.phone.value && !normalizePhone(form.phone.value)) showErrors(form, { phone: "Введите номер полностью: +7 и 10 цифр" });
  });
  $$("input, textarea", form).forEach((i) => i.addEventListener("input", () => clearError(i)));
  form.consent.addEventListener("change", () => clearError(form.consent));

  let busy = false;
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (busy) return;
    const fields = Object.fromEntries(new FormData(form));
    fields.consent = form.consent.checked ? "1" : "";
    fields.consent_doc_ver = document.documentElement.dataset.consentVer || "2026-11";
    const btn = $("[type=submit]", form);
    busy = true;
    btn.disabled = true;
    btn.setAttribute("aria-busy", "true");
    const label = $("[data-submit-label]", btn);
    const prev = label.textContent;
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
      showErrors(form, res.errors);
    } else if (res.message && res.message !== "network" && res.message !== "server") {
      toast("error", "Не удалось отправить", res.message);
    } else {
      toast("error", "Не удалось отправить", "Проверьте интернет и попробуйте ещё раз или позвоните 8 800 101-65-54.");
    }
  });
}

/* ---------- Каталог: фильтр по бренду и «Показать ещё» ---------- */
$$("[data-catalog]").forEach((root) => {
  const cards = $$("[data-cards] > .card", root);
  const more = $("[data-more]", root);
  const count = $("[data-count]", root);
  const size = +root.dataset.pageSize || 8;
  let shown = size;
  const plural = (n) => {
    const a = n % 100, b = n % 10;
    return `${n} ${a > 10 && a < 20 ? "моделей" : b === 1 ? "модель" : b > 1 && b < 5 ? "модели" : "моделей"}`;
  };
  function render() {
    const vendors = $$("[data-filter] input:checked", root).map((i) => i.value);
    const match = cards.filter((c) => !vendors.length || vendors.includes(c.dataset.vendor));
    cards.forEach((c) => (c.hidden = true));
    match.slice(0, shown).forEach((c) => (c.hidden = false));
    if (count) count.textContent = plural(match.length);
    if (more) {
      const rest = match.length - shown;
      more.hidden = rest <= 0;
      more.textContent = `Показать ещё ${Math.min(rest, size)}`;
    }
    return match;
  }
  $$("[data-filter] input", root).forEach((i) => i.addEventListener("change", () => { shown = size; render(); }));
  more?.addEventListener("click", () => {
    const before = shown;
    shown += size;
    const match = render();
    $("a", match[before])?.focus();
  });
  render();
});

/* ---------- Галерея товара ---------- */
$$("[data-gallery]").forEach((g) => {
  const thumbs = $$("[data-thumb]", g);
  const count = $("[data-gallery-count]", g);
  const main = $(".gallery__media", g);
  thumbs.forEach((t) => t.addEventListener("click", () => {
    thumbs.forEach((x) => x.removeAttribute("aria-current"));
    t.setAttribute("aria-current", "true");
    const total = count.textContent.split("/")[1].trim();
    count.textContent = `${t.dataset.thumb} / ${total}`;
    main.setAttribute("aria-label", main.getAttribute("aria-label").replace(/\d+ из/, `${t.dataset.thumb} из`));
  }));
});

/* ---------- Карусель на scroll-snap ---------- */
$$("[data-carousel]").forEach((c) => {
  const track = $("[data-track]", c);
  const prev = $("[data-prev]", c), next = $("[data-next]", c);
  const step = () => track.firstElementChild.getBoundingClientRect().width + parseFloat(getComputedStyle(track).columnGap || 0);
  const update = () => {
    prev.disabled = track.scrollLeft <= 2;
    next.disabled = track.scrollLeft + track.clientWidth >= track.scrollWidth - 2;
  };
  prev.addEventListener("click", () => track.scrollBy({ left: -step(), behavior: reduced ? "auto" : "smooth" }));
  next.addEventListener("click", () => track.scrollBy({ left: step(), behavior: reduced ? "auto" : "smooth" }));
  track.addEventListener("scroll", update, { passive: true });
  addEventListener("resize", update);
  update();
});

/* ---------- Счётчики на главной ---------- */
const stats = $$("[data-count-to]");
if (stats.length && !reduced && "IntersectionObserver" in window) {
  const io = new IntersectionObserver((entries) => entries.forEach((en) => {
    if (!en.isIntersecting) return;
    io.unobserve(en.target);
    const el = en.target, to = +el.dataset.countTo, from = to > 1900 ? to - 30 : 0, t0 = performance.now();
    const fmt = (n) => (to > 1900 ? String(n) : n.toLocaleString("ru-RU"));
    const tick = (t) => {
      const k = Math.min(1, (t - t0) / 900);
      el.textContent = fmt(Math.round(from + (to - from) * (1 - (1 - k) ** 3)));
      if (k < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }), { threshold: 0.6 });
  stats.forEach((s) => io.observe(s));
}

/* ---------- Поиск (S06): в MODX — mSearch2, здесь — по индексу ---------- */
const results = $("[data-search-results]");
if (results) {
  const q = new URLSearchParams(location.search).get("query")?.trim() || "";
  const input = $("#q-page");
  input.value = q;
  const SYN = { "лонкинг": "lonking", "шанмон": "shanmon", "фронтальник": "фронтальный", "дгу": "дизель-генератор", "экскаватор": "экскаватор" };
  const norm = (s) => s.toLowerCase().replace(/ё/g, "е");
  const terms = norm(q).split(/\s+/).filter(Boolean).map((t) => SYN[t] || t);
  const status = $("[data-search-status]");
  if (!q) {
    status.textContent = "Введите модель, бренд или тип техники.";
  } else {
    const idx = JSON.parse($("#search-index").textContent);
    const hits = idx.filter((p) => terms.every((t) => norm(p.text).includes(t.slice(0, Math.max(4, t.length - 2)))));
    const cards = $$("[data-search-card]", results);
    cards.forEach((c) => (c.hidden = !hits.some((h) => h.slug === c.dataset.searchCard)));
    const n = hits.length;
    status.textContent = n ? `По запросу «${q}» — ${n} ${n % 10 === 1 && n % 100 !== 11 ? "модель" : [2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100) ? "модели" : "моделей"}` : "";
    $("[data-search-empty]").hidden = n > 0;
    $("[data-search-empty-q]").textContent = q;
  }
}
