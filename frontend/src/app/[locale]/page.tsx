'use client';

import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import ContentSection from '@/components/ContentSection';
import { ContentGridSkeleton } from '@/components/ContentCardSkeleton';
import { getTrending, getNewReleases, getRecentPopular } from '@/lib/api';
import { mockTrending, mockNewReleases, mockMovies, mockDramas } from '@/lib/mock-data';
import { Content } from '@/types/content';

function SectionSkeleton({ title }: { title: string }) {
  return (
    <section className="py-8">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">{title}</h2>
      </div>
      <ContentGridSkeleton count={6} />
    </section>
  );
}

export default function HomePage() {
  const t = useTranslations('home');
  const locale = useLocale();
  const [trending, setTrending] = useState<Content[]>([]);
  const [newReleases, setNewReleases] = useState<Content[]>([]);
  const [movies, setMovies] = useState<Content[]>([]);
  const [dramas, setDramas] = useState<Content[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [trendingData, newReleasesData, moviesData, dramasData] = await Promise.all([
          getTrending(locale),
          getNewReleases(locale),
          getRecentPopular('movie', 6, locale),
          getRecentPopular('drama', 6, locale),
        ]);
        setTrending(trendingData);
        setNewReleases(newReleasesData);
        setMovies(moviesData);
        setDramas(dramasData);
      } catch (error) {
        console.error('API fetch failed, using mock data:', error);
        setTrending(mockTrending);
        setNewReleases(mockNewReleases);
        setMovies(mockMovies);
        setDramas(mockDramas);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [locale]);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8">
        <SectionSkeleton title={t('trending')} />
        <SectionSkeleton title={t('newReleases')} />
        <SectionSkeleton title={t('popularMovies')} />
        <SectionSkeleton title={t('popularDramas')} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      {/* Trending */}
      <ContentSection
        title={t('trending')}
        contents={trending}
        viewAllHref="/trending"
      />

      {/* New Releases */}
      <ContentSection
        title={t('newReleases')}
        contents={newReleases}
        viewAllHref="/new-releases"
      />

      {/* Movies */}
      <ContentSection
        title={t('popularMovies')}
        contents={movies}
        viewAllHref="/movies"
      />

      {/* Dramas */}
      <ContentSection
        title={t('popularDramas')}
        contents={dramas}
        viewAllHref="/dramas"
      />
    </div>
  );
}
