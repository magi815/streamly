import { Metadata } from 'next';
import ContentCard from '@/components/ContentCard';
import Pagination from '@/components/Pagination';
import GenreFilter from '@/components/GenreFilter';
import SortDropdown from '@/components/SortDropdown';
import { ContentGridSkeleton } from '@/components/ContentCardSkeleton';
import { getContents, getGenres } from '@/lib/api';
import { mockDramas } from '@/lib/mock-data';
import { Suspense } from 'react';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: '드라마 - Streamly',
  description: 'OTT에서 볼 수 있는 드라마 목록',
};

interface PageProps {
  searchParams: Promise<{ page?: string; genre?: string; ordering?: string; period?: string }>;
}

async function DramasContent({ page, genre, ordering, period }: { page: number; genre?: number; ordering: string; period: string }) {
  let dramas;
  let totalCount = 0;
  const pageSize = 20;

  try {
    const data = await getContents({
      page,
      content_type: 'drama',
      genre,
      ordering,
      period,
    });
    dramas = data.results;
    totalCount = data.count;
  } catch (error) {
    console.error('API fetch failed, using mock data:', error);
    dramas = mockDramas;
    totalCount = mockDramas.length;
  }

  const totalPages = Math.ceil(totalCount / pageSize);
  const queryParams: Record<string, string> = { ordering };
  if (genre) queryParams.genre = genre.toString();
  if (ordering === '-popularity' && period && period !== '1') {
    queryParams.period = period;
  }

  return (
    <>
      {/* Results count */}
      <p className="mb-4 text-sm text-gray-400">
        총 {totalCount}개의 드라마
      </p>

      {/* Content Grid */}
      {dramas.length > 0 ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {dramas.map((content) => (
            <ContentCard key={content.id} content={content} />
          ))}
        </div>
      ) : (
        <div className="py-12 text-center text-gray-400">
          해당 장르의 드라마가 없습니다.
        </div>
      )}

      {/* Pagination */}
      <Pagination
        currentPage={page}
        totalPages={totalPages}
        baseUrl="/dramas"
        queryParams={queryParams}
      />
    </>
  );
}

export default async function DramasPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = parseInt(params.page || '1');
  const genre = params.genre ? parseInt(params.genre) : undefined;
  const ordering = params.ordering || '-popularity';
  const period = params.period || '1';

  // Fetch genres for filter (드라마에 콘텐츠가 있는 장르만)
  let genres = [];
  try {
    genres = await getGenres('drama');
  } catch (error) {
    console.error('Failed to fetch genres:', error);
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      {/* Header with Title and Sort */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl font-bold text-white">📺 드라마</h1>
        <SortDropdown baseUrl="/dramas" />
      </div>

      {/* Genre Filter */}
      {genres.length > 0 && (
        <GenreFilter
          genres={genres}
          selectedGenre={genre}
          baseUrl="/dramas"
        />
      )}

      {/* Content with Suspense */}
      <Suspense fallback={<ContentGridSkeleton count={20} />}>
        <DramasContent page={page} genre={genre} ordering={ordering} period={period} />
      </Suspense>
    </div>
  );
}
