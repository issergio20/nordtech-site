-- Счётчик попыток уведомления: cron досылает не больше 3 раз, дальше заявка помечается в логе.
ALTER TABLE modx_nord_leads
  ADD COLUMN notify_attempts TINYINT UNSIGNED NOT NULL DEFAULT 0 AFTER notified_at,
  ADD COLUMN notify_error VARCHAR(255) NULL AFTER notify_attempts;
