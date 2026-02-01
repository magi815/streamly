export const locales = ['ko', 'en', 'ja'] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'ko';

export const localeNames: Record<Locale, string> = {
  ko: '한국어',
  en: 'English',
  ja: '日本語',
};

export const localeToCountry: Record<Locale, string> = {
  ko: 'KR',
  en: 'US',
  ja: 'JP',
};

export const countryToLocale: Record<string, Locale> = {
  KR: 'ko',
  US: 'en',
  JP: 'ja',
};
