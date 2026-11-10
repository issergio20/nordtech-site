// Слой отправки заявок. Сигнатура одна для прототипа и для MODX:
//   submitLead(fields: Record<string,string>) -> Promise<{ ok: true } | { ok: false, errors?: Record<string,string>, message?: string }>
// В проде: window.NORD_LEAD_ENDPOINT = "/assets/components/nord/lead.php" (см. replica/backend.md),
// без него — заглушка: проверяет поля так же, как сервер, и запоминает submit_token, чтобы показать защиту от дублей.

const SEEN = "nord:lead-tokens";

export function normalizePhone(raw) {
  let d = String(raw || "").replace(/\D/g, "");
  if (d.length === 11 && (d[0] === "8" || d[0] === "7")) d = "7" + d.slice(1);
  else if (d.length === 10) d = "7" + d;
  return d.length === 11 && d[0] === "7" ? "+" + d : null;
}

export function validateLead(f) {
  const errors = {};
  if (!f.name || f.name.trim().length < 2) errors.name = "Напишите, как к вам обращаться";
  if (!normalizePhone(f.phone)) errors.phone = "Введите номер полностью: +7 и 10 цифр";
  if (f.consent !== "1") errors.consent = "Без согласия мы не сможем обработать заявку";
  return errors;
}

// Невидимая Yandex SmartCaptcha: подключается, только если задан window.NORD_CAPTCHA_SITEKEY.
// Скрипт грузится при первой отправке, а не при загрузке страницы.
let captcha = null;
function captchaToken() {
  const sitekey = window.NORD_CAPTCHA_SITEKEY;
  if (!sitekey) return Promise.resolve("");
  captcha ||= new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://smartcaptcha.yandexcloud.net/captcha.js?render=onload";
    s.async = true;
    s.onload = () => {
      const box = document.createElement("div");
      document.body.append(box);
      const id = window.smartCaptcha.render(box, { sitekey, invisible: true, hideShield: true });
      resolve(id);
    };
    s.onerror = reject;
    document.head.append(s);
  });
  return captcha
    .then((id) => new Promise((resolve) => {
      const sub = window.smartCaptcha.subscribe(id, "success", (token) => { sub(); resolve(token); });
      window.smartCaptcha.execute(id);
    }))
    .catch(() => ""); // капча недоступна — сервер решит сам (пропускает при сбое сервиса)
}

export async function submitLead(fields) {
  const errors = validateLead(fields);
  if (Object.keys(errors).length) return { ok: false, errors };
  if (fields.website) return { ok: true }; // ловушка для ботов: делаем вид, что всё хорошо

  const endpoint = window.NORD_LEAD_ENDPOINT;
  if (endpoint) {
    const body = new FormData();
    const utm = Object.fromEntries([...new URLSearchParams(location.search)].filter(([k]) => /^(utm_|yclid$)/.test(k)));
    Object.entries({ ...fields, ...utm, phone: normalizePhone(fields.phone) }).forEach(([k, v]) => body.append(k, v ?? ""));
    try {
      body.append("smart_token", await captchaToken());
      const res = await fetch(endpoint, { method: "POST", body, credentials: "same-origin" });
      const json = await res.json();
      // Контракт /assets/components/nord/lead.php: {success} | {success:false, errors} | {success:false, message}
      if (json.success) return { ok: true };
      if (json.errors?._form) return { ok: false, message: json.errors._form };
      return { ok: false, errors: json.errors, message: json.message };
    } catch {
      return { ok: false, message: "network" };
    }
  }

  // Заглушка прототипа
  await new Promise((r) => setTimeout(r, 700));
  if (fields.name.trim().toLowerCase() === "ошибка") return { ok: false, message: "network" }; // ручная проверка состояния ошибки
  let seen = [];
  try { seen = JSON.parse(sessionStorage.getItem(SEEN) || "[]"); } catch {}
  const duplicate = seen.includes(fields.submit_token);
  if (!duplicate) {
    seen.push(fields.submit_token);
    try { sessionStorage.setItem(SEEN, JSON.stringify(seen)); } catch {}
    console.info("[lead:fake] сохранена заявка", { ...fields, phone: normalizePhone(fields.phone) });
  } else {
    console.info("[lead:fake] повтор submit_token — вторая заявка не создана", fields.submit_token);
  }
  return { ok: true, duplicate };
}
