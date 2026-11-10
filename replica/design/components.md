# Компоненты nordtech.su

Значения — только из `tokens.css` (`var(--c-accent)`, `var(--sp-4)` …), без хардкода hex и px в компонентах.
Стек: MODX + Fenom + SCSS, без Tailwind (см. architecture.md). Каждый компонент — чанк Fenom `@FILE chunks/ui/{имя}.tpl` + SCSS-файл `scss/ui/_{имя}.scss` по БЭМ.
Иконки: **Lucide** (ISC) инлайн-SVG из спрайта `assets/icons/sprite.svg`. Логотипы производителей — только по дилерскому договору.
Шрифт: **Onest** (OFL), локально `woff2`, начертания 400/500/600/700/900, `font-display: swap`, preload для 400 и 900.
Живой образец всех примитивов: `replica/design/primitives.html`.

Общие правила
- Углы квадратные (`--r-none`). Скругление только у плашек статуса (`--r-sm`) и точек.
- Фокус: `outline: 2px solid var(--c-focus); outline-offset: 2px` только на `:focus-visible`; на тёмном фоне — `--c-focus-on-brand`.
- Анимации: `--m-base` + `--m-ease`; `prefers-reduced-motion` обнуляет длительности (уже в tokens.css).
- Цель касания на мобильном ≥ 44×44.

---

```
Button
  variants  primary (bg accent, текст on-accent)
            brand (bg surface-brand, текст on-brand) — шапка, иконочные кнопки
            outline (рамка 1px текущего цвета, фон прозрачный) — на героях поверх фото
            light (bg bg, текст text-brand) — «Перейти в каталог» на тёмном
            ghost (без рамки, текст accent) — «Подробнее», «Показать ещё»
  sizes     sm 36px, md 44px, lg 50px; иконочная квадратная = высота
  states    default, hover (accent-hover / подложка 8%), active (translateY(1px)),
            focus-visible (кольцо 2px), disabled (opacity .5, cursor not-allowed),
            loading (спиннер вместо иконки, текст остаётся, aria-busy="true", disabled)
  tokens    label 12/700 прописные, letter-spacing .02em; padding-inline sp-6; radius none
  icon      справа — стрелка (переход) или Telegram («Задать вопрос»), 20px, отделена вертикальной линией 1px
  a11y      <button> для действий, <a> для переходов; иконочная кнопка — aria-label;
            открывающая окно — aria-haspopup="dialog" aria-controls
  used on   все
```

```
Header
  variants  over-hero (прозрачный поверх героя, текст on-brand), solid (bg bg, рамка снизу border)
  parts     логотип → «/»; кнопка «Каталог» (brand, иконка grid); поиск (иконочная brand);
            телефон (ссылка tel:, label 14/700); соцсети VK, Telegram, OK (иконки 20px); бургер
  states    закреплена: после 80px прокрутки — solid + тень card-hover; меню открыто
  mobile    56px: логотип, телефон-иконка, бургер. Телефон на героe — on-brand, контраст 14:1
            (на текущем сайте почти не виден)
  a11y      <header>, ссылка «Перейти к содержимому» первой; телефон с aria-label «Позвонить 8 800 101-65-54»
  used on   все
```

```
TabBar (мобильная нижняя панель)
  items     Каталог, Поиск, Лизинг, Услуги — иконка 24 + caption 12/500
  states    default (text-muted), active (accent + полоса 2px сверху), pressed
  rules     только < 1024px; высота 64 + env(safe-area-inset-bottom); поверх контента z-tabbar;
            body получает padding-bottom = --tabbar-h
  a11y      <nav aria-label="Быстрые разделы">, aria-current="page" у активной
  used on   все (мобильные)
```

```
CatalogMenu (M04)
  variants  desktop: выпадающая панель на всю ширину под шапкой, 6 колонок разделов с подразделами
            mobile: полноэкранный drawer, разделы — аккордеоном
  states    закрыт, открыт, раздел раскрыт (mobile); пустые разделы не выводятся
  motion    панель: opacity + translateY(-8px→0), --m-base; drawer: translateX(100%→0), --m-slow
  a11y      кнопка aria-expanded; Esc закрывает и возвращает фокус на кнопку; ловушка фокуса в drawer
  used on   шапка
```

