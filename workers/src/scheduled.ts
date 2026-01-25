import type { Env } from './index';

interface TMDbMovie {
  id: number;
  title: string;
  original_title: string;
  poster_path: string | null;
  backdrop_path: string | null;
  overview: string;
  release_date: string;
  vote_average: number;
  vote_count: number;
  popularity: number;
  adult: boolean;
  genre_ids: number[];
}

interface TMDbTV {
  id: number;
  name: string;
  original_name: string;
  poster_path: string | null;
  backdrop_path: string | null;
  overview: string;
  first_air_date: string;
  vote_average: number;
  vote_count: number;
  popularity: number;
  genre_ids: number[];
}

const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';

// 한국에서 사용 가능한 주요 OTT 플랫폼 (TMDb provider_id)
const KOREAN_PROVIDERS: Record<number, { name: string; code: string; logo: string }> = {
  8: { name: 'Netflix', code: 'netflix', logo: '/t2yyOv40HZeVlLjYsCsPHnWLk4W.jpg' },
  97: { name: 'Watcha', code: 'watcha', logo: '/2ioan5BX5L9tz4fIGU93blTeFhv.jpg' },
  356: { name: 'Wavve', code: 'wavve', logo: '/6UKUfqUCOEbCpaChyPtBqR8HR13.jpg' },
  337: { name: 'Disney+', code: 'disney_plus', logo: '/7rwgEs15tFwyR9NPQ5vpzxTj19Q.jpg' },
  350: { name: 'Apple TV+', code: 'apple_tv_plus', logo: '/6uhKBfmtzFqOcLousHwZuzcrScK.jpg' },
  1883: { name: 'TVING', code: 'tving', logo: '/cNi4Nv5EPsnvf5WmgwhfWDsdMUd.jpg' },
  2062: { name: 'Coupang Play', code: 'coupang_play', logo: '/7tN0sXfPK5cYIQWOLhLk4rXnsgz.jpg' },
};

async function syncGenres(db: D1Database, apiKey: string) {
  console.log('Syncing genres...');

  // Movie genres
  const movieRes = await fetch(
    `https://api.themoviedb.org/3/genre/movie/list?api_key=${apiKey}&language=ko-KR`
  );
  const movieGenres = await movieRes.json() as { genres: { id: number; name: string }[] };

  // TV genres
  const tvRes = await fetch(
    `https://api.themoviedb.org/3/genre/tv/list?api_key=${apiKey}&language=ko-KR`
  );
  const tvGenres = await tvRes.json() as { genres: { id: number; name: string }[] };

  // Merge and dedupe
  const allGenres = new Map<number, string>();
  for (const g of [...movieGenres.genres, ...tvGenres.genres]) {
    allGenres.set(g.id, g.name);
  }

  // Insert/update genres
  for (const [tmdbId, name] of allGenres) {
    await db.prepare(
      `INSERT INTO genres (name, tmdb_id) VALUES (?, ?)
       ON CONFLICT(tmdb_id) DO UPDATE SET name = excluded.name`
    ).bind(name, tmdbId).run();
  }

  console.log(`Synced ${allGenres.size} genres`);
}

async function collectPopularMovies(db: D1Database, apiKey: string, pages = 3) {
  console.log('Collecting popular movies...');
  let collected = 0;

  for (let page = 1; page <= pages; page++) {
    const res = await fetch(
      `https://api.themoviedb.org/3/movie/popular?api_key=${apiKey}&language=ko-KR&page=${page}&region=KR`
    );
    const data = await res.json() as { results: TMDbMovie[] };

    for (const movie of data.results) {
      // Insert content
      await db.prepare(
        `INSERT INTO contents (
          tmdb_id, title, title_en, content_type, poster_url, backdrop_url,
          overview, release_date, rating, popularity, vote_count, is_adult, updated_at
        ) VALUES (?, ?, ?, 'movie', ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        ON CONFLICT(tmdb_id) DO UPDATE SET
          title = excluded.title, rating = excluded.rating,
          popularity = excluded.popularity, vote_count = excluded.vote_count,
          updated_at = datetime('now')`
      ).bind(
        movie.id,
        movie.title,
        movie.original_title,
        movie.poster_path ? `${TMDB_IMAGE_BASE}/w500${movie.poster_path}` : null,
        movie.backdrop_path ? `${TMDB_IMAGE_BASE}/original${movie.backdrop_path}` : null,
        movie.overview,
        movie.release_date,
        movie.vote_average,
        movie.popularity,
        movie.vote_count,
        movie.adult ? 1 : 0
      ).run();

      // Get content ID
      const content = await db.prepare(
        'SELECT id FROM contents WHERE tmdb_id = ?'
      ).bind(movie.id).first<{ id: number }>();

      if (content) {
        // Link genres
        for (const genreId of movie.genre_ids) {
          const genre = await db.prepare(
            'SELECT id FROM genres WHERE tmdb_id = ?'
          ).bind(genreId).first<{ id: number }>();

          if (genre) {
            await db.prepare(
              `INSERT INTO content_genres (content_id, genre_id) VALUES (?, ?)
               ON CONFLICT DO NOTHING`
            ).bind(content.id, genre.id).run();
          }
        }
      }

      collected++;
    }
  }

  console.log(`Collected ${collected} movies`);
  return collected;
}

