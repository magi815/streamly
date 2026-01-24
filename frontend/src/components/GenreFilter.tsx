'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Genre } from '@/types/content';

interface GenreFilterProps {
  genres: Genre[];
  selectedGenre?: number;
  baseUrl: string;
}

export default function GenreFilter({ genres, selectedGenre, baseUrl }: GenreFilterProps) {
  const searchParams = useSearchParams();
  const currentOrdering = searchParams.get('ordering');

  // 현재 정렬 순서를 유지하면서 URL 생성
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
        전체
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
