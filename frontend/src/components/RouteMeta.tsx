import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

// Cập nhật <title>, meta description, canonical, og:url và robots theo route.
// SPA chỉ có một index.html nên nếu không làm vậy mọi tab đều cùng một title.
// (scripts/prerender.mjs bake sẵn các giá trị này cho trang công khai.)

const SITE_URL = ((import.meta.env.VITE_SITE_URL as string | undefined) || 'https://app.viway.id.vn').replace(/\/$/, '');
const BRAND = 'Viway';

type Meta = { title?: string; description?: string; index: boolean };

// Lưu giá trị mặc định từ index.html (trang chủ) để khôi phục khi quay lại "/".
const defaults = typeof document !== 'undefined'
  ? {
      title: document.title,
      ogTitle: document.querySelector('meta[property="og:title"]')?.getAttribute('content') ?? document.title,
      description: document.querySelector('meta[name="description"]')?.getAttribute('content') ?? '',
    }
  : { title: BRAND, ogTitle: BRAND, description: '' };

function setMeta(selector: string, attr: string, value: string) {
  const el = document.querySelector(selector);
  if (el) el.setAttribute(attr, value);
}

function setRobots(index: boolean) {
  let el = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
  if (!el) {
    el = document.createElement('meta');
    el.name = 'robots';
    document.head.appendChild(el);
  }
  el.content = index ? 'index, follow' : 'noindex, nofollow';
}

export default function RouteMeta() {
  const { pathname } = useLocation();
  const { t, i18n } = useTranslation();

  useEffect(() => {
    const path = pathname.replace(/\/+$/, '') || '/';

    const routes: Record<string, Meta> = {
      '/': { index: true },
      '/privacy': {
        title: 'Chính sách bảo mật',
        description: 'Chính sách bảo mật của Viway: cách chúng tôi thu thập, sử dụng và bảo vệ dữ liệu của bạn.',
        index: true,
      },
      '/terms': {
        title: 'Điều khoản sử dụng',
        description: 'Điều khoản sử dụng dịch vụ Viway — AI lập kế hoạch ăn và tập luyện.',
        index: true,
      },
      '/forgot-password': { title: 'Quên mật khẩu', index: false },
      '/reset-password': { title: 'Đặt lại mật khẩu', index: false },
      '/payment/result': { title: 'Kết quả thanh toán', index: false },
      '/onboarding': { title: 'Thiết lập hồ sơ', index: false },
      '/assessment': { title: 'Đánh giá thể trạng', index: false },
      '/welcome': { title: 'Chào mừng', index: false },
      '/admin': { title: 'Quản trị', index: false },
      '/dashboard': { title: t('nav.today'), index: false },
      '/dashboard/workout': { title: t('nav.workout'), index: false },
      '/dashboard/diet': { title: t('nav.diet'), index: false },
      '/dashboard/challenges': { title: t('nav.challenges'), index: false },
      '/dashboard/profile': { title: t('nav.profile'), index: false },
      '/dashboard/profile/edit': { title: t('nav.profile'), index: false },
      '/dashboard/coach': { title: t('nav.coach'), index: false },
      '/dashboard/logbook': { title: t('nav.logbook'), index: false },
    };

    const meta = routes[path] ?? { index: false };
    const description = meta.description ?? defaults.description;
    const url = `${SITE_URL}${path === '/' ? '/' : path}`;

    document.title = meta.title ? `${meta.title} — ${BRAND}` : defaults.title;
    setMeta('meta[name="description"]', 'content', description);
    setMeta('meta[property="og:title"]', 'content', meta.title ? `${meta.title} — ${BRAND}` : defaults.ogTitle);
    setMeta('meta[property="og:description"]', 'content', description);
    setMeta('meta[property="og:url"]', 'content', url);
    setMeta('link[rel="canonical"]', 'href', url);
    setRobots(meta.index);
    // Screen reader đọc đúng ngôn ngữ theo lựa chọn của người dùng
    document.documentElement.lang = i18n.language?.startsWith('en') ? 'en' : 'vi';
  }, [pathname, t, i18n.language]);

  return null;
}
