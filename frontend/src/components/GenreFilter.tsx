'use client';

import { Link } from '@/i18n/navigation';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Genre } from '@/types/content';

interface GenreFilterProps {
  genres: Genre[];
  selectedGenre?: number;
  baseUrl: string;
}

export default function GenreFilter({ genres, selectedGenre, baseUrl }: GenreFilterProps) {
  const t = useTranslations('filter');
  const searchParams = useSearchParams();
  const currentOrdering = searchParams.get('ordering');

  const buildUrl = (genreId?: number) => {
    const params = new URLSearchParams();
    if (genreId) params.set('genre', genreId.toString());
    if (currentOrdering) params.set('ordering', currentOrdering);
    const query = params.toString();
    return query ? `${baseUrl}?${query}` : baseUrl;
  };

  return (
    <div className="mb-6 flex flex-wrap gap-2">
      <Link
        href={buildUrl()}
        className={`rounded-full px-4 py-2 text-sm transition-colors ${
          !selectedGenre
            ? 'bg-purple-600 text-white'
            : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
        }`}
      >
        {t('all')}
      </Link>
      {genres.map((genre) => (
        <Link
          key={genre.id}
          href={buildUrl(genre.id)}
          className={`rounded-full px-4 py-2 text-sm transition-colors ${
            selectedGenre === genre.id
              ? 'bg-purple-600 text-white'
              : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
          }`}
        >
          {genre.name}
        </Link>
      ))}
    </div>
  );
}
