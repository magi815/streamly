import { Content, ContentDetail, Genre, Platform, PaginatedResponse, YouTubeReview } from '@/types/content';

// Workers API URL (development: 127.0.0.1:8787, production: streamly-api.{your-subdomain}.workers.dev)
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8787/api/v1';

async function fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!res.ok) {
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
}): Promise<PaginatedResponse<Content>> {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set('page', params.page.toString());
  if (params?.content_type) searchParams.set('content_type', params.content_type);
  if (params?.genre) searchParams.set('genre', params.genre.toString());
  if (params?.ordering) searchParams.set('ordering', params.ordering);
  if (params?.recent) searchParams.set('recent', 'true');
  if (params?.period) searchParams.set('period', params.period);

  const query = searchParams.toString();
  return fetchAPI(`/contents${query ? `?${query}` : ''}`);
}

export async function getContent(id: number): Promise<ContentDetail> {
  return fetchAPI(`/contents/${id}`);
}

export async function getMovies(page = 1): Promise<PaginatedResponse<Content>> {
  return fetchAPI(`/contents/movies?page=${page}`);
}

export async function getDramas(page = 1): Promise<PaginatedResponse<Content>> {
  return fetchAPI(`/contents/dramas?page=${page}`);
}

export async function getTrending(): Promise<Content[]> {
  return fetchAPI('/contents/trending');
}

export async function getNewReleases(): Promise<Content[]> {
  return fetchAPI('/contents/new-releases');
}

// 최근 인기 콘텐츠 (홈페이지용)
export async function getRecentPopular(contentType: 'movie' | 'drama', limit = 6): Promise<Content[]> {
  const data = await getContents({
    content_type: contentType,
    ordering: '-popularity',
    recent: true,
  });
  return data.results.slice(0, limit);
}

export async function searchContents(query: string, page = 1): Promise<PaginatedResponse<Content>> {
  return fetchAPI(`/contents/search?q=${encodeURIComponent(query)}&page=${page}`);
}

// 장르 API
export async function getGenres(contentType?: 'movie' | 'drama'): Promise<Genre[]> {
  const query = contentType ? `?content_type=${contentType}` : '';
  return fetchAPI(`/genres${query}`);
}

// 플랫폼 API
export async function getPlatforms(): Promise<Platform[]> {
  return fetchAPI('/platforms');
}

// YouTube 리뷰 API
export async function getContentReviews(contentId: number): Promise<YouTubeReview[]> {
  return fetchAPI(`/contents/${contentId}/reviews`);
}
