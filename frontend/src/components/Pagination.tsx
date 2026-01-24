'use client';

import Link from 'next/link';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  baseUrl: string;
  queryParams?: Record<string, string>;
}

export default function Pagination({ currentPage, totalPages, baseUrl, queryParams = {} }: PaginationProps) {
  if (totalPages <= 1) return null;

  const createUrl = (page: number) => {
    const params = new URLSearchParams(queryParams);
    params.set('page', page.toString());
    return `${baseUrl}?${params.toString()}`;
  };

  // Generate page numbers to show
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const showPages = 5; // Number of page buttons to show

    let start = Math.max(1, currentPage - Math.floor(showPages / 2));
    let end = Math.min(totalPages, start + showPages - 1);

    // Adjust start if we're near the end
    if (end - start + 1 < showPages) {
      start = Math.max(1, end - showPages + 1);
    }

    if (start > 1) {
      pages.push(1);
      if (start > 2) pages.push('...');
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    if (end < totalPages) {
      if (end < totalPages - 1) pages.push('...');
      pages.push(totalPages);
    }

    return pages;
  };

  const pages = getPageNumbers();

  return (
    <nav className="mt-8 flex items-center justify-center gap-1">
      {/* Previous Button */}
      {currentPage > 1 ? (
        <Link
          href={createUrl(currentPage - 1)}
          className="rounded-lg px-3 py-2 text-sm text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
        >
          ← 이전
        </Link>
      ) : (
        <span className="rounded-lg px-3 py-2 text-sm text-gray-600 cursor-not-allowed">
          ← 이전
        </span>
      )}

      {/* Page Numbers */}
      <div className="flex items-center gap-1">
        {pages.map((page, index) => (
          typeof page === 'number' ? (
            <Link
              key={index}
              href={createUrl(page)}
              className={`rounded-lg px-3 py-2 text-sm transition-colors ${
                page === currentPage
                  ? 'bg-purple-600 text-white font-medium'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`}
            >
              {page}
            </Link>
          ) : (
            <span key={index} className="px-2 text-gray-600">
              {page}
            </span>
          )
        ))}
      </div>

      {/* Next Button */}
      {currentPage < totalPages ? (
        <Link
          href={createUrl(currentPage + 1)}
          className="rounded-lg px-3 py-2 text-sm text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
        >
          다음 →
        </Link>
      ) : (
        <span className="rounded-lg px-3 py-2 text-sm text-gray-600 cursor-not-allowed">
          다음 →
        </span>
      )}
    </nav>
  );
}
