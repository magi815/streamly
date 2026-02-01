import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import Header from '@/components/Header';
import { locales, type Locale } from '@/i18n/config';

interface LocaleLayoutProps {
  children: React.ReactNode;
  params: { locale: string };
}

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params: { locale },
}: LocaleLayoutProps) {
  // Validate locale
  if (!locales.includes(locale as Locale)) {
    notFound();
  }

  // Get messages for the locale
  const messages = await getMessages();

  // Font class based on locale
  const fontClass = {
    ko: 'font-[family-name:var(--font-noto-kr)]',
    en: 'font-[family-name:var(--font-inter)]',
    ja: 'font-[family-name:var(--font-noto-jp)]',
  }[locale as Locale] || 'font-[family-name:var(--font-noto-kr)]';

  return (
    <NextIntlClientProvider messages={messages}>
      <div className={fontClass} lang={locale}>
        <Header />
        <main className="min-h-screen">{children}</main>
        <footer className="border-t border-gray-800 py-8 text-center text-sm text-gray-500">
          <div className="mb-4 flex justify-center gap-6">
            <a href={`/${locale}/privacy`} className="hover:text-gray-300 transition-colors">
              {locale === 'ko' ? '개인정보처리방침' : locale === 'ja' ? 'プライバシーポリシー' : 'Privacy Policy'}
            </a>
            <a href={`/${locale}/terms`} className="hover:text-gray-300 transition-colors">
              {locale === 'ko' ? '이용약관' : locale === 'ja' ? '利用規約' : 'Terms of Service'}
            </a>
          </div>
          <div className="mb-4 flex flex-wrap justify-center gap-x-4 gap-y-1 px-4 text-xs text-gray-600">
            <span>
              This product uses the{' '}
              <a href="https://www.themoviedb.org/" target="_blank" rel="noopener noreferrer" className="hover:text-gray-400">
                TMDB API
              </a>
              {' '}but is not endorsed or certified by TMDB.
            </span>
            <span>
              YouTube content provided via{' '}
              <a href="https://developers.google.com/youtube" target="_blank" rel="noopener noreferrer" className="hover:text-gray-400">
                YouTube API Services
              </a>
            </span>
          </div>
          <p>© 2026 WhatView. All rights reserved.</p>
        </footer>
      </div>
    </NextIntlClientProvider>
  );
}
