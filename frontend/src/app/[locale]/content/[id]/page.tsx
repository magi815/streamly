'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { getContent as fetchContent } from '@/lib/api';
import { mockMovies, mockDramas, getMockReviews } from '@/lib/mock-data';
import { YouTubeReview, ContentDetail, Content } from '@/types/content';
import { localeToCountry, type Locale } from '@/i18n/config';

// Mock 데이터에서 콘텐츠 찾기 (fallback용)
function getMockContent(id: number): Content | undefined {
  const allContents = [...mockMovies, ...mockDramas];
  return allContents.find((c) => c.id === id);
}

// 플랫폼별 검색 URL - country_platforms의 search_url_template 사용
function getPlatformSearchUrl(platform: { code: string; search_url_template?: string | null }, title: string, locale: Locale): string {
  const encodedTitle = encodeURIComponent(title);

  // Use search_url_template from API if available
  if (platform.search_url_template) {
    return platform.search_url_template.replace('{title}', encodedTitle);
  }

  // Fallback to hardcoded URLs based on locale
  const country = localeToCountry[locale];
  const searchUrls: Record<string, Record<string, string>> = {
    KR: {
      netflix: `https://www.netflix.com/search?q=${encodedTitle}`,
      disney_plus: `https://www.disneyplus.com/ko-kr/search?q=${encodedTitle}`,
      tving: `https://www.tving.com/search?keyword=${encodedTitle}`,
      wavve: `https://www.wavve.com/search?searchWord=${encodedTitle}`,
      watcha: `https://watcha.com/search?query=${encodedTitle}`,
      coupang_play: `https://www.coupangplay.com/search?q=${encodedTitle}`,
      apple_tv_plus: `https://tv.apple.com/kr/search?term=${encodedTitle}`,
    },
    US: {
      netflix: `https://www.netflix.com/search?q=${encodedTitle}`,
      disney_plus: `https://www.disneyplus.com/search?q=${encodedTitle}`,
      hulu: `https://www.hulu.com/search?q=${encodedTitle}`,
      amazon_prime: `https://www.amazon.com/s?k=${encodedTitle}&i=instant-video`,
      max: `https://www.max.com/search?q=${encodedTitle}`,
      apple_tv_plus: `https://tv.apple.com/us/search?term=${encodedTitle}`,
      paramount_plus: `https://www.paramountplus.com/search/?q=${encodedTitle}`,
    },
    JP: {
      netflix: `https://www.netflix.com/search?q=${encodedTitle}`,
      disney_plus: `https://www.disneyplus.com/ja-jp/search?q=${encodedTitle}`,
      amazon_prime: `https://www.amazon.co.jp/s?k=${encodedTitle}&i=instant-video`,
      u_next: `https://video.unext.jp/search?query=${encodedTitle}`,
      dtv: `https://video.dmkt-sp.jp/search?keyword=${encodedTitle}`,
      hulu: `https://www.hulu.jp/search?q=${encodedTitle}`,
    },
  };

  return searchUrls[country]?.[platform.code] || '#';
}

// 조회수 포맷팅 (locale-aware)
function formatViewCount(count: number, locale: Locale): string {
  if (locale === 'ko') {
    if (count >= 10000) return `${(count / 10000).toFixed(0)}만회`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}천회`;
    return `${count}회`;
  } else if (locale === 'ja') {
    if (count >= 10000) return `${(count / 10000).toFixed(0)}万回`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}千回`;
    return `${count}回`;
  } else {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M views`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K views`;
    return `${count} views`;
  }
}

