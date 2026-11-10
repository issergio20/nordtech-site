<?php
/**
 * GET /assets/components/nord/export.php — CSV заявок за 90 дней (без спама и IP).
 * Только для авторизованного менеджера с правом nord_leads_view.
 */
declare(strict_types=1);

require dirname(__DIR__, 3) . '/core/components/nord/bootstrap.php';
$modx = nord_modx('mgr');

if (!$modx->user || !$modx->user->hasSessionContext('mgr') || !$modx->hasPermission('nord_leads_view')) {
    http_response_code(403);
    exit('Нет доступа');
}

$cfg = new Nord\Config($modx);
$modx->connect();
$st = $modx->pdo->prepare('SELECT l.id, l.created_at, l.type, l.name, l.phone, l.email, l.comment, l.product_title,
        b.city AS branch, l.status, l.page_url
    FROM ' . $cfg->table('leads') . ' l LEFT JOIN ' . $cfg->table('branches') . " b ON b.id = l.branch_id
    WHERE l.status <> 'spam' AND l.created_at > UTC_TIMESTAMP() - INTERVAL 90 DAY ORDER BY l.id DESC");
$st->execute();

$modx->log(\MODX\Revolution\modX::LOG_LEVEL_INFO, '[nord] выгрузка заявок: пользователь ' . $modx->user->get('username'));

header('Content-Type: text/csv; charset=utf-8');
header('Content-Disposition: attachment; filename="nord-leads-' . gmdate('Y-m-d') . '.csv"');
header('Cache-Control: no-store');
$out = fopen('php://output', 'w');
fwrite($out, "\xEF\xBB\xBF"); // BOM — чтобы Excel открыл кириллицу
fputcsv($out, ['№', 'Создана (UTC)', 'Тип', 'Имя', 'Телефон', 'Почта', 'Комментарий', 'Техника', 'Филиал', 'Статус', 'Страница'], ';');
while ($row = $st->fetch(PDO::FETCH_NUM)) {
    // Защита от CSV-инъекций: =, @, tab, CR и +/- не перед цифрой экранируются (телефоны +7… остаются как есть)
    $row = array_map(static fn ($v) => is_string($v) && preg_match('/^(?:[=@\t\r]|[+\-](?!\d))/', $v) ? "'" . $v : $v, $row);
    fputcsv($out, $row, ';');
}
