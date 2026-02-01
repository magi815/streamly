'use client';

import { useLocale, useTranslations } from 'next-intl';
import { locales, localeNames, type Locale } from '@/i18n/config';

export default function LanguageSelector() {
  const t = useTranslations('language');
  const locale = useLocale() as Locale;

  const handleChange = (newLocale: string) => {
    // Get current path from browser and strip locale prefix
    const currentPath = window.location.pathname;

    // Remove current locale prefix (e.g., /ko, /en, /ja)
    let pathWithoutLocale = currentPath;
    for (const loc of locales) {
      if (currentPath.startsWith(`/${loc}/`)) {
        pathWithoutLocale = currentPath.substring(loc.length + 1);
        break;
      } else if (currentPath === `/${loc}`) {
        pathWithoutLocale = '/';
        break;
      }
    }

    // Ensure path starts with /
    if (!pathWithoutLocale.startsWith('/')) {
      pathWithoutLocale = '/' + pathWithoutLocale;
    }

    // Build new path with new locale
    const newPath = `/${newLocale}${pathWithoutLocale === '/' ? '' : pathWithoutLocale}`;
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
