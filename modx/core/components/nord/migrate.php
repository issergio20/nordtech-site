<?php
/**
 * Применяет SQL-миграции из migrations/ по порядку, один раз каждую.
 *   php core/components/nord/migrate.php          — применить новые
 *   php core/components/nord/migrate.php --status — показать, что применено
 * Префикс «modx_» в файлах заменяется на table_prefix сайта.
 */
declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    http_response_code(403);
    exit;
}
require __DIR__ . '/bootstrap.php';
$modx = nord_modx('mgr');
$prefix = (string) $modx->getOption('table_prefix', null, 'modx_');
$modx->connect();
$pdo = $modx->pdo;
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

$pdo->exec("CREATE TABLE IF NOT EXISTS `{$prefix}nord_migrations` (
  name VARCHAR(128) NOT NULL PRIMARY KEY,
  applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

$applied = $pdo->query("SELECT name FROM `{$prefix}nord_migrations`")->fetchAll(PDO::FETCH_COLUMN);
$files = glob(__DIR__ . '/migrations/*.sql');
sort($files, SORT_STRING);

if (in_array('--status', $argv, true)) {
    foreach ($files as $f) {
        printf("%s  %s\n", in_array(basename($f), $applied, true) ? 'OK  ' : 'NEW ', basename($f));
    }
    exit(0);
}

foreach ($files as $file) {
    $name = basename($file);
    if (in_array($name, $applied, true)) {
        continue;
    }
    $sql = str_replace('modx_', $prefix, (string) file_get_contents($file));
    // Убираем комментарии и делим на запросы по «;» в конце строки
    $sql = preg_replace('/^\s*--.*$/m', '', $sql);
    $statements = array_filter(array_map('trim', preg_split('/;\s*$/m', $sql)));
    echo "→ {$name}\n";
    try {
        // DDL в MySQL коммитится сам, поэтому транзакция защищает только INSERT/UPDATE
        foreach ($statements as $st) {
            $pdo->exec($st);
        }
        $ins = $pdo->prepare("INSERT INTO `{$prefix}nord_migrations` (name) VALUES (?)");
        $ins->execute([$name]);
    } catch (Throwable $e) {
        fwrite(STDERR, "Ошибка в {$name}: {$e->getMessage()}\nОстановлено. Исправьте и запустите снова.\n");
        exit(1);
    }
}
echo "Готово.\n";
