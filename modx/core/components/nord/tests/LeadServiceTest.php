<?php
/**
 * Тесты чистых функций без MODX и БД: php core/components/nord/tests/LeadServiceTest.php
 * (на staging или там, где есть PHP 8.2+). Код возврата 1 при ошибке.
 */
declare(strict_types=1);

namespace MODX\Revolution { if (!class_exists(modX::class)) { class modX {} class modResource {} } }
namespace MODX\Revolution\Mail { if (!class_exists(modMail::class)) { class modMail {} } }

namespace {
    require __DIR__ . '/../src/Config.php';
    require __DIR__ . '/../src/Notifier.php';
    require __DIR__ . '/../src/LeadService.php';

    use Nord\LeadService as S;
    use Nord\Notifier as N;

    $fail = 0;
    $eq = static function ($got, $want, string $name) use (&$fail): void {
        if ($got === $want) {
            echo "ok   {$name}\n";
        } else {
            $fail++;
            echo "FAIL {$name}: получили " . var_export($got, true) . ', ждали ' . var_export($want, true) . "\n";
        }
    };

    // Телефон
    $eq(S::normalizePhone('8 (914) 350-41-41'), '+79143504141', 'телефон с 8');
    $eq(S::normalizePhone('+7 914 350 41 41'), '+79143504141', 'телефон с +7');
    $eq(S::normalizePhone('9143504141'), '+79143504141', '10 цифр');
    $eq(S::normalizePhone('+7 914 350'), null, 'неполный');
    $eq(S::normalizePhone('+86 131 3493 3773'), null, 'не российский — отклоняется');

    // Валидация
    $ok = ['type' => 'price', 'name' => 'Сергей', 'phone' => '89143504141', 'consent' => '1', 'submit_token' => 'd361cc04-3c99-4155-8079-b01a5d319bcd', 'product_id' => '42'];
    [$d, $e] = S::validate($ok);
    $eq($e, [], 'корректная заявка без ошибок');
    $eq($d['product_id'], 42, 'product_id → int');
    [, $e] = S::validate(['type' => 'price']);
    $eq(array_keys($e), ['name', 'phone', 'consent', '_form'], 'пустая заявка — 4 ошибки');
    [$d] = S::validate(['type' => 'hack'] + $ok);
    $eq($d['type'], 'consultation', 'неизвестный тип → consultation');
    [$d] = S::validate(['product_id' => '1 OR 1=1'] + $ok);
    $eq($d['product_id'], null, 'product_id только цифры');
    [$d] = S::validate(['page_url' => 'https://evil.example/x'] + $ok);
    $eq($d['page_url'], '/', 'page_url только относительный');
    [$d] = S::validate(['city' => '../etc'] + $ok);
    $eq($d['city'], null, 'city по белому списку символов');
    [$d] = S::validate(['name' => str_repeat('я', 300)] + $ok);
    $eq(mb_strlen($d['name']), 128, 'имя обрезается до 128');
    [, $e] = S::validate(['email' => 'не почта'] + $ok);
    $eq(isset($e['email']), true, 'кривая почта — ошибка');
    [$d] = S::validate($ok + ['utm_source' => 'yandex', 'evil' => 'x']);
    $eq($d['utm'], ['utm_source' => 'yandex'], 'utm — только разрешённые ключи');

    // Текст уведомления
    $text = N::text(['id' => 7, 'type' => 'price', 'name' => 'Сергей', 'phone' => '+79143504141', 'product_title' => 'GROS 388-II', 'page_url' => '/katalog/x'], ['city' => 'Чита'], 'https://nordtech.su/');
    $eq(str_contains($text, 'Заявка #7 · Узнать стоимость'), true, 'заголовок уведомления');
    $eq(str_contains($text, 'Страница: https://nordtech.su/katalog/x'), true, 'ссылка без двойного слэша');

    echo $fail ? "\n{$fail} тестов упало\n" : "\nвсе тесты прошли\n";
    exit($fail ? 1 : 0);
}
