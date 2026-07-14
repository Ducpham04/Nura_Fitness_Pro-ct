/**
 * Attribution nguồn đăng ký (first-touch).
 *
 * Khi khách ghé trang lần đầu, lưu utm_source/utm_campaign (hoặc referrer host)
 * vào localStorage. Khi đăng ký, giá trị này gửi kèm để backend lưu vào
 * users.signup_source / signup_campaign — báo cáo "Nguồn đăng ký" trong admin.
 *
 * First-touch: chỉ ghi 1 lần, lần ghé sau không ghi đè (nguồn đầu tiên mới là
 * nguồn "kéo" được user đến).
 */

const KEY = 'signupAttribution';

export interface Attribution {
  signupSource: string;
  signupCampaign?: string;
}

/** Gọi 1 lần khi app khởi động — TRƯỚC khi router kịp strip query params. */
export function captureAttribution(): void {
  try {
    if (localStorage.getItem(KEY)) return; // first-touch: đã có thì giữ nguyên

    const params = new URLSearchParams(window.location.search);
    const utmSource = params.get('utm_source')?.trim();
    const utmCampaign = params.get('utm_campaign')?.trim();

    let source = utmSource || '';
    if (!source && document.referrer) {
      try {
        const host = new URL(document.referrer).hostname;
        // referrer nội bộ (điều hướng trong app) không phải nguồn
        if (host && host !== window.location.hostname) {
          source = host.replace(/^www\./, '');
        }
      } catch { /* referrer không phải URL hợp lệ — bỏ qua */ }
    }

    // Không có UTM lẫn referrer ngoài → khách gõ thẳng URL / bookmark
    if (!source && !utmCampaign) return; // để register tự fallback 'direct'

    const att: Attribution = { signupSource: source || 'direct' };
    if (utmCampaign) att.signupCampaign = utmCampaign;
    localStorage.setItem(KEY, JSON.stringify(att));
  } catch { /* localStorage bị chặn (private mode) — bỏ qua */ }
}

/** Lấy attribution để gửi kèm register. Không có gì đã lưu → 'direct'. */
export function getAttribution(): Attribution {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Attribution;
      if (parsed && typeof parsed.signupSource === 'string' && parsed.signupSource) return parsed;
    }
  } catch { /* hỏng thì coi như direct */ }
  return { signupSource: 'direct' };
}

/** Xoá sau khi đăng ký thành công — attribution đã "tiêu" xong. */
export function clearAttribution(): void {
  try { localStorage.removeItem(KEY); } catch { /* noop */ }
}
