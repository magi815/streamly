'use client';

import { useEffect, useState } from 'react';
import ContentSection from '@/components/ContentSection';
import { getTrending, getNewReleases, getRecentPopular } from '@/lib/api';
import { mockTrending, mockNewReleases, mockMovies, mockDramas } from '@/lib/mock-data';
import { Content } from '@/types/content';

export default function HomePage() {
  const [trending, setTrending] = useState<Content[]>(mockTrending);
  const [newReleases, setNewReleases] = useState<Content[]>(mockNewReleases);
  const [movies, setMovies] = useState<Content[]>(mockMovies);
  const [dramas, setDramas] = useState<Content[]>(mockDramas);
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
        // Keep using mock data as fallback (already set as initial state)
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, []);

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
