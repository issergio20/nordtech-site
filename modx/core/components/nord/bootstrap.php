<?php
/**
 * Загрузка MODX 3 для CLI-скриптов и эндпоинта заявок.
 * Путь к config.core.php ищется вверх от этого файла (core/components/nord → корень сайта).
 */
declare(strict_types=1);

use MODX\Revolution\modX;

function nord_modx(string $context = 'web'): modX
{
    $dir = __DIR__;
    for ($i = 0; $i < 6 && !is_file($dir . '/config.core.php'); $i++) {
        $dir = dirname($dir);
    }
    if (!is_file($dir . '/config.core.php')) {
        throw new RuntimeException('config.core.php не найден: положите компонент в core/components/nord сайта MODX');
    }
    require_once $dir . '/config.core.php';
    require_once MODX_CORE_PATH . 'vendor/autoload.php';

    $modx = new modX();
    $modx->initialize($context);

    require_once __DIR__ . '/src/Config.php';
    require_once __DIR__ . '/src/LeadService.php';
    require_once __DIR__ . '/src/Notifier.php';
    return $modx;
}
