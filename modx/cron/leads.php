<?php
/**
 * Фоновые задачи по заявкам.
 *   php cron/leads.php renotify   — каждые 5 минут: досылает недошедшие уведомления
 *   php cron/leads.php purge      — раз в сутки: сроки хранения ПДн
 * Лочится через flock, чтобы два запуска не пересекались.
 */
declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    exit(1);
}
$task = $argv[1] ?? '';
if (!in_array($task, ['renotify', 'purge'], true)) {
    fwrite(STDERR, "Использование: php cron/leads.php renotify|purge\n");
    exit(2);
}

$lock = fopen(sys_get_temp_dir() . "/nord-leads-{$task}.lock", 'c');
if (!flock($lock, LOCK_EX | LOCK_NB)) {
    exit(0); // предыдущий запуск ещё работает
}

// cron/ лежит рядом с core/ в корне сайта
require dirname(__DIR__) . '/core/components/nord/bootstrap.php';
$modx = nord_modx('mgr');
$cfg = new Nord\Config($modx);
$service = new Nord\LeadService($modx, $cfg, new Nord\Notifier($modx, $cfg));

$result = $task === 'renotify' ? $service->renotify() : $service->purge();
$line = date('c') . " {$task} " . json_encode($result);
echo $line, "\n";

if ($task === 'renotify' && ($result['stuck'] ?? 0) > 0) {
    // «Мёртвые» заявки: 3 попытки не удались. Пишем в журнал ошибок MODX — его видно в админке.
    $modx->log(\MODX\Revolution\modX::LOG_LEVEL_ERROR, "[nord] {$result['stuck']} заявок не удалось доставить за 3 попытки — проверьте почту и Telegram-бота, заявки есть в виджете «Заявки»");
}
