<?php
/**
 * Сниппет для виджета дашборда MODX «Заявки с сайта» (Дашборды → Виджеты → тип «Сниппет», имя nordLeadsWidget).
 * Показывает последние 50 заявок без спама. Доступ к виджету — только группе менеджеров (настройка дашборда).
 * Смена статуса и полноценная таблица с фильтрами — следующий шаг (CMP), см. replica/backend.md.
 *
 * @var \MODX\Revolution\modX $modx
 */
declare(strict_types=1);

if (!$modx->user || !$modx->user->hasSessionContext('mgr') || !$modx->hasPermission('nord_leads_view')) {
    return '<p>Нет доступа к заявкам.</p>';
}
require_once MODX_CORE_PATH . 'components/nord/bootstrap.php';
require_once MODX_CORE_PATH . 'components/nord/src/Config.php';
require_once MODX_CORE_PATH . 'components/nord/src/Notifier.php';
require_once MODX_CORE_PATH . 'components/nord/src/LeadService.php';

$cfg = new Nord\Config($modx);
$service = new Nord\LeadService($modx, $cfg, new Nord\Notifier($modx, $cfg));
$rows = $service->latest(50);

$e = static fn ($v) => htmlspecialchars((string) $v, ENT_QUOTES, 'UTF-8');
$types = ['price' => 'Цена', 'consultation' => 'Консультация', 'leasing' => 'Лизинг', 'question' => 'Вопрос'];
$statuses = ['new' => 'новая', 'in_work' => 'в работе', 'done' => 'закрыта', 'spam' => 'спам'];
$tz = new DateTimeZone((string) $modx->getOption('nord.manager_tz', null, 'Asia/Irkutsk'));

$html = '<p><a href="' . $e(MODX_ASSETS_URL . 'components/nord/export.php') . '" class="x-btn">Скачать CSV за 90 дней</a></p>';
if (!$rows) {
    return $html . '<p>Заявок пока нет.</p>';
}
$html .= '<table class="table" style="width:100%;border-collapse:collapse"><thead><tr>'
    . '<th>#</th><th>Когда</th><th>Тип</th><th>Имя и телефон</th><th>Техника</th><th>Филиал</th><th>Статус</th><th>Уведомление</th>'
    . '</tr></thead><tbody>';
foreach ($rows as $r) {
    $when = (new DateTimeImmutable($r['created_at'], new DateTimeZone('UTC')))->setTimezone($tz)->format('d.m H:i');
    $notified = $r['notified_at'] ? '✓' : '<b style="color:#c62f2f">не ушло</b> ' . $e($r['notify_error']);
    $html .= '<tr style="border-top:1px solid #d9d9d9">'
        . '<td>' . (int) $r['id'] . '</td>'
        . '<td>' . $e($when) . '</td>'
        . '<td>' . $e($types[$r['type']] ?? $r['type']) . '</td>'
        . '<td>' . $e($r['name']) . '<br><a href="tel:' . $e($r['phone']) . '">' . $e($r['phone']) . '</a>'
        . ($r['comment'] ? '<br><small>' . $e(mb_substr($r['comment'], 0, 140)) . '</small>' : '') . '</td>'
        . '<td>' . ($r['product_id'] ? '<a href="?a=resource/update&id=' . (int) $r['product_id'] . '">' . $e($r['product_title']) . '</a>' : '—') . '</td>'
        . '<td>' . $e($r['branch_city'] ?? '—') . '</td>'
        . '<td>' . $e($statuses[$r['status']] ?? $r['status']) . '</td>'
        . '<td>' . $notified . '</td>'
        . '</tr>';
}
return $html . '</tbody></table>';
