import { Content, ContentDetail, Genre, Platform, PaginatedResponse, YouTubeReview } from '@/types/content';
import { localeToCountry, type Locale } from '@/i18n/config';

// Workers API URL (hardcoded for Cloudflare Workers compatibility)
const API_BASE_URL = 'https://whatview-api.magi815.workers.dev/api/v1';

// Helper to add locale params to URL
function addLocaleParams(params: URLSearchParams, locale?: string) {
  if (locale) {
    const country = localeToCountry[locale as Locale] || 'KR';
    params.set('country', country);
    params.set('language', locale);
  }
}

async function fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  console.log('[API] Fetching:', url);

  const res = await fetch(url, {
    ...options,
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!res.ok) {
    console.error('[API] Error:', res.status, res.statusText);
    throw new Error(`API Error: ${res.status}`);
  }

  return res.json();
}

// 콘텐츠 API
export async function getContents(params?: {
  page?: number;
  content_type?: string;
  genre?: number;
  ordering?: string;
  recent?: boolean;
  period?: string;
  locale?: string;
}): Promise<PaginatedResponse<Content>> {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set('page', params.page.toString());
  if (params?.content_type) searchParams.set('content_type', params.content_type);
  if (params?.genre) searchParams.set('genre', params.genre.toString());
  if (params?.ordering) searchParams.set('ordering', params.ordering);
  if (params?.recent) searchParams.set('recent', 'true');
  if (params?.period) searchParams.set('period', params.period);
  addLocaleParams(searchParams, params?.locale);

  const query = searchParams.toString();
  return fetchAPI(`/contents${query ? `?${query}` : ''}`);
}

export async function getContent(id: number, locale?: string): Promise<ContentDetail> {
  const searchParams = new URLSearchParams();
  addLocaleParams(searchParams, locale);
  const query = searchParams.toString();
  return fetchAPI(`/contents/${id}${query ? `?${query}` : ''}`);
}

export async function getMovies(page = 1, locale?: string): Promise<PaginatedResponse<Content>> {
  const searchParams = new URLSearchParams();
  searchParams.set('page', page.toString());
  addLocaleParams(searchParams, locale);
  return fetchAPI(`/contents/movies?${searchParams.toString()}`);
}

export async function getDramas(page = 1, locale?: string): Promise<PaginatedResponse<Content>> {
  const searchParams = new URLSearchParams();
  searchParams.set('page', page.toString());
  addLocaleParams(searchParams, locale);
  return fetchAPI(`/contents/dramas?${searchParams.toString()}`);
}

export async function getTrending(locale?: string): Promise<Content[]> {
  const searchParams = new URLSearchParams();
  addLocaleParams(searchParams, locale);
  const query = searchParams.toString();
  return fetchAPI(`/contents/trending${query ? `?${query}` : ''}`);
}

export async function getNewReleases(locale?: string): Promise<Content[]> {
  const searchParams = new URLSearchParams();
  addLocaleParams(searchParams, locale);
  const query = searchParams.toString();
  return fetchAPI(`/contents/new-releases${query ? `?${query}` : ''}`);
}

// 최근 인기 콘텐츠 (홈페이지용)
export async function getRecentPopular(contentType: 'movie' | 'drama', limit = 6, locale?: string): Promise<Content[]> {
  const data = await getContents({
    content_type: contentType,
    ordering: '-popularity',
    recent: true,
    locale,
  });
  return data.results.slice(0, limit);
}

export async function searchContents(query: string, page = 1, locale?: string): Promise<PaginatedResponse<Content>> {
  const searchParams = new URLSearchParams();
  searchParams.set('q', query);
  searchParams.set('page', page.toString());
  addLocaleParams(searchParams, locale);
  return fetchAPI(`/contents/search?${searchParams.toString()}`);
}

// 장르 API
export async function getGenres(contentType?: 'movie' | 'drama'): Promise<Genre[]> {
  const query = contentType ? `?content_type=${contentType}` : '';
  return fetchAPI(`/genres${query}`);
}

// 플랫폼 API
export async function getPlatforms(locale?: string): Promise<Platform[]> {
  const searchParams = new URLSearchParams();
  addLocaleParams(searchParams, locale);
  const query = searchParams.toString();
  return fetchAPI(`/platforms${query ? `?${query}` : ''}`);
}

// YouTube 리뷰 API
export async function getContentReviews(contentId: number, locale?: string): Promise<YouTubeReview[]> {
  const searchParams = new URLSearchParams();
  addLocaleParams(searchParams, locale);
  const query = searchParams.toString();
  return fetchAPI(`/contents/${contentId}/reviews${query ? `?${query}` : ''}`);
}
