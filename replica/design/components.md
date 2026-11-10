# UI kit НОРД — компоненты

Решение 2026-11-10: сайт пересобирается **в оригинальном дизайне nordtech.su**. UI kit — это исходный CSS сайта
(`site/src/assets/template/styles/nord.min.css`, BEM-классы), спрайт иконок и логотипов (`assets/template/img/sprites/sprite.svg`),
шрифт Onest (`assets/template/fonts/Onest.woff2`), те же библиотеки — Swiper 11 и Fancybox 5.
Поверх — тонкий слой правок `site/src/scss/main.scss`: доступность, новые состояния, то, что на оригинале делал его скрипт.

Живой образец всех компонентов: **`/ui-kit/`** (`site/src/ui-kit.njk`, `npm --prefix site run dev` → http://localhost:8080/ui-kit/).
Макросы компонентов: `site/src/_includes/ui/ui.njk` (1 макрос = 1 будущий чанк Fenom).

Что на оригинале делал скрипт и теперь делает `site/src/js/main.js`:
`--header-height`, `header--move` при прокрутке, `.header-menu.show` / `.hamburger.open`, `.search.show` + подсказки,
слайдеры с параметрами оригинала (сняты со `swiper.params` живого сайта), галерея Fancybox, `.faq__item.active`,
`.ui-input--active` (плавающая подпись), показ `.search-results`.

| компонент | классы оригинала | где | наши правки поверх |
| --- | --- | --- | --- |
| Шапка | `.header`, `.header--second` (внутренние), `.header--move` (главная при прокрутке), `.header__logo`, `.header__button`, `.header-nav`, `.header-dropdown`, `.header-search__button`, `.header__phone`, `.header__social-link`, `.hamburger` | все | `aria-label` у иконок и соцсетей, `aria-expanded` у бургера и поиска, `aria-current` в меню; «Каталог» на внутренних ведёт в `/katalog/` |
| Мобильное меню | `.header-menu`, `.header-menu.show`, `.header-menu__list`, `.logistics-link` | все | Esc, фокус в меню и обратно на бургер |
| Нижняя панель | `.nav-tab`, `.nav-tab__item.active` | мобильный | `<span>` вместо `<h3>` в пунктах (не заголовки), `aria-current` |
| Боковая навигация | `.sidebar`, `.sidebar__link` | главная | `<nav aria-label>` |
| Поиск | `.search`, `.search.show`, `.search__input`, `.search-results`, `.search-results__item` | все | подсказки из индекса каталога (в MODX — mSearch2), Esc, подпись поля |
| Кнопка «Логистика» | `.logistics-link.logistics-link--main` | все | — |
| Сетка фона | `.site-grid`, `.line--1…5` | все | `aria-hidden` |
| Крошки | `.breadcrumbs`, `.breadcrumbs__list`, `.breadcrumbs__item.active` | внутренние | `<nav aria-label>`, `aria-current`, микроразметка BreadcrumbList |
| Заголовки | `.section__title`, `--white`, `--indent`, `--indent-secondary`; `.section-title`, `--white` | все | на главной H1 видимый (на оригинале был `visually-hidden` «Главная») |
| Первый экран | `.about`, `.about__title`, `.about__btns`, `.about__btn`, `.about__link`, `.about__video`, `.section-icon` (#nord) | главная | видео `preload="none"`, на `prefers-reduced-motion` — только постер |
| Факты | `.why-we__blocks`, `.why-we__block-title`, `.why-we__slider` | главная | текст 3-го факта без противоречия с лизингом |
| Навигация слайдера | `.navigations`, `.navigations__btn--prev/--next`, `.navigations__text` | слайдеры | `aria-label` у стрелок; «Используйте клавиатуру» теперь правда — Swiper keyboard |
| Плитка раздела | `.catalog-slide`, `.catalog-slide__link`, `.catalog-slide__categories`, `.catalog-slide__img`, `.arrow` | главная, каталог | — |
| Карточка товара | `.card-product`, `__img`, `__equipment`, `__title`, `__availability`, `__availability--yellow`, `__specifications`, `__link` | главная, разделы, поиск | название — ссылка на товар; «Узнать стоимость» — `<button>` с `aria-label` «…: модель»; характеристики выводятся, если есть |
| Подразделы | `.categories-header`, `__links`, `__link`, `.active` | разделы | 5-й подраздел «Фронтальный погрузчик»; лимит 1099px снят, на узких — горизонтальная прокрутка |
| Фильтр по бренду | — (новое, вместо сломанного вывода `Array`) | разделы | `.brand-filter` в стиле `.categories-header__link`, настоящие чекбоксы |
| Пагинация | `.pagination`, `.pagination__item--prev/--next`, `.pagination__link`; «Показать еще N из M» | разделы | `.pagination__more` (на оригинале рисовал mSearch2), кнопки вместо ссылок в прототипе |
| Пустое состояние | — (на оригинале «Нечего фильтровать / Подходящих результатов не найдено.») | разделы, поиск | `.empty-state` в типографике оригинала + `.product-button` «Подобрать технику» |
| Товар | `.product`, `.product__row`, `.product-slider__main/__thumb`, `.product__availability`, `.product__description`, `.product__buttons`, `.product-button`, `--accent`, `.product__specifications` | товар | «Задать вопрос» открывает форму (на оригинале — ссылка в Telegram); без характеристик — блок «Запросить характеристики» |
| Этапы | `.stages-work__list/__item`, иконки 72px | главная | «оговорённые» вместо «говоренные» |
| Сервис | `.escort__slider`, `.escort__slide`, `__img`, `__title`, `__content` | главная, услуги | заголовки — ссылки на страницы услуг; дубли текста убраны; на `/uslug/` — сетка `.services-grid` |
| Лизинг (блок) | `.leasing`, `__header`, `__stages`, `__stage`, `.leasing__body-link`, `.leasing-link` | главная | «предварительное решение за 2 часа» |
| Лизинг (страница) | `.leasing-service`, `.service-header`, `.conditions-slider`, `.basic-conditions`, `.leasing-advantages`, `.leasing-registration`, `.leasing-registration-process` | лизинг | горизонтальные ленты с `tabindex=0` и `role=region` |
| Партнёры | `.partners__slider`, `.partners__slide` (логотипы из спрайта) | главная, о компании | `role=img` + имя у логотипа; автопрокрутка останавливается при наведении и выключена при reduced-motion |
| О компании | `.about-company`, `__benefits`, сертификаты `data-fancybox="certificate"` | о компании | подписи у ссылок-сертификатов, абсолютные пути |
| FAQ | `.faq`, `.faq__item`, `.faq__item.active`, `.faq__item-button`, `.faq__item-content` | о компании | `role=button`, `tabindex`, `aria-expanded`, Enter/Space |
| Контакты | `.contacts`, `.contacts__item`, `.active`, `.contacts__map`, `.contacts-china__item` | контакты | карта — виджет Яндекс Карт без ключа; кнопка «Показать … на карте» для клавиатуры; один блок Китая |
| Окно заявки | `.modal.modal--right.modal-feedback`, `.modal__close`, `.modal__title`, `.modal-feedback__form`, `.ui-input`, `.ui-input--textarea`, `.ui-input--active`, `.ui-checkbox`, `.button.button--blue`, `.modal-success__inner` | все | нативный `<dialog>` (фокус внутри, Esc, возврат фокуса), тип заявки по кнопке, текст ошибок под полями, маска телефона, защита от двойной отправки, «Заявка принята» |
| Политика | `.policy`, `.policy-container`, `.policy__content` | юридические | текст как на сайте; чужой домен и пустое согласие помечены `<mark>` |
| 404 | `.section-error` | 404 | — |
| Подвал | `.footer`, `__cooperating`, `__contacts`, `__developer` | все | `<footer>`, подписи у соцсетей |

## Доступность: что осталось на решение заказчика

Палитра оригинала не проходит WCAG AA (см. `tokens.json → _contrast_known`, тест `site/e2e/contrast.spec.js`).
Затемнение — 5 значений в одном месте `main.scss`, визуально почти незаметно (`#217bc5 → #1c6db0`). Не применено, потому что задача — дизайн 1:1.