// YouTube 리뷰 카드 컴포넌트
function YouTubeReviewCard({ review, locale }: { review: YouTubeReview; locale: Locale }) {
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
      </div>
      <div className="p-3">
        <h4 className="mb-1 line-clamp-2 text-sm font-medium text-white group-hover:text-purple-400">
          {review.title}
        </h4>
        <div className="flex items-center justify-between text-xs text-gray-400">
          <span>{review.channel_name}</span>
          <span>{formatViewCount(review.view_count, locale)}</span>
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

const REVIEWS_PER_PAGE = 6;

export default function ContentDetailPage() {
  const t = useTranslations('content');
  const tCommon = useTranslations('common');
  const tFilter = useTranslations('filter');
  const locale = useLocale() as Locale;
  const params = useParams();
  const contentId = parseInt(params.id as string);

  const [content, setContent] = useState<ContentDetail | null>(null);
  const [reviews, setReviews] = useState<YouTubeReview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [visibleReviews, setVisibleReviews] = useState(REVIEWS_PER_PAGE);

  useEffect(() => {
    async function fetchData() {
      try {
        const data = await fetchContent(contentId, locale);
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
  }, [contentId, locale]);

  if (isLoading) {
    return <ContentDetailSkeleton />;
  }

  if (notFound || !content) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-20 text-center">
        <h1 className="mb-4 text-2xl font-bold text-white">{tCommon('noData')}</h1>
        <Link href="/" className="text-purple-400 hover:text-purple-300">
          ← {tCommon('viewMore')}
        </Link>
      </div>
    );
  }

  const year = content.release_date?.split('-')[0] || '';
  const contentTypeLabel = content.content_type === 'movie' ? tFilter('movie') : tFilter('drama');

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
            {content.title_en && (
              <p className="mb-4 text-lg text-gray-400">{content.title_en}</p>
            )}

            {/* Meta Info */}
            <div className="mb-6 flex flex-wrap items-center gap-4 text-sm text-gray-400">
              {year && <span>{year}</span>}
              <span>{contentTypeLabel}</span>
              {content.runtime && <span>{content.runtime}{t('minutes')}</span>}
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
                <h2 className="mb-2 text-lg font-semibold text-white">{t('overview')}</h2>
                <p className="leading-relaxed text-gray-300">{content.overview}</p>
              </div>
            )}

            {/* Director & Cast */}
            <div className="grid gap-4 md:grid-cols-2">
              {content.director && (
                <div>
                  <h3 className="mb-1 text-sm font-medium text-gray-400">{t('director')}</h3>
                  <p className="text-white">{content.director}</p>
                </div>
              )}
              {content.cast && content.cast.length > 0 && (
                <div>
                  <h3 className="mb-1 text-sm font-medium text-gray-400">{t('cast')}</h3>
                  <p className="text-white">{content.cast.join(', ')}</p>
                </div>
              )}
            </div>

            {/* Watch Providers (OTT Platforms) */}
            {content.platforms && content.platforms.length > 0 && (
              <div className="mt-6">
                <h3 className="mb-3 text-sm font-medium text-gray-400">{t('watchOn')}</h3>
                <div className="flex flex-wrap gap-3">
                  {/* 플랫폼 중복 제거 (code 기준) */}
                  {content.platforms
                    .filter((platform, index, self) =>
                      index === self.findIndex(p => p.code === platform.code)
                    )
                    .map((platform) => (
                    <a
                      key={platform.id || platform.code}
                      href={getPlatformSearchUrl(platform, content.title, locale)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 rounded-lg bg-gray-800 px-4 py-2 transition-colors hover:bg-gray-700"
                    >
                      {platform.logo_url && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={platform.logo_url}
                          alt={platform.name}
                          className="h-6 w-6 rounded"
                        />
                      )}
                      <span className="text-sm font-medium text-white">
                        {platform.name_local || platform.name}
                      </span>
                      <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
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
              {t('reviews')}
              <span className="text-base font-normal text-gray-400">({reviews.length})</span>
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {reviews.slice(0, visibleReviews).map((review) => (
                <YouTubeReviewCard key={review.id} review={review} locale={locale} />
              ))}
            </div>
            {/* Load More button */}
            {reviews.length > visibleReviews && (
              <div className="mt-6 text-center">
                <button
                  onClick={() => setVisibleReviews(prev => prev + REVIEWS_PER_PAGE)}
                  className="inline-flex items-center gap-2 rounded-lg bg-gray-800 px-6 py-3 font-medium text-white transition-colors hover:bg-gray-700"
                >
                  {t('moreReviews')} ({reviews.length - visibleReviews})
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>
            )}
          </section>
        )}

        {/* Back Button */}
        <div className="py-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-gray-400 hover:text-white"
          >
            ← {tCommon('close')}
          </Link>
        </div>
      </div>
    </div>
  );
}
