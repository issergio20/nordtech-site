-- НОРД (nordtech.su): собственные таблицы поверх MODX 3 + miniShop2
-- СУБД: MariaDB 10.6+ / MySQL 8, utf8mb4. Префикс таблиц MODX — modx_ (уточнить на проде).
-- Регистрируются как xPDO-пакет "nord" (core/components/nord/), чтобы работать с ними через $modx->newObject().
--
-- Каталог (разделы, товары, бренды, характеристики, фото) НЕ дублируем — он живёт в штатных таблицах:
--   modx_site_content        разделы (msCategory) и товары (msProduct), URI, SEO-поля
--   modx_ms2_products        данные товара: vendor, article, popular (= «Топ-10»), new, favorite
--   modx_ms2_vendors         бренды: SHANMON, Lonking, CATch, Weichai ...
--   modx_ms2_options         справочник характеристик (ключ, тип, единица)
--   modx_ms2_category_options какие характеристики у какого раздела, порядок, обязательность
--   modx_ms2_product_options значения характеристик у товара
--   modx_ms2_product_files   галерея
-- Набор характеристик и правила их значений — в architecture.md, раздел «Каталог».

SET NAMES utf8mb4;

-- Филиалы: контакты на странице «Контакты» и маршрутизация заявок.
CREATE TABLE modx_nord_branches (
  id              INT UNSIGNED NOT NULL AUTO_INCREMENT,
  code            VARCHAR(32)  NOT NULL,                 -- chita | irkutsk | magadan | china
  city            VARCHAR(64)  NOT NULL,
  office_address  VARCHAR(255) NULL,
  yard_address    VARCHAR(255) NULL,                     -- площадка с техникой
  phone           VARCHAR(32)  NOT NULL,
  email           VARCHAR(128) NOT NULL,
  tg_chat_id      VARCHAR(64)  NULL,                     -- чат филиала для уведомлений о заявках
  kind            ENUM('branch','agent') NOT NULL DEFAULT 'branch', -- agent = представитель в Китае
  extra           JSON         NULL,                     -- имена и названия на китайском/английском для agent
  is_default      TINYINT(1)   NOT NULL DEFAULT 0,       -- куда идёт заявка без города
  is_active       TINYINT(1)   NOT NULL DEFAULT 1,
  sort            SMALLINT     NOT NULL DEFAULT 0,
  created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,  -- UTC (сервер и PHP в UTC)
  updated_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_branch_code (code),
  KEY ix_branch_active_sort (is_active, sort)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Заявки со всех форм. Хранятся в РФ (152-ФЗ), срок хранения — см. задачу очистки в architecture.md.
CREATE TABLE modx_nord_leads (
  id               INT UNSIGNED NOT NULL AUTO_INCREMENT,
  type             ENUM('price','consultation','leasing','question') NOT NULL,
  name             VARCHAR(128) NOT NULL,
  phone            VARCHAR(32)  NOT NULL,                -- нормализован в +7XXXXXXXXXX
  email            VARCHAR(128) NULL,
  comment          TEXT         NULL,
  product_id       INT UNSIGNED NULL,                    -- modx_site_content.id; NULL, если заявка не с товара
  product_title    VARCHAR(255) NULL,                    -- снимок названия: товар могут переименовать или удалить
  branch_id        INT UNSIGNED NULL,
  city_input       VARCHAR(64)  NULL,                    -- что выбрал пользователь, если поле «Город» есть в форме
  consent          TINYINT(1)   NOT NULL,                -- согласие на обработку ПДн
  consent_doc_ver  VARCHAR(16)  NOT NULL,                -- версия текста согласия на момент отправки
  page_url         VARCHAR(512) NOT NULL,
  utm              JSON         NULL,                    -- utm_source, utm_medium, utm_campaign, yclid
  ip               VARBINARY(16) NULL,                   -- INET6_ATON(); обнуляется задачей очистки
  submit_token     CHAR(36)     NOT NULL,                -- UUID формы: защита от двойной отправки
  status           ENUM('new','in_work','done','spam') NOT NULL DEFAULT 'new',
  notified_at      DATETIME     NULL,                    -- когда ушли письмо и Telegram; NULL = повторить
  created_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_lead_submit_token (submit_token),
  KEY ix_lead_created (created_at),
  KEY ix_lead_status_created (status, created_at),
  KEY ix_lead_type_created (type, created_at),
  KEY ix_lead_product (product_id),
  KEY ix_lead_branch (branch_id),
  KEY ix_lead_notify_retry (notified_at, created_at),
  CONSTRAINT chk_lead_consent CHECK (consent = 1),
  CONSTRAINT fk_lead_branch FOREIGN KEY (branch_id)
    REFERENCES modx_nord_branches (id) ON DELETE SET NULL   -- филиал закрыли — заявка остаётся
  -- product_id без внешнего ключа: modx_site_content — таблица ядра MODX (MyISAM на старых установках),
  -- товар может быть удалён; название сохранено в product_title.
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Стартовые данные филиалов (с текущей страницы «Контакты»). Email заменить на доменные адреса.
INSERT INTO modx_nord_branches (code, city, office_address, yard_address, phone, email, kind, is_default, sort) VALUES
  ('chita',   'Чита',    'ул. Трактовая, 7а, каб. 12-14', 'Трактовая, 50',              '+79143504141', 'user_nord@mail.ru', 'branch', 1, 10),
  ('irkutsk', 'Иркутск', 'ул. Сурикова, 2, каб. 36',      'ул. Трактовая, 14/20',       '+79248122218', 'user_nord@mail.ru', 'branch', 0, 20),
  ('magadan', 'Магадан', NULL,                            'Мерчиканский переулок, 36',  '+79960255455', 'user_nord@mail.ru', 'branch', 0, 30),
  ('china',   'Маньчжурия (Китай)', NULL, NULL,           '+8613134933773',             'wencaimzl@qq.com', 'agent', 0, 40);
