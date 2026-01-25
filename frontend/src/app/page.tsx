'use client';

import { useEffect, useState } from 'react';
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
  const [trending, setTrending] = useState<Content[]>([]);
  const [newReleases, setNewReleases] = useState<Content[]>([]);
  const [movies, setMovies] = useState<Content[]>([]);
  const [dramas, setDramas] = useState<Content[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [trendingData, newReleasesData, moviesData, dramasData] = await Promise.all([
          getTrending(),
          getNewReleases(),
          getRecentPopular('movie', 6),
          getRecentPopular('drama', 6),
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
  }, []);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8">
        <SectionSkeleton title="🔥 지금 인기있는 콘텐츠" />
        <SectionSkeleton title="✨ 신작 콘텐츠" />
        <SectionSkeleton title="🎬 인기 영화" />
        <SectionSkeleton title="📺 인기 드라마" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      {/* Trending */}
      <ContentSection
        title="🔥 지금 인기있는 콘텐츠"
        contents={trending}
        viewAllHref="/trending"
      />

      {/* New Releases */}
      <ContentSection
        title="✨ 신작 콘텐츠"
        contents={newReleases}
        viewAllHref="/new-releases"
      />

      {/* Movies */}
      <ContentSection
        title="🎬 인기 영화"
        contents={movies}
        viewAllHref="/movies"
      />

      {/* Dramas */}
      <ContentSection
        title="📺 인기 드라마"
        contents={dramas}
        viewAllHref="/dramas"
      />
    </div>
  );
}
