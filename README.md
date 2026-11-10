# НОРД — новый nordtech.su

Пересборка сайта дилера спецтехники НОРД на MODX 3 + miniShop2.

| папка | что внутри |
| --- | --- |
| `replica/` | разбор текущего сайта, архитектура, схема БД, дизайн-система, журнал сборки, backend-чеклист |
| `site/` | статичная вёрстка на Eleventy + SCSS (прототип перед натяжкой на MODX) |
| `modx/` | серверная часть: компонент `nord` (заявки, уведомления), cron, бэкап |

Запуск вёрстки:

```bash
npm --prefix site install
npm --prefix site run dev   # http://localhost:8080
```

Backend проверяется на staging — см. `replica/backend.md`.
