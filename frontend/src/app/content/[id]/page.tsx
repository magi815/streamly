'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { getContent as fetchContent } from '@/lib/api';
import { mockMovies, mockDramas, getMockReviews } from '@/lib/mock-data';
import { YouTubeReview, ContentDetail, Content } from '@/types/content';

// Mock 데이터에서 콘텐츠 찾기 (fallback용)
function getMockContent(id: number): Content | undefined {
  const allContents = [...mockMovies, ...mockDramas];
  return allContents.find((c) => c.id === id);
}

// 조회수 포맷팅
function formatViewCount(count: number): string {
  if (count >= 10000) {
    return `${(count / 10000).toFixed(0)}만회`;
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}천회`;
  }
  return `${count}회`;
}

// YouTube 리뷰 카드 컴포넌트
function YouTubeReviewCard({ review }: { review: YouTubeReview }) {
  return (
    <a
      href={review.youtube_url}
      target="_blank"
      rel="noopener noreferrer"
      className="group block overflow-hidden rounded-lg bg-gray-800 transition-transform hover:scale-[1.02]"
    >
      <div className="relative aspect-video">
        {review.thumbnail_url ? (
          <Image
            src={review.thumbnail_url}
            alt={review.title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 33vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-gray-700">
            <svg className="h-12 w-12 text-gray-500" fill="currentColor" viewBox="0 0 24 24">
              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
            </svg>
          </div>
        )}
        {/* Play button overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition-opacity group-hover:opacity-100">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-600">
            <svg className="h-6 w-6 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z"/>
            </svg>
          </div>
        </div>
        {/* Featured badge */}
        {review.is_featured && (
          <div className="absolute left-2 top-2 rounded bg-red-600 px-2 py-0.5 text-xs font-medium text-white">
            추천
          </div>
        )}
      </div>
      <div className="p-3">
        <h4 className="mb-1 line-clamp-2 text-sm font-medium text-white group-hover:text-purple-400">
          {review.title}
        </h4>
        <div className="flex items-center justify-between text-xs text-gray-400">
          <span>{review.channel_name}</span>
          <span>조회수 {formatViewCount(review.view_count)}</span>
        </div>
      </div>
    </a>
  );
}

// Loading skeleton
function ContentDetailSkeleton() {
  return (
    <div>
      <div className="relative h-[400px] w-full animate-pulse bg-gray-800" />
      <div className="mx-auto max-w-7xl px-4">
        <div className="-mt-32 relative z-10 flex flex-col gap-8 md:flex-row">
          <div className="h-[300px] w-[200px] animate-pulse rounded-lg bg-gray-700 md:h-[375px] md:w-[250px]" />
          <div className="flex-1 py-4 space-y-4">
            <div className="h-10 w-3/4 animate-pulse rounded bg-gray-700" />
            <div className="h-6 w-1/2 animate-pulse rounded bg-gray-700" />
            <div className="h-4 w-1/3 animate-pulse rounded bg-gray-700" />
            <div className="h-24 animate-pulse rounded bg-gray-700" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ContentDetailPage() {
  const params = useParams();
  const contentId = parseInt(params.id as string);

  const [content, setContent] = useState<ContentDetail | null>(null);
  const [reviews, setReviews] = useState<YouTubeReview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const data = await fetchContent(contentId);
        setContent(data);
        setReviews(data.youtube_reviews || []);
      } catch (error) {
        console.error('API fetch failed, using mock data:', error);
        const mockContent = getMockContent(contentId);
        if (mockContent) {
          setContent({
            ...mockContent,
            vote_count: 0,
            is_adult: false,
          });
          setReviews(getMockReviews(contentId));
        } else {
          setNotFound(true);
        }
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [contentId]);

  if (isLoading) {
    return <ContentDetailSkeleton />;
  }

  if (notFound || !content) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-20 text-center">
        <h1 className="mb-4 text-2xl font-bold text-white">콘텐츠를 찾을 수 없습니다</h1>
        <Link href="/" className="text-purple-400 hover:text-purple-300">
          홈으로 돌아가기
        </Link>
      </div>
    );
  }

  const year = content.release_date?.split('-')[0] || '';

  return (
    <div>
      {/* Backdrop */}
      <div className="relative h-[400px] w-full">
        {content.backdrop_url || content.poster_url ? (
          <Image
            src={content.backdrop_url || content.poster_url}
            alt={content.title}
            fill
            className="object-cover"
            priority
          />
        ) : (
          <div className="h-full w-full bg-gray-800" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/50 to-transparent" />
      </div>

      {/* Content Info */}
      <div className="mx-auto max-w-7xl px-4">
        <div className="-mt-32 relative z-10 flex flex-col gap-8 md:flex-row">
          {/* Poster */}
          <div className="flex-shrink-0">
            <div className="relative h-[300px] w-[200px] overflow-hidden rounded-lg shadow-xl md:h-[375px] md:w-[250px]">
              {content.poster_url ? (
                <Image
                  src={content.poster_url}
                  alt={content.title}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center bg-gray-700">
                  <span className="text-gray-400">No Image</span>
                </div>
              )}
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 py-4">
            <h1 className="mb-2 text-3xl font-bold text-white md:text-4xl">
              {content.title}
            </h1>
            <p className="mb-4 text-lg text-gray-400">{content.title_en}</p>

            {/* Meta Info */}
            <div className="mb-6 flex flex-wrap items-center gap-4 text-sm text-gray-400">
              {year && <span>{year}</span>}
              <span>{content.content_type === 'movie' ? '영화' : '드라마'}</span>
              {content.runtime && <span>{content.runtime}분</span>}
              <span className="flex items-center gap-1">
                <span className="text-yellow-400">★</span>
                {content.rating.toFixed(1)}
              </span>
            </div>

            {/* Genres */}
            <div className="mb-6 flex flex-wrap gap-2">
              {content.genres.map((genre) => (
                <span
                  key={genre.id}
                  className="rounded-full bg-gray-800 px-3 py-1 text-sm text-gray-300"
                >
                  {genre.name}
                </span>
              ))}
            </div>

            {/* Overview */}
            {content.overview && (
              <div className="mb-6">
                <h2 className="mb-2 text-lg font-semibold text-white">줄거리</h2>
                <p className="leading-relaxed text-gray-300">{content.overview}</p>
              </div>
            )}

            {/* Director & Cast */}
            <div className="grid gap-4 md:grid-cols-2">
              {content.director && (
                <div>
                  <h3 className="mb-1 text-sm font-medium text-gray-400">감독</h3>
                  <p className="text-white">{content.director}</p>
                </div>
              )}
              {content.cast && content.cast.length > 0 && (
                <div>
                  <h3 className="mb-1 text-sm font-medium text-gray-400">출연</h3>
                  <p className="text-white">{content.cast.join(', ')}</p>
                </div>
              )}
            </div>

            {/* Watch Providers (OTT Platforms) */}
            {content.platforms && content.platforms.length > 0 && (
              <div className="mt-6">
                <h3 className="mb-3 text-sm font-medium text-gray-400">시청 가능한 곳</h3>
                <div className="flex flex-wrap gap-3">
                  {content.platforms.map((platform) => (
                    <a
                      key={platform.id}
                      href={platform.website_url || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 rounded-lg bg-gray-800 px-4 py-2 transition-colors hover:bg-gray-700"
                    >
                      {platform.logo_url && (
                        <img
                          src={platform.logo_url}
                          alt={platform.name}
                          className="h-6 w-6 rounded"
                        />
                      )}
                      <span className="text-sm font-medium text-white">{platform.name}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* YouTube Reviews Section */}
        {reviews.length > 0 && (
          <section className="mt-12">
            <h2 className="mb-6 flex items-center gap-2 text-2xl font-bold text-white">
              <svg className="h-7 w-7 text-red-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
              </svg>
              리뷰 영상
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {reviews.map((review) => (
                <YouTubeReviewCard key={review.id} review={review} />
              ))}
            </div>
          </section>
        )}

        {/* Back Button */}
        <div className="py-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-gray-400 hover:text-white"
          >
            ← 돌아가기
          </Link>
        </div>
      </div>
    </div>
  );
}
