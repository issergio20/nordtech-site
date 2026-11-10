# Backend nordtech.su

Код: `modx/` — кладётся поверх сайта MODX 3 (`core/components/nord`, `assets/components/nord`, `cron/`).
Статус на 2026-11-10: **код написан, но ни разу не запускался** — на рабочей машине нет PHP и MySQL. Первая проверка — на staging (см. «Запуск»).

## Что есть

| часть | файл | что делает |
| --- | --- | --- |
| Миграции | `core/components/nord/migrations/*.sql`, `migrate.php` | таблицы филиалов и заявок + стартовые филиалы; применяются один раз, журнал в `nord_migrations` |
| Приём заявок | `assets/components/nord/lead.php` → `src/LeadService.php` | проверка полей на сервере, ловушка + SmartCaptcha + не больше 5 заявок с IP за 10 минут, запись с защитой от дублей (`submit_token`, `INSERT IGNORE`), название товара — из базы, а не из формы |
| Уведомления | `src/Notifier.php` | письмо на email филиала (почта MODX + SMTP) и сообщение в Telegram-чат филиала; успех, если дошёл хотя бы один канал |
| Досылка | `cron/leads.php renotify` (каждые 5 мин) | до 3 попыток; «застрявшие» заявки — в журнал ошибок MODX |
| Сроки ПДн | `cron/leads.php purge` (раз в сутки) | IP стираются через 30 дней, спам удаляется через 30 дней, заявки — через 3 года (`NORD_LEADS_RETENTION_YEARS`) |
| Бэкап | `cron/backup.sh` | дамп БД + файлы, проверка дампа, копия в S3 в РФ, хранение 14 дней |
| Админка | сниппет `nordLeadsWidget` (виджет дашборда) + `assets/components/nord/export.php` | последние 50 заявок с отметкой «уведомление не ушло», CSV за 90 дней; только для права `nord_leads_view` |
| Секреты | `.env.example` | список переменных без значений |
| Тесты | `core/components/nord/tests/LeadServiceTest.php` | 17 проверок: телефон, валидация, белые списки, текст уведомления; без MODX и БД |
| Фронт | `site/src/js/lead-api.js` | при `window.NORD_LEAD_ENDPOINT` шлёт на `lead.php`, добавляет UTM и токен SmartCaptcha (`window.NORD_CAPTCHA_SITEKEY`) |

## Отличия от architecture.md

- **Свой эндпоинт `lead.php` вместо FetchIt + FormIt.** FetchIt завязан на свой протокол сессии и разметку; свой эндпоинт — 50 строк, проверяется напрямую и даёт точный контракт для `lead-api.js`. FetchIt можно удалить.
- **Запросы через PDO вместо xPDO-модели.** Для двух таблиц генерация модели — лишний шаг сборки. Все запросы подготовленные.
- **Виджет дашборда вместо CMP.** Смены статуса из админки пока нет — это следующий шаг, если менеджеры будут вести заявки на сайте, а не в CRM.
- **Колонки `notify_attempts`, `notify_error`** — миграция 002, обновлено и в `replica/schema.sql`.

## Чего нет и почему

- **Авторизации посетителей и оплаты** нет и не нужно: на сайте нет кабинета и онлайн-оплаты (см. recon).
- **CRM** (Битрикс24, amoCRM) не подключена: клиент не назвал CRM. Добавляется ещё одним каналом в `Notifier`.

## Что должен сделать владелец аккаунтов (не Claude)

1. Создать бота в @BotFather, добавить его в чаты филиалов, вписать `tg_chat_id` в таблицу филиалов, токен — в `NORD_TG_BOT_TOKEN`.
2. Завести ящик на домене (например, `site@nordtech.su`), настроить SPF, DKIM, DMARC, вписать SMTP в системные настройки MODX.
3. Заменить `user_nord@mail.ru` в таблице филиалов на доменные адреса филиалов.
4. Yandex Cloud → SmartCaptcha: создать капчу для nordtech.su; серверный ключ — в окружение, клиентский — в шаблон.
5. Создать политику доступа с правом `nord_leads_view` и выдать её группе менеджеров.
6. Включить бэкапы у хостинга, заполнить `/etc/nord-backup.env`.

## Запуск на staging

```bash
php core/components/nord/tests/LeadServiceTest.php
php core/components/nord/migrate.php --status
php core/components/nord/migrate.php
curl -X POST https://staging.nordtech.su/assets/components/nord/lead.php -d "type=price&name=Тест&phone=89990000000&consent=1&submit_token=$(uuidgen)"
php cron/leads.php renotify
```

Затем в шаблон сайта: `<script>window.NORD_LEAD_ENDPOINT="/assets/components/nord/lead.php"</script>` и в кнопках `data-product-id="{$id}"` (ID ресурса, а не slug, как в прототипе).

## Чек-лист безопасности

- [x] секреты только в окружении; `.env.example` без значений; токен бота не пишется в лог
- [x] все входные данные проверяются на сервере: типы, длины, белые списки (`type`, `city`, `product_id`, `page_url`, UTM)
- [x] доступ к заявкам: виджет и CSV проверяют сессию менеджера и право `nord_leads_view`; публичных запросов на чтение нет
- [ ] доступ проверен вторым пользователем без права — **на staging**
- [x] ограничение частоты: 5 заявок с IP за 10 минут → спам без уведомления
- [x] запросы с чужого Origin отклоняются; тело больше 20 КБ отклоняется
- [n/a] вебхуки — входящих нет
- [n/a] загрузка файлов — нет
- [x] данных заявок нет в URL и логах (ошибки логируются без полей заявки); выгрузка CSV пишется в журнал MODX
- [x] CSV защищён от формул в ячейках
- [ ] `composer audit` / обновления MODX и дополнений — **на staging**
- [ ] политика конфиденциальности перечисляет обработчиков: хостинг, почтовый сервис, Telegram (передача ПДн за рубеж — согласовать с юристом клиента), Yandex SmartCaptcha, Яндекс Метрика
- [ ] время БД в UTC (`SELECT @@global.time_zone`) — **на staging**; от этого зависят досылка и очистка
- [ ] `cron/` закрыт от веба в nginx
