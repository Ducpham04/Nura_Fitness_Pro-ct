import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './locales/en.json';
import vi from './locales/vi.json';

// ── Hướng A: app nhất quán TIẾNG VIỆT ──────────────────────────────────────
// Ép cứng 'vi' (không detect localStorage) để mọi user đều thấy tiếng Việt,
// kể cả người từng chọn 'en' trước đây. Giữ resources EN để dễ bật lại sau này.
if (typeof window !== 'undefined') {
  try { window.localStorage.removeItem('i18nextLng'); } catch { /* ignore */ }
}

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      vi: { translation: vi },
    },
    lng: 'vi',
    fallbackLng: 'vi',
    supportedLngs: ['vi'],
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
