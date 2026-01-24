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
        // Daily at 3 AM: Sync genres and collect popular content
        await syncGenres(env.DB, env.TMDB_API_KEY);
        await collectPopularMovies(env.DB, env.TMDB_API_KEY, 5);
        await collectPopularDramas(env.DB, env.TMDB_API_KEY, 5);
        break;

      case '0 4 * * *':
        // Daily at 4 AM: Collect trending content
        await collectPopularMovies(env.DB, env.TMDB_API_KEY, 2);
        await collectPopularDramas(env.DB, env.TMDB_API_KEY, 2);
        break;

      case '0 */6 * * *':
        // Every 6 hours: Quick update
        await collectPopularMovies(env.DB, env.TMDB_API_KEY, 1);
        await collectPopularDramas(env.DB, env.TMDB_API_KEY, 1);
        break;

      default:
        console.log(`Unknown cron trigger: ${trigger}`);
    }
  } catch (error) {
    console.error('Scheduled task error:', error);
    throw error;
  }
}
