'use client';

import { useRouter, useSearchParams } from 'next/navigation';

interface SortOption {
  value: string;
  label: string;
}

interface PeriodOption {
  value: string;
  label: string;
}

const sortOptions: SortOption[] = [
  { value: '-popularity', label: '인기순' },
  { value: '-rating', label: '평점 높은순' },
  { value: 'rating', label: '평점 낮은순' },
  { value: '-release_date', label: '최신순' },
  { value: 'release_date', label: '오래된순' },
];

const periodOptions: PeriodOption[] = [
  { value: '1', label: '최근 1년' },
  { value: '2', label: '최근 2년' },
  { value: '5', label: '최근 5년' },
  { value: 'all', label: '전체' },
];

interface SortDropdownProps {
  baseUrl: string;
}

export default function SortDropdown({ baseUrl }: SortDropdownProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentSort = searchParams.get('ordering') || '-popularity';
  const currentGenre = searchParams.get('genre');
  const currentPeriod = searchParams.get('period') || '1';

  const isPopularitySort = currentSort === '-popularity';

  const buildUrl = (ordering: string, period?: string) => {
    const params = new URLSearchParams();
    if (currentGenre) params.set('genre', currentGenre);
    params.set('ordering', ordering);
    // 인기순일 때만 period 파라미터 추가
    if (ordering === '-popularity' && period && period !== '1') {
      params.set('period', period);
    }
    return `${baseUrl}?${params.toString()}`;
  };

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSort = e.target.value;
    // 인기순으로 변경 시 기본 기간은 1년
    const period = newSort === '-popularity' ? currentPeriod : undefined;
    router.push(buildUrl(newSort, period));
  };

  const handlePeriodChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    router.push(buildUrl(currentSort, e.target.value));
  };

  return (
    <div className="flex items-center gap-2">
      {/* 인기순일 때만 기간 선택 표시 */}
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

      {/* 정렬 선택 */}
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