```
Breadcrumbs
  tokens    caption 12/500, text-muted, разделитель «/» border-strong, текущий — accent без ссылки
  rules     переносится на мобильном, а не обрезается; микроразметка BreadcrumbList
  a11y      <nav aria-label="Хлебные крошки"><ol>, aria-current="page"
  used on   S02–S07, S10, S13
```

```
Hero
  variants  home (фото/видео + затемнение overlay 65%, h1 + lead + 2 кнопки, знак бренда фоном)
            page (bg surface-brand, h1 + lead + кнопка)
  tokens    h1 fluid, lead 20/500 on-brand; высота home: min(100svh, 760px)
  states    видео: poster до загрузки, на мобильном и при reduced-motion — только poster
  a11y      фоновое видео muted, без звука, без управления; заголовок — настоящий <h1> (сейчас он visually-hidden)
  used on   S01, S03, S04, S10
```

```
Stat (счётчик-факт)
  parts     число stat 900 accent, подпись sm text-muted, максимум 2 строки
  states    на главной считает от 0 при появлении (IntersectionObserver), при reduced-motion — сразу итог
  a11y      итоговое число в DOM с самого начала, анимируется только отображение
  used on   S01
```

```
CategoryTile
  parts     фото 4:3 (object-fit cover), подпись в плашке bg + кнопка-стрелка brand в левом верхнем углу
  states    hover: фото scale(1.04) --m-slow, плашка → accent; focus-visible — кольцо по всей плитке
  a11y      вся плитка — одна ссылка; alt пустой (подпись уже есть)
  used on   S01, S02
```

```
ProductCard
  parts     фото 4:3 на surface; Badge наличия; метка «Максимальная комплектация» (caption, text-brand на surface);
            название h4 прописными, max 3 строки; 3 характеристики (dl, sm: muted / text);
            кнопка «Узнать стоимость» primary md на всю ширину
  states    default, hover (тень card-hover, фото scale 1.03), без фото (заглушка-силуэт техники, svg),
            без характеристик (блок не выводится, кнопка прижата вниз), focus-visible
  rules     карточки в ряду одной высоты (grid + кнопка margin-top:auto)
  a11y      <article>; ссылка на товар — название (растянута на карточку через ::after),
            кнопка — отдельный фокус и подпись aria-label «Узнать стоимость: {название}»
  used on   S01, S03, S04, S06
```

```
Badge (наличие)
  variants  in-stock: текст success на success-bg, точка success-line, «В наличии»
            on-order: текст warning на warning-bg, точка warning-line, «Под заказ»
  tokens    caption 12/500, padding 4/8, radius sm
  a11y      смысл передаёт текст, цвет — дополнение
  used on   карточки, S05
```

```
Carousel
  parts     трек Swiper, кнопки «назад/вперёд» (brand 36px), счётчик «3 / 10»
  states    первый/последний слайд — кнопка disabled; drag на тач-устройствах
  rules     без бесконечного дублирования слайдов (сейчас «Топ-10» показывает 5 товаров дважды);
            без подсказки «Используйте клавиатуру» — стрелки работают при фокусе на карусели
  a11y      region с aria-roledescription="карусель", слайды aria-label «3 из 10», без автопрокрутки
  used on   S01 (Топ-10, услуги)
```

```
SubcategoryTabs
  parts     горизонтальный список ссылок-плашек, активная — bg bg + текст text-brand на тёмном hero
  mobile    горизонтальная прокрутка с fade-краем, без переноса
  a11y      это ссылки на подразделы, не role="tab"; aria-current у активной
  used on   S03, S04
```

```
FilterBar (бренд, позже — характеристики)
  parts     чипы-чекбоксы брендов, счётчик товаров «N товаров» (правильные окончания: 1 товар, 2 товара, 5 товаров)
  states    нет вариантов → блок не выводится (сейчас печатает служебный Array); загрузка — карточки opacity .5
  a11y      <fieldset><legend>Бренд</legend>, настоящие checkbox; результат объявляется aria-live="polite"
  used on   S03, S04
```

```
Pagination + LoadMore
  parts     кнопка «Показать ещё 4» (ghost, lg, на всю ширину) + номера страниц ниже
  states    загрузка (кнопка loading), последняя страница (кнопка скрыта)
  rules     «Показать ещё» дописывает карточки и меняет URL (?page=N) через history.replaceState;
            номера страниц — настоящие ссылки для SEO
  a11y      <nav aria-label="Страницы">, aria-current; после подгрузки фокус на первую новую карточку
  used on   S03, S04, S06
```

