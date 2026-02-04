'use client';

import { useRouter } from '@/i18n/navigation';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';

interface SortDropdownProps {
  baseUrl: string;
}

export default function SortDropdown({ baseUrl }: SortDropdownProps) {
  const t = useTranslations('filter');
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentSort = searchParams.get('ordering') || '-popularity';
  const currentGenre = searchParams.get('genre');
  const currentPeriod = searchParams.get('period') || '1';

  const isPopularitySort = currentSort === '-popularity';

  const sortOptions = [
    { value: '-popularity', label: t('popularity') },
    { value: '-rating', label: `${t('rating')} ↑` },
    { value: 'rating', label: `${t('rating')} ↓` },
    { value: '-release_date', label: t('releaseDate') },
    { value: 'release_date', label: `${t('releaseDate')} ↑` },
  ];

  const periodOptions = [
    { value: '1', label: t('year1') },
    { value: '2', label: t('year2') },
    { value: '5', label: t('year5') },
    { value: 'all', label: t('allTime') },
  ];

  const buildUrl = (ordering: string, period?: string) => {
    const params = new URLSearchParams();
    if (currentGenre) params.set('genre', currentGenre);
    params.set('ordering', ordering);
    if (ordering === '-popularity' && period && period !== '1') {
      params.set('period', period);
    }
    return `${baseUrl}?${params.toString()}`;
  };

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSort = e.target.value;
    const period = newSort === '-popularity' ? currentPeriod : undefined;
    router.push(buildUrl(newSort, period));
  };

  const handlePeriodChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    router.push(buildUrl(currentSort, e.target.value));
  };

  return (
    <div className="flex items-center gap-2">
      {isPopularitySort && (
        <select
          value={currentPeriod}
          onChange={handlePeriodChange}
          className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-300 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
        >
          {periodOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      )}

      <select
        value={currentSort}
        onChange={handleSortChange}
        className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-300 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
      >
        {sortOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
