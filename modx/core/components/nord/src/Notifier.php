<?php
declare(strict_types=1);

namespace Nord;

use MODX\Revolution\Mail\modMail;
use MODX\Revolution\modX;

/**
 * Уведомления о заявке: письмо на email филиала (через почтовый сервис MODX и SMTP из системных настроек)
 * и сообщение в Telegram-чат филиала (официальный Bot API). Успех — если дошёл хотя бы один канал.
 */
final class Notifier
{
    private const TYPE_TITLES = [
        'price' => 'Узнать стоимость',
        'consultation' => 'Консультация',
        'leasing' => 'Лизинг',
        'question' => 'Вопрос по технике',
    ];

    public function __construct(private modX $modx, private Config $cfg) {}

    /** @return array{ok: bool, error?: string} */
    public function send(array $lead, ?array $branch): array
    {
        $errors = [];
        $sent = 0;

        $emails = array_filter([$branch['email'] ?? null, $this->cfg->get('leads_cc_email')]);
        if ($emails) {
            if ($this->sendEmail($lead, $branch, $emails)) {
                $sent++;
            } else {
                $errors[] = 'email';
            }
        }
        $chat = ($branch['tg_chat_id'] ?? null) ?: $this->cfg->get('tg_default_chat_id');
        if ($chat && $this->cfg->secret('tg_bot_token')) {
            $tg = $this->sendTelegram($lead, $branch, (string) $chat);
            if ($tg === true) {
                $sent++;
            } else {
                $errors[] = 'telegram: ' . $tg;
            }
        }
        if (!$emails && !$chat) {
            return ['ok' => false, 'error' => 'не настроен ни один канал уведомлений'];
        }
        return $sent > 0 ? ['ok' => true] : ['ok' => false, 'error' => implode('; ', $errors)];
    }

    /** Текст уведомления. Публичный и статический — для тестов. */
    public static function text(array $lead, ?array $branch, string $siteUrl): string
    {
        $type = self::TYPE_TITLES[$lead['type']] ?? $lead['type'];
        $lines = [
            "Заявка #{$lead['id']} · {$type}",
            "Имя: {$lead['name']}",
            "Телефон: {$lead['phone']}",
        ];
        if (!empty($lead['email'])) {
            $lines[] = "Почта: {$lead['email']}";
        }
        if (!empty($lead['product_title'])) {
            $lines[] = "Техника: {$lead['product_title']}";
        }
        if (!empty($lead['comment'])) {
            $lines[] = "Комментарий: {$lead['comment']}";
        }
        $lines[] = 'Филиал: ' . ($branch['city'] ?? 'не выбран');
        $lines[] = 'Страница: ' . rtrim($siteUrl, '/') . $lead['page_url'];
        return implode("\n", $lines);
    }

    private function sendEmail(array $lead, ?array $branch, array $to): bool
    {
        $text = self::text($lead, $branch, (string) $this->modx->getOption('site_url'));
        /** @var modMail $mail */
        $mail = $this->modx->services->get('mail');
        $mail->set(modMail::MAIL_BODY, nl2br(htmlspecialchars($text, ENT_QUOTES, 'UTF-8')));
        $mail->set(modMail::MAIL_BODY_TEXT, $text);
        $mail->set(modMail::MAIL_FROM, (string) $this->cfg->get('mail_from', $this->modx->getOption('emailsender')));
        $mail->set(modMail::MAIL_FROM_NAME, 'Сайт НОРД');
        $mail->set(modMail::MAIL_SUBJECT, 'Заявка #' . $lead['id'] . ': ' . (self::TYPE_TITLES[$lead['type']] ?? $lead['type']));
        foreach ($to as $addr) {
            $mail->address('to', $addr);
        }
        if (!empty($lead['email'])) {
            $mail->address('reply-to', $lead['email']);
        }
        $mail->setHTML(true);
        $ok = $mail->send();
        if (!$ok) {
            $this->modx->log(modX::LOG_LEVEL_ERROR, '[nord] письмо не отправлено: ' . ($mail->mailer->ErrorInfo ?? ''));
        }
        $mail->reset();
        return (bool) $ok;
    }

    /** @return true|string true или текст ошибки */
    private function sendTelegram(array $lead, ?array $branch, string $chatId): bool|string
    {
        $token = $this->cfg->secret('tg_bot_token');
        $text = self::text($lead, $branch, (string) $this->modx->getOption('site_url'));
        $ch = curl_init("https://api.telegram.org/bot{$token}/sendMessage");
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => ['chat_id' => $chatId, 'text' => $text, 'disable_web_page_preview' => 'true'],
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 5,
        ]);
        $body = curl_exec($ch);
        $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $err = curl_error($ch);
        curl_close($ch);
        if ($code === 200) {
            return true;
        }
        // Токен в лог не пишем
        return $err ?: ('HTTP ' . $code . ' ' . mb_substr((string) (json_decode((string) $body, true)['description'] ?? ''), 0, 120));
    }
}