```
EmptyState
  parts     иконка 48 (lucide package-search), h3, sm-текст, кнопка outline
  variants  пустой раздел («Скоро здесь появится техника» + «Подобрать под задачу» → M02),
            пустой поиск («Ничего не нашли по „{запрос}“» + подсказки + M02)
  used on   S03, S04, S06
```

```
Steps
  variants  row (главная: номер stat accent, h4, sm), list (лизинг: 0–5, вертикальная линия border)
  a11y      <ol>
  used on   S01, S10
```

```
Accordion (FAQ)
  parts     вопрос h4 + иконка plus/minus, ответ base
  states    закрыт, открыт (height-анимация через grid-template-rows 0fr→1fr), focus-visible
  a11y      <details>/<summary> — работает без JS; микроразметка FAQPage
  used on   S07
```

```
Gallery (товар)
  parts     главное фото 4:3, миниатюры 4 в ряд (5-я — «+N»), полноэкранный просмотр Fancybox
  states    одно фото — миниатюры не выводятся; загрузка — фон surface
  a11y      миниатюры — кнопки с aria-label «Фото 2 из 6», в просмотре стрелки и Esc
  used on   S05
```

```
SpecTable
  parts     <dl> в 2 колонки: название muted, значение text; строки через border снизу
  rules     единицы измерения из опций ms2, числа с неразрывным пробелом разрядов (11 200 кг)
  mobile    1 колонка
  used on   S05
```

```
Drawer (M01–M03)
  parts     панель справа drawer 480px (mobile — на весь экран), затемнение overlay 65%,
            крестик (brand 54px), заголовок h3 прописными, подпись muted, форма
  states    открыт, закрыт, отправка (кнопка loading), успех (форма заменяется сообщением и кнопкой «Закрыть»)
  motion    translateX(100%→0) --m-slow, затемнение opacity --m-base
  a11y      <dialog> c showModal(): ловушка фокуса, Esc, фокус на первое поле, возврат фокуса на кнопку-вызов;
            aria-labelledby на заголовок
  used on   M01, M02, M03
```

```
Field (Input / Textarea / Select)
  parts     <label> над полем (sm/500, не placeholder вместо label — сейчас подписи внутри поля), поле, подсказка/ошибка
  sizes     высота lg 50, textarea от 100
  states    default (рамка border-input), hover (text-muted), focus (рамка accent + кольцо),
            error (рамка danger, текст ошибки danger sm под полем, иконка), disabled (bg surface), readonly
            (название товара в M01 — readonly с подставленным значением)
  rules     телефон: type="tel", inputmode="tel", autocomplete="tel", маска +7 (___) ___-__-__;
            имя: autocomplete="name"; email: type="email" autocomplete="email"
  a11y      aria-invalid, aria-describedby на текст ошибки; ошибки валидируются при уходе с поля и при отправке
  used on   M01–M03
```

```
Checkbox (согласие)
  parts     квадрат 20, галочка on-accent на accent, подпись sm со ссылкой на /obrabotka-dannyh
  states    off, on, focus-visible, error (рамка danger + текст «Нужно согласие»)
  a11y      настоящий <input type="checkbox" required>, кликабельна вся подпись
  used on   M01–M03
```

```
Toast
  variants  success (полоса success слева), error (полоса danger) — текст text на bg, тень pop
  rules     справа внизу (mobile — над TabBar), 5 с, закрытие крестиком, максимум 2 одновременно
  a11y      контейнер role="status" aria-live="polite"; ошибки — role="alert"
  used on   после отправки форм
```

```
BranchCard
  parts     город h3, строки «Офис», «Площадка» (muted-подпись + адрес), телефон (ссылка tel:, h4), email (mailto:),
            кнопка «Маршрут» → Яндекс Карты
  variants  branch, agent (представитель в Китае: названия на китайском и английском, lang="zh")
  a11y      <address>
  used on   S13
```

```
PartnerLogos
  parts     сетка логотипов, grayscale → цвет при hover
  rules     выводится только при наличии прав на логотипы
  used on   S01, S07
```

```
Footer
  parts     bg surface-brand: логотип, меню (каталог, услуги, компания, контакты), телефон, соцсети,
            «© {год основания}–{текущий год} НОРД», политика, «Разработка сайта — ВостокВеб»
  a11y      <footer>, ссылки on-brand-muted → hover on-brand
  used on   все
```
