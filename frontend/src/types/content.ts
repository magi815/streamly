export interface Genre {
  id: number;
  name: string;
  tmdb_id: number;
}

export interface Platform {
  id: number;
  name: string;
  code: string;
  logo_url: string | null;
  website_url?: string;
  is_active?: boolean;
}

export interface Content {
  id: number;
  title: string;
  title_en: string;
  content_type: 'movie' | 'drama';
  content_type_display?: string;
  poster_url: string;
  backdrop_url?: string;
  overview?: string;
  release_date?: string;
  rating: number;
  popularity: number;
  runtime?: number;
  director?: string;
  cast?: string[];
  genres: Genre[];
  platforms?: Platform[];
}

export interface YouTubeReview {
  id: number;
  video_id: string;
  title: string;
  channel_name: string;
  thumbnail_url: string;
  view_count: number;
  is_featured: boolean;
  published_at?: string;
  youtube_url: string;
}

export interface ContentDetail extends Content {
  vote_count: number;
  is_adult: boolean;
  youtube_reviews?: YouTubeReview[];
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}
