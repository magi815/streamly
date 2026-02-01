'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import ContentCard from '@/components/ContentCard';
import Pagination from '@/components/Pagination';
import GenreFilter from '@/components/GenreFilter';
import SortDropdown from '@/components/SortDropdown';
import { ContentGridSkeleton } from '@/components/ContentCardSkeleton';
import { getContents, getGenres } from '@/lib/api';
import { mockMovies } from '@/lib/mock-data';
import { Content, Genre } from '@/types/content';

function MoviesContent() {
  const t = useTranslations();
  const locale = useLocale();
  const searchParams = useSearchParams();
  const page = parseInt(searchParams.get('page') || '1');
  const genre = searchParams.get('genre') ? parseInt(searchParams.get('genre')!) : undefined;
  const ordering = searchParams.get('ordering') || '-popularity';
  const period = searchParams.get('period') || '1';

  const [movies, setMovies] = useState<Content[]>([]);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const pageSize = 20;
  const totalPages = Math.ceil(totalCount / pageSize);

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      try {
        const [contentsData, genresData] = await Promise.all([
          getContents({ page, content_type: 'movie', genre, ordering, period, locale }),
          getGenres('movie'),
        ]);
        setMovies(contentsData.results);
        setTotalCount(contentsData.count);
        setGenres(genresData);
      } catch (error) {
        console.error('API fetch failed, using mock data:', error);
        setMovies(mockMovies);
        setTotalCount(mockMovies.length);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [page, genre, ordering, period, locale]);

  const queryParams: Record<string, string> = { ordering };
  if (genre) queryParams.genre = genre.toString();
  if (ordering === '-popularity' && period && period !== '1') {
    queryParams.period = period;
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      {/* Header with Title and Sort */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl font-bold text-white">🎬 {t('movies.title')}</h1>
        <SortDropdown baseUrl="/movies" />
      </div>

      {/* Genre Filter */}
      {genres.length > 0 && (
        <GenreFilter
          genres={genres}
          selectedGenre={genre}
          baseUrl="/movies"
        />
      )}

      {isLoading ? (
        <ContentGridSkeleton count={20} />
      ) : (
        <>
          {/* Results count */}
          <p className="mb-4 text-sm text-gray-400">
            {t('search.resultsCount', { count: totalCount })}
          </p>

          {/* Content Grid */}
          {movies.length > 0 ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {movies.map((content) => (
                <ContentCard key={content.id} content={content} />
              ))}
            </div>
          ) : (
            <div className="py-12 text-center text-gray-400">
              {t('common.noData')}
            </div>
          )}

          {/* Pagination */}
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            baseUrl="/movies"
            queryParams={queryParams}
          />
        </>
      )}
    </div>
  );
}

export default function MoviesPage() {
  const t = useTranslations('movies');

  return (
    <Suspense fallback={
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white">🎬 {t('title')}</h1>
        </div>
        <ContentGridSkeleton count={20} />
      </div>
    }>
      <MoviesContent />
    </Suspense>
  );
}
