// Country and Language types for i18n support
export type CountryCode = 'KR' | 'US' | 'JP';
export type LanguageCode = 'ko' | 'en' | 'ja';

export const SUPPORTED_COUNTRIES: CountryCode[] = ['KR', 'US', 'JP'];
export const SUPPORTED_LANGUAGES: LanguageCode[] = ['ko', 'en', 'ja'];

export const COUNTRY_LANGUAGE_MAP: Record<CountryCode, LanguageCode> = {
  KR: 'ko',
  US: 'en',
  JP: 'ja',
};

export const LANGUAGE_COUNTRY_MAP: Record<LanguageCode, CountryCode> = {
  ko: 'KR',
  en: 'US',
  ja: 'JP',
};

export const TMDB_LANGUAGE_MAP: Record<CountryCode, string> = {
  KR: 'ko-KR',
  US: 'en-US',
  JP: 'ja-JP',
};

export interface Genre {
  id: number;
  name: string;
  tmdb_id: number | null;
}

export interface Platform {
  id: number;
  name: string;
  code: string;
  logo_url: string | null;
  website_url: string | null;
  is_active: boolean;
}

export interface CountryPlatform {
  id: number;
  platform_id: number;
  country_code: CountryCode;
  tmdb_provider_id: number;
  name_local: string;
  search_url_template: string | null;
  is_active: boolean;
  // Joined fields
  code?: string;
  logo_url?: string | null;
}

export interface ContentTranslation {
  id: number;
  content_id: number;
  language_code: LanguageCode;
  title: string;
  overview: string | null;
  poster_path: string | null;
}

export interface Content {
  id: number;
  tmdb_id: number | null;
  title: string;
  title_en: string | null;
  content_type: 'movie' | 'drama';
  poster_url: string | null;
  backdrop_url: string | null;
  overview: string | null;
  release_date: string | null;
  rating: number;
  popularity: number;
  runtime: number | null;
  director: string | null;
  vote_count: number;
  is_adult: boolean;
  genres?: Genre[];
  cast?: string[];
  platforms?: Platform[] | CountryPlatform[];
  review_count?: number;
}

export interface YouTubeReview {
  id: number;
  content_id: number;
  video_id: string;
  title: string;
  channel_name: string | null;
  thumbnail_url: string | null;
  view_count: number;
  is_featured: boolean;
  published_at: string | null;
  youtube_url: string | null;
  country_code?: CountryCode;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// API Query parameters
export interface ContentQueryParams {
  page?: number;
  content_type?: 'movie' | 'drama';
  genre?: number;
  ordering?: string;
  recent?: boolean;
  period?: string;
  available_kr?: string;
  country?: CountryCode;
  language?: LanguageCode;
}
