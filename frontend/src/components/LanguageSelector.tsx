'use client';

import { useLocale, useTranslations } from 'next-intl';
import { usePathname } from '@/i18n/navigation';
import { locales, localeNames, type Locale } from '@/i18n/config';

export default function LanguageSelector() {
  const t = useTranslations('language');
  const locale = useLocale() as Locale;
  const pathname = usePathname();

  const handleChange = (newLocale: string) => {
    // Use browser navigation for reliable locale switching on Cloudflare Workers
    const newPath = `/${newLocale}${pathname}`;
    window.location.href = newPath;
  };

  return (
    <select
      value={locale}
      onChange={(e) => handleChange(e.target.value)}
      className="bg-gray-800 text-white text-sm rounded px-2 py-1 border border-gray-700 focus:outline-none focus:border-purple-500"
      aria-label={t('select')}
    >
      {locales.map((loc) => (
        <option key={loc} value={loc}>
          {localeNames[loc]}
        </option>
      ))}
    </select>
  );
}
