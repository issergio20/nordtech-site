<?php
declare(strict_types=1);

namespace Nord;

use MODX\Revolution\modResource;
use MODX\Revolution\modX;
use PDO;

/**
 * Приём заявок со всех форм сайта (тип price | consultation | leasing | question).
 *
 * Порядок: проверка полей → антиспам (ловушка, SmartCaptcha, частота с IP) → запись (идемпотентно по submit_token)
 * → выбор филиала → уведомления. Заявка сохраняется до отправки уведомлений: сбой почты или Telegram её не теряет,
 * cron leads-renotify дошлёт.
 */
final class LeadService
{
    public const TYPES = ['price', 'consultation', 'leasing', 'question'];
    private const RATE_LIMIT = 5;          // заявок
    private const RATE_WINDOW_MIN = 10;    // за столько минут с одного IP

    private PDO $pdo;

    public function __construct(private modX $modx, private Config $cfg, private Notifier $notifier)
    {
        $modx->connect();
        $this->pdo = $modx->pdo;
        $this->pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    }

    /* ---------- чистые функции (покрыты tests/LeadServiceTest.php) ---------- */

    public static function normalizePhone(string $raw): ?string
    {
        $d = preg_replace('/\D+/', '', $raw) ?? '';
        if (strlen($d) === 11 && ($d[0] === '8' || $d[0] === '7')) {
            $d = '7' . substr($d, 1);
        } elseif (strlen($d) === 10) {
            $d = '7' . $d;
        }
        return (strlen($d) === 11 && $d[0] === '7') ? '+' . $d : null;
    }

    /** @return array{0: array<string,mixed>, 1: array<string,string>} [чистые данные, ошибки] */
    public static function validate(array $in): array
    {
        $s = static fn ($k, $max) => mb_substr(trim((string) ($in[$k] ?? '')), 0, $max);
        $data = [
            'type' => in_array($in['type'] ?? '', self::TYPES, true) ? $in['type'] : 'consultation',
            'name' => $s('name', 128),
            'phone' => self::normalizePhone((string) ($in['phone'] ?? '')),
            'email' => $s('email', 128) ?: null,
            'comment' => $s('comment', 2000) ?: null,
            'product_id' => ctype_digit((string) ($in['product_id'] ?? '')) ? (int) $in['product_id'] : null,
            'city' => preg_match('/^[a-z_]{2,32}$/', (string) ($in['city'] ?? '')) ? $in['city'] : null,
            'consent' => ($in['consent'] ?? '') === '1',
            'consent_doc_ver' => $s('consent_doc_ver', 16) ?: 'unknown',
            'page_url' => $s('page_url', 512) ?: '/',
            'submit_token' => preg_match('/^[0-9a-f-]{36}$/i', (string) ($in['submit_token'] ?? '')) ? strtolower($in['submit_token']) : null,
            'honeypot' => trim((string) ($in['website'] ?? '')),
            'utm' => self::pickUtm($in),
        ];
        $errors = [];
        if (mb_strlen($data['name']) < 2) {
            $errors['name'] = 'Напишите, как к вам обращаться';
        }
        if ($data['phone'] === null) {
            $errors['phone'] = 'Введите номер полностью: +7 и 10 цифр';
        }
        if ($data['email'] !== null && !filter_var($data['email'], FILTER_VALIDATE_EMAIL)) {
            $errors['email'] = 'Проверьте адрес почты';
        }
        if (!$data['consent']) {
            $errors['consent'] = 'Без согласия мы не сможем обработать заявку';
        }
        if ($data['submit_token'] === null) {
            $errors['_form'] = 'Обновите страницу и отправьте форму ещё раз';
        }
        if (!str_starts_with($data['page_url'], '/')) {
            $data['page_url'] = '/';
        }
        return [$data, $errors];
    }

