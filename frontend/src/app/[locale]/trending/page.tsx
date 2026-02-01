'use client';

import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import ContentCard from '@/components/ContentCard';
import { ContentGridSkeleton } from '@/components/ContentCardSkeleton';
import { getTrending } from '@/lib/api';
import { mockTrending } from '@/lib/mock-data';
import { Content } from '@/types/content';

export default function TrendingPage() {
  const t = useTranslations('trending');
  const locale = useLocale();
  const [trending, setTrending] = useState<Content[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const data = await getTrending(locale);
        setTrending(data);
      } catch (error) {
        console.error('API fetch failed, using mock data:', error);
        setTrending(mockTrending);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [locale]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="mb-8 text-3xl font-bold">🔥 {t('title')}</h1>
      {isLoading ? (
        <ContentGridSkeleton count={10} />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {trending.map((content) => (
            <ContentCard key={content.id} content={content} />
          ))}
        </div>
      )}
    </div>
  );
}
