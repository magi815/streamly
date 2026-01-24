import ContentSection from '@/components/ContentSection';
import { getTrending, getNewReleases, getRecentPopular } from '@/lib/api';
import { mockTrending, mockNewReleases, mockMovies, mockDramas } from '@/lib/mock-data';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  let trending, newReleases, movies, dramas;

  try {
    const [trendingData, newReleasesData, moviesData, dramasData] = await Promise.all([
      getTrending(),
      getNewReleases(),
      getRecentPopular('movie', 6),
      getRecentPopular('drama', 6),
    ]);
    trending = trendingData;
    newReleases = newReleasesData;
    movies = moviesData;
    dramas = dramasData;
  } catch (error) {
    // API 실패 시 mock 데이터 사용
    console.error('API fetch failed, using mock data:', error);
    trending = mockTrending;
    newReleases = mockNewReleases;
    movies = mockMovies;
    dramas = mockDramas;
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
