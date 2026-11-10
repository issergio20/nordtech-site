#!/usr/bin/env bash
# Ежедневный бэкап: дамп БД + загруженные файлы, хранение 14 дней, копия во внешнее хранилище в РФ.
# Переменные — в /etc/nord-backup.env (права 600): DB_NAME, DB_USER, DB_PASS, SITE_DIR, BACKUP_DIR, [S3_BUCKET, S3_ENDPOINT]
set -euo pipefail
source /etc/nord-backup.env

STAMP=$(date -u +%Y%m%d-%H%M)
DEST="$BACKUP_DIR/$STAMP"
mkdir -p "$DEST"

MYSQL_PWD="$DB_PASS" mysqldump --single-transaction --routines --no-tablespaces -u "$DB_USER" "$DB_NAME" | gzip > "$DEST/db.sql.gz"
tar -czf "$DEST/files.tar.gz" -C "$SITE_DIR" assets/images assets/files core/components/nord 2>/dev/null || true

# Проверка, что дамп не пустой и читается
gzip -t "$DEST/db.sql.gz"
[ "$(stat -c%s "$DEST/db.sql.gz")" -gt 10000 ] || { echo "дамп подозрительно мал" >&2; exit 1; }

# Внешняя копия (например, Selectel / Timeweb S3) — если настроено
if [ -n "${S3_BUCKET:-}" ]; then
  aws --endpoint-url "$S3_ENDPOINT" s3 cp --recursive "$DEST" "s3://$S3_BUCKET/nord/$STAMP/" --only-show-errors
fi

find "$BACKUP_DIR" -mindepth 1 -maxdepth 1 -type d -mtime +14 -exec rm -rf {} +
echo "$(date -u +%FT%TZ) backup ok $DEST"