async function collectPopularDramas(db: D1Database, apiKey: string, pages = 3) {
  console.log('Collecting popular dramas...');
  let collected = 0;

  for (let page = 1; page <= pages; page++) {
    const res = await fetch(
      `https://api.themoviedb.org/3/tv/popular?api_key=${apiKey}&language=ko-KR&page=${page}&with_origin_country=KR`
    );
    const data = await res.json() as { results: TMDbTV[] };

    for (const tv of data.results) {
      // Insert content
      await db.prepare(
        `INSERT INTO contents (
          tmdb_id, title, title_en, content_type, poster_url, backdrop_url,
          overview, release_date, rating, popularity, vote_count, updated_at
        ) VALUES (?, ?, ?, 'drama', ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        ON CONFLICT(tmdb_id) DO UPDATE SET
          title = excluded.title, rating = excluded.rating,
          popularity = excluded.popularity, vote_count = excluded.vote_count,
          updated_at = datetime('now')`
      ).bind(
        tv.id,
        tv.name,
        tv.original_name,
        tv.poster_path ? `${TMDB_IMAGE_BASE}/w500${tv.poster_path}` : null,
        tv.backdrop_path ? `${TMDB_IMAGE_BASE}/original${tv.backdrop_path}` : null,
        tv.overview,
        tv.first_air_date,
        tv.vote_average,
        tv.popularity,
        tv.vote_count
      ).run();

      // Get content ID
      const content = await db.prepare(
        'SELECT id FROM contents WHERE tmdb_id = ?'
      ).bind(tv.id).first<{ id: number }>();

      if (content) {
        // Link genres
        for (const genreId of tv.genre_ids) {
          const genre = await db.prepare(
            'SELECT id FROM genres WHERE tmdb_id = ?'
          ).bind(genreId).first<{ id: number }>();

          if (genre) {
            await db.prepare(
              `INSERT INTO content_genres (content_id, genre_id) VALUES (?, ?)
               ON CONFLICT DO NOTHING`
            ).bind(content.id, genre.id).run();
          }
        }
      }

      collected++;
    }
  }

  console.log(`Collected ${collected} dramas`);
  return collected;
}

// 최근 업데이트된 콘텐츠의 Watch Provider 수집
async function collectWatchProvidersForRecent(db: D1Database, apiKey: string, hoursAgo = 24): Promise<number> {
  console.log('Collecting watch providers for recent content...');

  // 최근 업데이트된 콘텐츠 중 플랫폼 정보가 없는 것들
  const contents = await db.prepare(`
    SELECT c.id, c.tmdb_id, c.content_type
    FROM contents c
    LEFT JOIN content_platforms cp ON c.id = cp.content_id
    WHERE c.updated_at >= datetime('now', '-${hoursAgo} hours')
    AND cp.content_id IS NULL
    ORDER BY c.updated_at DESC
    LIMIT 100
  `).all<{ id: number; tmdb_id: number; content_type: string }>();

  let collected = 0;

  for (const content of contents.results || []) {
    const mediaType = content.content_type === 'movie' ? 'movie' : 'tv';

    try {
      const res = await fetch(
        `https://api.themoviedb.org/3/${mediaType}/${content.tmdb_id}/watch/providers?api_key=${apiKey}`
      );
      const data = await res.json() as {
        results?: {
          KR?: {
            flatrate?: Array<{ provider_id: number; provider_name: string; logo_path: string }>;
          }
        }
      };

      const krProviders = data.results?.KR?.flatrate || [];

      for (const provider of krProviders) {
        if (KOREAN_PROVIDERS[provider.provider_id]) {
          const platform = await db.prepare(
            'SELECT id FROM platforms WHERE tmdb_provider_id = ?'
          ).bind(provider.provider_id).first<{ id: number }>();

          if (platform) {
            await db.prepare(`
              INSERT INTO content_platforms (content_id, platform_id)
              VALUES (?, ?)
              ON CONFLICT DO NOTHING
            `).bind(content.id, platform.id).run();
            collected++;
          }
        }
      }
    } catch (e) {
      console.error(`Failed to get providers for ${content.tmdb_id}:`, e);
    }
  }

  console.log(`Collected ${collected} watch provider links`);
  return collected;
}

