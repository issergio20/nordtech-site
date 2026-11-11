// Общий модуль для обоих вариантов (вариант 2 получает его копией при сборке, см. eleventy.config.js).
//
// 1. Необычный курсор: точка, которая идёт за мышью без задержки, и кольцо, которое догоняет её с инерцией.
//    Над ссылками и кнопками кольцо раскрывается, при нажатии сжимается. Только мышь (pointer: fine) и только без
//    «уменьшить движение»; над полями ввода — обычный текстовый курсор.
//    Производительность: координаты пишутся прямо в style.transform двух маленьких элементов (не в CSS-переменную
//    на <html> — она пересчитала бы стили всех потомков), цикл requestAnimationFrame работает, только пока кольцо
//    догоняет точку, и останавливается, когда мышь замерла.
// 2. «Шторка» первого экрана: он закреплён (CSS sticky), следующий блок наезжает поверх. Когда экран закрыт целиком —
//    видео на паузе (иначе декодировало бы кадры всё время, пока читают страницу) и сам экран скрыт.

const INTERACTIVE = "a, button, summary, label, select, [role='button'], [data-lead], .tile, .catalog-slide, .card-product, .p-card";
const TEXT = "input:not([type='checkbox']):not([type='radio']):not([type='submit']):not([type='button']), textarea, [contenteditable='true']";

export function initCursor() {
  const fine = matchMedia("(hover: hover) and (pointer: fine)");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  if (!fine.matches || reduced.matches) return;

  const dot = document.createElement("div");
  const ring = document.createElement("div");
  dot.className = "cursor-dot";
  ring.className = "cursor-ring";
  dot.setAttribute("aria-hidden", "true");
  ring.setAttribute("aria-hidden", "true");
  document.body.append(ring, dot);
  document.documentElement.classList.add("has-cursor");

  let x = -100, y = -100;   // мышь
  let rx = -100, ry = -100; // кольцо
  let running = false;

  // JS двигает только внешний слой; размер кольца меняет CSS-переход на ::before (классы is-link / is-down)
  const place = (el, px, py) => { el.style.transform = `translate3d(${px}px, ${py}px, 0)`; };

  const tick = () => {
    // Кольцо догоняет точку: 18% расстояния за кадр — заметная инерция без «резиновости»
    rx += (x - rx) * 0.18;
    ry += (y - ry) * 0.18;
    place(ring, rx, ry);
    if (Math.abs(x - rx) > 0.1 || Math.abs(y - ry) > 0.1) requestAnimationFrame(tick);
    else running = false;
  };
  const wake = () => { if (!running) { running = true; requestAnimationFrame(tick); } };

  addEventListener("pointermove", (e) => {
    if (e.pointerType !== "mouse") return;
    x = e.clientX; y = e.clientY;
    place(dot, x, y);
    const t = e.target instanceof Element ? e.target : null;
    const overText = !!t?.closest(TEXT);
    const overLink = !overText && !!t?.closest(INTERACTIVE);
    document.documentElement.classList.toggle("cursor-text", overText);
    ring.classList.toggle("is-link", overLink);
    if (!ring.classList.contains("is-on")) { rx = x; ry = y; ring.classList.add("is-on"); dot.classList.add("is-on"); }
    wake();
  }, { passive: true });
  addEventListener("pointerdown", (e) => { if (e.pointerType === "mouse") { ring.classList.add("is-down"); } });
  addEventListener("pointerup", () => ring.classList.remove("is-down"));
  // Курсор ушёл за окно — прячем, чтобы кольцо не висело у края
  document.addEventListener("mouseleave", () => { ring.classList.remove("is-on"); dot.classList.remove("is-on"); });

  // Пользователь включил «уменьшить движение» на лету — возвращаем обычный курсор
  reduced.addEventListener?.("change", () => {
    ring.remove(); dot.remove();
    document.documentElement.classList.remove("has-cursor", "cursor-text");
  });
}

export function heroCurtain(hero, video) {
  // Когда следующий блок полностью закрыл первый экран: видео на паузу (не декодирует зря),
  // а сам экран прячется (класс is-covered), чтобы не просвечивать сквозь прозрачные блоки ниже
  if (!hero) return;
  let ticking = false, covered = null;
  const check = () => {
    ticking = false;
    const now = scrollY > innerHeight * 1.02;
    if (now === covered) return;
    covered = now;
    hero.classList.toggle("is-covered", now);
    if (!video) return;
    if (now && !video.paused) video.pause();
    else if (!now && video.paused && video.hasAttribute("autoplay")) video.play().catch(() => {});
  };
  addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(check); } }, { passive: true });
  check();
}
