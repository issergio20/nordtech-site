<?php
declare(strict_types=1);

namespace Nord;

use MODX\Revolution\modX;

/**
 * Настройки и секреты. Порядок: переменная окружения (env[...] в пуле PHP-FPM) → системная настройка MODX (namespace nord) → значение по умолчанию.
 * Секреты (токены) — только в окружении, не в системных настройках: их видят все менеджеры.
 */
final class Config
{
    public function __construct(private modX $modx) {}

    public function get(string $key, mixed $default = null): mixed
    {
        $env = getenv(strtoupper('NORD_' . $key));
        if ($env !== false && $env !== '') {
            return $env;
        }
        return $this->modx->getOption('nord.' . $key, null, $default, true);
    }

    public function secret(string $key): ?string
    {
        $env = getenv(strtoupper('NORD_' . $key));
        return ($env !== false && $env !== '') ? $env : null;
    }

    public function table(string $name): string
    {
        return '`' . $this->modx->getOption('table_prefix', null, 'modx_') . 'nord_' . $name . '`';
    }
}