// YouTube 리뷰 수집 (리뷰가 없는 콘텐츠 대상)
async function collectYouTubeReviews(db: D1Database, apiKey: string, limit = 20): Promise<number> {
  console.log('Collecting YouTube reviews...');

  if (!apiKey || apiKey === 'your-youtube-api-key-here') {
    console.log('YouTube API key not configured, skipping...');
    return 0;
  }

  // 리뷰가 없는 인기 콘텐츠 가져오기
  const contents = await db.prepare(`
    SELECT c.id, c.title, c.content_type
    FROM contents c
    LEFT JOIN youtube_reviews yr ON c.id = yr.content_id
    WHERE yr.id IS NULL
    ORDER BY c.popularity DESC
    LIMIT ?
  `).bind(limit).all<{ id: number; title: string; content_type: string }>();

  let collected = 0;

  for (const content of contents.results || []) {
    const searchQuery = `${content.title} ${content.content_type === 'movie' ? '영화' : '드라마'} 리뷰`;

    try {
      const res = await fetch(
        `https://www.googleapis.com/youtube/v3/search?` +
        `part=snippet&q=${encodeURIComponent(searchQuery)}&type=video&maxResults=3&` +
        `relevanceLanguage=ko&regionCode=KR&key=${apiKey}`
      );
      const data = await res.json() as {
        error?: { message: string };
        items?: Array<{
          id: { videoId: string };
          snippet: {
            title: string;
            channelTitle: string;
            thumbnails: { high?: { url: string } };
            publishedAt: string;
          };
        }>;
      };

      if (data.error) {
        console.error(`YouTube API error for ${content.title}: ${data.error.message}`);
        continue;
      }

      for (const item of data.items || []) {
        await db.prepare(`
          INSERT INTO youtube_reviews (
            content_id, video_id, title, channel_name, thumbnail_url, youtube_url, published_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(video_id) DO NOTHING
        `).bind(
          content.id,
          item.id.videoId,
          item.snippet.title,
          item.snippet.channelTitle,
          item.snippet.thumbnails.high?.url || '',
          `https://www.youtube.com/watch?v=${item.id.videoId}`,
          item.snippet.publishedAt
        ).run();
        collected++;
      }
    } catch (e) {
      console.error(`Failed to get YouTube reviews for ${content.title}:`, e);
    }
  }

  console.log(`Collected ${collected} YouTube reviews`);
  return collected;
}

export async function scheduledHandler(
  event: ScheduledEvent,
  env: Env,
  ctx: ExecutionContext
) {
  const trigger = event.cron;
  console.log(`Cron trigger: ${trigger}`);

  try {
    switch (trigger) {
      case '0 3 * * *':
        // Daily at 3 AM: Sync genres, collect content, watch providers, and YouTube reviews
        await syncGenres(env.DB, env.TMDB_API_KEY);
        await collectPopularMovies(env.DB, env.TMDB_API_KEY, 5);
        await collectPopularDramas(env.DB, env.TMDB_API_KEY, 5);
        await collectWatchProvidersForRecent(env.DB, env.TMDB_API_KEY, 48);
        await collectYouTubeReviews(env.DB, env.YOUTUBE_API_KEY, 30);
        break;

      case '0 4 * * *':
        // Daily at 4 AM: Collect trending content, watch providers, and YouTube reviews
        await collectPopularMovies(env.DB, env.TMDB_API_KEY, 2);
        await collectPopularDramas(env.DB, env.TMDB_API_KEY, 2);
        await collectWatchProvidersForRecent(env.DB, env.TMDB_API_KEY, 24);
        await collectYouTubeReviews(env.DB, env.YOUTUBE_API_KEY, 10);
        break;

      case '0 */6 * * *':
        // Every 6 hours: Quick update + watch providers for new content
        await collectPopularMovies(env.DB, env.TMDB_API_KEY, 1);
        await collectPopularDramas(env.DB, env.TMDB_API_KEY, 1);
        await collectWatchProvidersForRecent(env.DB, env.TMDB_API_KEY, 6);
        break;

      default:
        console.log(`Unknown cron trigger: ${trigger}`);
    }
  } catch (error) {
    console.error('Scheduled task error:', error);
    throw error;
  }
}
