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
  platforms?: Platform[];
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
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}
