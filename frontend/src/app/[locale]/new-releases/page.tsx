'use client';

import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import ContentCard from '@/components/ContentCard';
import { ContentGridSkeleton } from '@/components/ContentCardSkeleton';
import { getNewReleases } from '@/lib/api';
import { mockNewReleases } from '@/lib/mock-data';
import { Content } from '@/types/content';

export default function NewReleasesPage() {
  const t = useTranslations('newReleases');
  const locale = useLocale();
  const [newReleases, setNewReleases] = useState<Content[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const data = await getNewReleases(locale);
        setNewReleases(data);
      } catch (error) {
        console.error('API fetch failed, using mock data:', error);
        setNewReleases(mockNewReleases);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [locale]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="mb-8 text-3xl font-bold">✨ {t('title')}</h1>
      {isLoading ? (
        <ContentGridSkeleton count={10} />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {newReleases.map((content) => (
            <ContentCard key={content.id} content={content} />
          ))}
        </div>
      )}
    </div>
  );
}