    private static function pickUtm(array $in): ?array
    {
        $utm = [];
        foreach (['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'yclid'] as $k) {
            if (!empty($in[$k])) {
                $utm[$k] = mb_substr((string) $in[$k], 0, 128);
            }
        }
        return $utm ?: null;
    }

    /* ---------- приём ---------- */

    /**
     * @return array{success: bool, errors?: array<string,string>, message?: string, status: int}
     */
    public function submit(array $input, string $ip): array
    {
        [$d, $errors] = self::validate($input);
        if ($errors) {
            return ['success' => false, 'errors' => $errors, 'status' => 422];
        }

        $status = 'new';
        if ($d['honeypot'] !== '' || !$this->captchaOk((string) ($input['smart_token'] ?? ''), $ip) || $this->rateLimited($ip)) {
            $status = 'spam'; // боту отвечаем «успех», чтобы не подбирал обход
        }

        // Название товара берём из базы, а не из формы
        $productTitle = null;
        if ($d['product_id']) {
            $res = $this->modx->getObject(modResource::class, ['id' => $d['product_id'], 'published' => 1, 'deleted' => 0]);
            $productTitle = $res ? mb_substr((string) $res->get('pagetitle'), 0, 255) : null;
            if (!$res) {
                $d['product_id'] = null;
            }
        }
        $branch = $this->pickBranch($d['city']);

        $sql = 'INSERT IGNORE INTO ' . $this->cfg->table('leads') . '
            (type, name, phone, email, comment, product_id, product_title, branch_id, city_input,
             consent, consent_doc_ver, page_url, utm, ip, submit_token, status)
            VALUES (?,?,?,?,?,?,?,?,?,1,?,?,?,INET6_ATON(?),?,?)';
        $st = $this->pdo->prepare($sql);
        $st->execute([
            $d['type'], $d['name'], $d['phone'], $d['email'], $d['comment'], $d['product_id'], $productTitle,
            $branch['id'] ?? null, $d['city'], $d['consent_doc_ver'], $d['page_url'],
            $d['utm'] ? json_encode($d['utm'], JSON_UNESCAPED_UNICODE) : null,
            filter_var($ip, FILTER_VALIDATE_IP) ? $ip : null, $d['submit_token'], $status,
        ]);
        if ($st->rowCount() === 0) {
            return ['success' => true, 'status' => 200]; // повтор того же submit_token — вторую заявку не создаём
        }
        $id = (int) $this->pdo->lastInsertId();

        if ($status === 'new') {
            $this->notify($id);
        }
        return ['success' => true, 'status' => 200];
    }

    /** Отправляет уведомления по заявке; при успехе ставит notified_at. Используется и cron'ом. */
    public function notify(int $leadId): bool
    {
        $lead = $this->find($leadId);
        if (!$lead || $lead['status'] === 'spam' || $lead['notified_at']) {
            return true;
        }
        $branch = $lead['branch_id'] ? $this->branchById((int) $lead['branch_id']) : $this->pickBranch(null);
        $result = $this->notifier->send($lead, $branch);

        $st = $this->pdo->prepare('UPDATE ' . $this->cfg->table('leads') . '
            SET notify_attempts = notify_attempts + 1,
                notified_at = IF(?, UTC_TIMESTAMP(), NULL),
                notify_error = ?
            WHERE id = ?');
        $st->execute([$result['ok'] ? 1 : 0, $result['ok'] ? null : mb_substr($result['error'] ?? 'unknown', 0, 255), $leadId]);
        if (!$result['ok']) {
            $this->modx->log(modX::LOG_LEVEL_ERROR, "[nord] заявка #{$leadId}: уведомление не ушло — {$result['error']}");
        }
        return $result['ok'];
    }

    /* ---------- cron ---------- */

    /** Досылает уведомления: не раньше 2 минут после создания, не больше 3 попыток. */
    public function renotify(): array
    {
        $st = $this->pdo->query('SELECT id FROM ' . $this->cfg->table('leads') . "
            WHERE notified_at IS NULL AND status <> 'spam' AND notify_attempts < 3
              AND created_at < UTC_TIMESTAMP() - INTERVAL 2 MINUTE
            ORDER BY id LIMIT 50");
        $ok = $fail = 0;
        foreach ($st->fetchAll(PDO::FETCH_COLUMN) as $id) {
            $this->notify((int) $id) ? $ok++ : $fail++;
        }
        $stuck = (int) $this->pdo->query('SELECT COUNT(*) FROM ' . $this->cfg->table('leads') . "
            WHERE notified_at IS NULL AND status <> 'spam' AND notify_attempts >= 3")->fetchColumn();
        return ['sent' => $ok, 'failed' => $fail, 'stuck' => $stuck];
    }

    /** Сроки хранения ПДн: IP — 30 дней, спам — 30 дней, заявки — nord.leads_retention_years (по умолчанию 3). */
    public function purge(): array
    {
        $t = $this->cfg->table('leads');
        $years = max(1, (int) $this->cfg->get('leads_retention_years', 3));
        return [
            'ip_cleared' => $this->pdo->exec("UPDATE {$t} SET ip = NULL WHERE ip IS NOT NULL AND created_at < UTC_TIMESTAMP() - INTERVAL 30 DAY"),
            'spam_deleted' => $this->pdo->exec("DELETE FROM {$t} WHERE status = 'spam' AND created_at < UTC_TIMESTAMP() - INTERVAL 30 DAY"),
            'leads_deleted' => $this->pdo->exec("DELETE FROM {$t} WHERE created_at < UTC_TIMESTAMP() - INTERVAL {$years} YEAR"),
        ];
    }

    /* ---------- чтение для админки ---------- */

    public function latest(int $limit = 50, ?string $status = null): array
    {
        $sql = 'SELECT l.id, l.type, l.name, l.phone, l.email, l.comment, l.product_id, l.product_title, l.status,
                       l.notified_at, l.notify_error, l.created_at, b.city AS branch_city
                FROM ' . $this->cfg->table('leads') . ' l
                LEFT JOIN ' . $this->cfg->table('branches') . ' b ON b.id = l.branch_id'
             . ($status ? ' WHERE l.status = ?' : " WHERE l.status <> 'spam'")
             . ' ORDER BY l.id DESC LIMIT ' . max(1, min(500, $limit));
        $st = $this->pdo->prepare($sql);
        $st->execute($status ? [$status] : []);
        return $st->fetchAll(PDO::FETCH_ASSOC);
    }

    public function setStatus(int $id, string $status): bool
    {
        if (!in_array($status, ['new', 'in_work', 'done', 'spam'], true)) {
            return false;
        }
        $st = $this->pdo->prepare('UPDATE ' . $this->cfg->table('leads') . ' SET status = ? WHERE id = ?');
        return $st->execute([$status, $id]);
    }

    /* ---------- внутреннее ---------- */

    private function find(int $id): ?array
    {
        $st = $this->pdo->prepare('SELECT * FROM ' . $this->cfg->table('leads') . ' WHERE id = ?');
        $st->execute([$id]);
        return $st->fetch(PDO::FETCH_ASSOC) ?: null;
    }

    private function branchById(int $id): ?array
    {
        $st = $this->pdo->prepare('SELECT * FROM ' . $this->cfg->table('branches') . ' WHERE id = ?');
        $st->execute([$id]);
        return $st->fetch(PDO::FETCH_ASSOC) ?: null;
    }

    private function pickBranch(?string $code): ?array
    {
        $t = $this->cfg->table('branches');
        if ($code) {
            $st = $this->pdo->prepare("SELECT * FROM {$t} WHERE code = ? AND kind = 'branch' AND is_active = 1");
            $st->execute([$code]);
            if ($row = $st->fetch(PDO::FETCH_ASSOC)) {
                return $row;
            }
        }
        return $this->pdo->query("SELECT * FROM {$t} WHERE is_default = 1 AND is_active = 1 ORDER BY sort LIMIT 1")
            ->fetch(PDO::FETCH_ASSOC) ?: null;
    }

    private function rateLimited(string $ip): bool
    {
        if (!filter_var($ip, FILTER_VALIDATE_IP)) {
            return false;
        }
        $st = $this->pdo->prepare('SELECT COUNT(*) FROM ' . $this->cfg->table('leads') . '
            WHERE ip = INET6_ATON(?) AND created_at > UTC_TIMESTAMP() - INTERVAL ' . self::RATE_WINDOW_MIN . ' MINUTE');
        $st->execute([$ip]);
        return (int) $st->fetchColumn() >= self::RATE_LIMIT;
    }

    /** Yandex SmartCaptcha. Без ключа (dev/staging) проверка выключена. При недоступности сервиса — пропускаем, а не теряем заявку. */
    private function captchaOk(string $token, string $ip): bool
    {
        $secret = $this->cfg->secret('smartcaptcha_server_key');
        if (!$secret) {
            return true;
        }
        if ($token === '') {
            return false;
        }
        $ch = curl_init('https://smartcaptcha.yandexcloud.net/validate');
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => http_build_query(['secret' => $secret, 'token' => $token, 'ip' => $ip]),
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 3,
        ]);
        $body = curl_exec($ch);
        $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        if ($code !== 200 || !is_string($body)) {
            $this->modx->log(modX::LOG_LEVEL_WARN, "[nord] SmartCaptcha недоступна (HTTP {$code}) — заявка принята без проверки");
            return true;
        }
        return (json_decode($body, true)['status'] ?? '') === 'ok';
    }
}
