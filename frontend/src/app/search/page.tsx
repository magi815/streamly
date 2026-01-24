'use client';

import { useState, useDeferredValue, useEffect } from 'react';
import ContentCard from '@/components/ContentCard';
import { searchContents } from '@/lib/api';
import { mockMovies, mockDramas } from '@/lib/mock-data';
import { Content } from '@/types/content';

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Content[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const deferredQuery = useDeferredValue(query);
  const isSearching = query !== deferredQuery || isLoading;

  useEffect(() => {
    const trimmedQuery = deferredQuery.trim();
    if (!trimmedQuery) {
      setResults([]);
      setTotalCount(0);
      return;
    }

    const fetchResults = async () => {
      setIsLoading(true);
      try {
        const data = await searchContents(trimmedQuery);
        setResults(data.results);
        setTotalCount(data.count);
      } catch (error) {
        console.error('API search failed, using mock data:', error);
        // Fallback to mock data search
        const allContents = [...mockMovies, ...mockDramas];
        const filtered = allContents.filter(
          (c) =>
            c.title.toLowerCase().includes(trimmedQuery.toLowerCase()) ||
            c.title_en.toLowerCase().includes(trimmedQuery.toLowerCase())
        );
        setResults(filtered);
        setTotalCount(filtered.length);
      } finally {
        setIsLoading(false);
      }
    };

    fetchResults();
  }, [deferredQuery]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      {/* Search Input */}
      <div className="mb-8">
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="영화, 드라마 제목을 검색하세요"
            className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 pl-12 text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none"
          />
          <svg
            className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
      </div>

      {/* Results */}
      {isSearching ? (
        <div className="py-20 text-center text-gray-400">검색 중...</div>
      ) : query && results.length === 0 ? (
        <div className="py-20 text-center">
          <p className="text-lg text-gray-400">
            &quot;{query}&quot;에 대한 검색 결과가 없습니다
          </p>
        </div>
      ) : results.length > 0 ? (
        <>
          <p className="mb-4 text-gray-400">
            &quot;{query}&quot; 검색 결과 {totalCount}개
          </p>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {results.map((content) => (
              <ContentCard key={content.id} content={content} />
            ))}
          </div>
        </>
      ) : (
        <div className="py-20 text-center">
          <p className="mb-2 text-lg text-gray-400">검색어를 입력하세요</p>
          <p className="text-sm text-gray-500">
            영화나 드라마 제목으로 검색할 수 있습니다
          </p>
        </div>
      )}
    </div>
  );
}
