'use client';

import { useTranslations } from 'next-intl';

export default function TermsPage() {
  const t = useTranslations('terms');

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="mb-8 text-3xl font-bold">{t('title')}</h1>

      <div className="space-y-8 text-gray-300">
        <section>
          <h2 className="mb-4 text-xl font-semibold text-white">{t('section1.title')}</h2>
          <p>{t('section1.content')}</p>
        </section>

        <section>
          <h2 className="mb-4 text-xl font-semibold text-white">{t('section2.title')}</h2>
          <ul className="list-disc space-y-2 pl-6">
            {(t.raw('section2.items') as string[]).map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="mb-4 text-xl font-semibold text-white">{t('section3.title')}</h2>
          <p>{t('section3.content')}</p>
          <ul className="mt-4 list-disc space-y-2 pl-6">
            {(t.raw('section3.items') as string[]).map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="mb-4 text-xl font-semibold text-white">{t('section4.title')}</h2>
          <ul className="list-disc space-y-2 pl-6">
            {(t.raw('section4.items') as string[]).map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="mb-4 text-xl font-semibold text-white">{t('section5.title')}</h2>
          <p>{t('section5.content')}</p>
          <ul className="mt-4 list-disc space-y-2 pl-6">
            {(t.raw('section5.items') as string[]).map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="mb-4 text-xl font-semibold text-white">{t('section6.title')}</h2>
          <ul className="list-disc space-y-2 pl-6">
            {(t.raw('section6.items') as string[]).map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="mb-4 text-xl font-semibold text-white">{t('section7.title')}</h2>
          <ul className="list-disc space-y-2 pl-6">
            {(t.raw('section7.items') as string[]).map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="mb-4 text-xl font-semibold text-white">{t('section8.title')}</h2>
          <p>{t('section8.content')}</p>
        </section>

        <section>
          <h2 className="mb-4 text-xl font-semibold text-white">{t('section9.title')}</h2>
          <p>{t('section9.content')}</p>
        </section>

        <section>
          <h2 className="mb-4 text-xl font-semibold text-white">{t('section10.title')}</h2>
          <p>{t('section10.content')}</p>
        </section>
      </div>

      <div className="mt-12 text-sm text-gray-500">
        <p>{t('effectiveDate')}</p>
      </div>
    </div>
  );
}
