import { Languages } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function LanguageSelector() {
  const { i18n, t } = useTranslation();
  const currentLanguage = i18n.resolvedLanguage || i18n.language || 'vi';

  return (
    <label className="flex h-10 items-center gap-2 rounded-xl border border-white/5 bg-white/[0.06] px-3 text-neutral-400 transition-colors hover:border-white/10 hover:text-white">
      <Languages className="h-4 w-4" aria-hidden="true" />
      <span className="sr-only">{t('common.language')}</span>
      <select
        value={currentLanguage}
        onChange={(event) => i18n.changeLanguage(event.target.value)}
        aria-label={t('common.language')}
        className="h-full bg-transparent text-xs font-bold uppercase tracking-widest text-current outline-none"
      >
        <option value="vi">{t('common.vietnamese')}</option>
        <option value="en">{t('common.english')}</option>
      </select>
    </label>
  );
}
