<?php
/**
 * POST /assets/components/nord/lead.php — приём заявок с сайта.
 * Ответ JSON: {success:true} | {success:false, errors:{field:msg}} (422) | {success:false, message} (4xx/5xx).
 * Вместо FetchIt: свой эндпоинт проще проверить и не зависит от внутреннего протокола FetchIt (см. backend.md).
 */
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

$reply = static function (array $body, int $status = 200): never {
    http_response_code($status);
    echo json_encode($body, JSON_UNESCAPED_UNICODE);
    exit;
};

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    $reply(['success' => false, 'message' => 'method'], 405);
}

// Принимаем только запросы со своего сайта (защита от отправки форм с чужих страниц)
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
$host = $_SERVER['HTTP_HOST'] ?? '';
if ($origin !== '' && parse_url($origin, PHP_URL_HOST) !== $host) {
    $reply(['success' => false, 'message' => 'origin'], 403);
}
if (($_SERVER['CONTENT_LENGTH'] ?? 0) > 20000) {
    $reply(['success' => false, 'message' => 'too_large'], 413);
}

require dirname(__DIR__, 3) . '/core/components/nord/bootstrap.php';

try {
    $modx = nord_modx('web');
    $cfg = new Nord\Config($modx);
    $service = new Nord\LeadService($modx, $cfg, new Nord\Notifier($modx, $cfg));
    // За nginx IP приходит в REMOTE_ADDR (real_ip_header настраивается в nginx, не доверяем X-Forwarded-For здесь)
    $result = $service->submit($_POST, (string) ($_SERVER['REMOTE_ADDR'] ?? ''));
    $status = $result['status'];
    unset($result['status']);
    $reply($result, $status);
} catch (Throwable $e) {
    error_log('[nord] lead.php: ' . $e->getMessage()); // без данных заявки
    $reply(['success' => false, 'message' => 'server'], 500);
}
