import { Hono } from 'hono';
import type { Env } from '../index';

export const adminRoutes = new Hono<{ Bindings: Env }>();

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

// 장르 동기화
adminRoutes.post('/sync-genres', async (c) => {
  const db = c.env.DB;
  const apiKey = c.env.TMDB_API_KEY;

  if (!apiKey) {
    return c.json({ error: 'TMDB_API_KEY not configured' }, 400);
  }

  try {
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

    return c.json({ success: true, count: allGenres.size });
  } catch (error) {
    console.error('Sync genres error:', error);
    return c.json({ error: 'Failed to sync genres' }, 500);
  }
});

// 영화 수집
adminRoutes.post('/collect-movies', async (c) => {
  const db = c.env.DB;
  const apiKey = c.env.TMDB_API_KEY;
  const { pages = 3 } = await c.req.json().catch(() => ({ pages: 3 }));

  if (!apiKey) {
    return c.json({ error: 'TMDB_API_KEY not configured' }, 400);
  }

  try {
    let collected = 0;

    for (let page = 1; page <= pages; page++) {
      const res = await fetch(
        `https://api.themoviedb.org/3/movie/popular?api_key=${apiKey}&language=ko-KR&page=${page}&region=KR`
      );
      const data = await res.json() as { results: TMDbMovie[] };

      for (const movie of data.results) {
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

        // Link genres
        const content = await db.prepare(
          'SELECT id FROM contents WHERE tmdb_id = ?'
        ).bind(movie.id).first<{ id: number }>();

        if (content) {
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

    return c.json({ success: true, collected });
  } catch (error) {
    console.error('Collect movies error:', error);
    return c.json({ error: 'Failed to collect movies' }, 500);
  }
});

// 드라마 수집
adminRoutes.post('/collect-dramas', async (c) => {
  const db = c.env.DB;
  const apiKey = c.env.TMDB_API_KEY;
  const { pages = 3 } = await c.req.json().catch(() => ({ pages: 3 }));

  if (!apiKey) {
    return c.json({ error: 'TMDB_API_KEY not configured' }, 400);
  }

  try {
    let collected = 0;

    for (let page = 1; page <= pages; page++) {
      const res = await fetch(
        `https://api.themoviedb.org/3/tv/popular?api_key=${apiKey}&language=ko-KR&page=${page}&with_origin_country=KR`
      );
      const data = await res.json() as { results: TMDbTV[] };

      for (const tv of data.results) {
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

        // Link genres
        const content = await db.prepare(
          'SELECT id FROM contents WHERE tmdb_id = ?'
        ).bind(tv.id).first<{ id: number }>();

        if (content) {
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

    return c.json({ success: true, collected });
  } catch (error) {
    console.error('Collect dramas error:', error);
    return c.json({ error: 'Failed to collect dramas' }, 500);
  }
});

// 전체 수집 (장르 + 영화 + 드라마)
adminRoutes.post('/collect-all', async (c) => {
  const db = c.env.DB;
  const apiKey = c.env.TMDB_API_KEY;
  const { moviePages = 3, dramaPages = 3 } = await c.req.json().catch(() => ({ moviePages: 3, dramaPages: 3 }));

  if (!apiKey) {
    return c.json({ error: 'TMDB_API_KEY not configured' }, 400);
  }

  const results = {
    genres: 0,
    movies: 0,
    dramas: 0,
  };

  try {
    // 1. Sync genres
    const movieGenresRes = await fetch(
      `https://api.themoviedb.org/3/genre/movie/list?api_key=${apiKey}&language=ko-KR`
    );
    const movieGenres = await movieGenresRes.json() as { genres: { id: number; name: string }[] };

    const tvGenresRes = await fetch(
      `https://api.themoviedb.org/3/genre/tv/list?api_key=${apiKey}&language=ko-KR`
    );
    const tvGenres = await tvGenresRes.json() as { genres: { id: number; name: string }[] };

    const allGenres = new Map<number, string>();
    for (const g of [...movieGenres.genres, ...tvGenres.genres]) {
      allGenres.set(g.id, g.name);
    }

    for (const [tmdbId, name] of allGenres) {
      await db.prepare(
        `INSERT INTO genres (name, tmdb_id) VALUES (?, ?)
         ON CONFLICT(tmdb_id) DO UPDATE SET name = excluded.name`
      ).bind(name, tmdbId).run();
    }
    results.genres = allGenres.size;

    // 2. Collect movies
    for (let page = 1; page <= moviePages; page++) {
      const res = await fetch(
        `https://api.themoviedb.org/3/movie/popular?api_key=${apiKey}&language=ko-KR&page=${page}&region=KR`
      );
      const data = await res.json() as { results: TMDbMovie[] };

      for (const movie of data.results) {
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

        const content = await db.prepare(
          'SELECT id FROM contents WHERE tmdb_id = ?'
        ).bind(movie.id).first<{ id: number }>();

        if (content) {
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

        results.movies++;
      }
    }

    // 3. Collect dramas
    for (let page = 1; page <= dramaPages; page++) {
      const res = await fetch(
        `https://api.themoviedb.org/3/tv/popular?api_key=${apiKey}&language=ko-KR&page=${page}&with_origin_country=KR`
      );
      const data = await res.json() as { results: TMDbTV[] };

      for (const tv of data.results) {
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

        const content = await db.prepare(
          'SELECT id FROM contents WHERE tmdb_id = ?'
        ).bind(tv.id).first<{ id: number }>();

        if (content) {
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

        results.dramas++;
      }
    }

    return c.json({ success: true, ...results });
  } catch (error) {
    console.error('Collect all error:', error);
    return c.json({ error: 'Failed to collect data', partial: results }, 500);
  }
});

// 최신 콘텐츠 수집 (now_playing + on_the_air)
adminRoutes.post('/collect-latest', async (c) => {
  const db = c.env.DB;
  const apiKey = c.env.TMDB_API_KEY;
  const { moviePages = 5, dramaPages = 5 } = await c.req.json().catch(() => ({ moviePages: 5, dramaPages: 5 }));

  if (!apiKey) {
    return c.json({ error: 'TMDB_API_KEY not configured' }, 400);
  }

  const results = {
    movies: 0,
    dramas: 0,
  };

  try {
    // 1. 현재 상영 영화 (now_playing)
    for (let page = 1; page <= moviePages; page++) {
      const res = await fetch(
        `https://api.themoviedb.org/3/movie/now_playing?api_key=${apiKey}&language=ko-KR&page=${page}&region=KR`
      );
      const data = await res.json() as { results: TMDbMovie[] };

      for (const movie of data.results) {
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

        const content = await db.prepare(
          'SELECT id FROM contents WHERE tmdb_id = ?'
        ).bind(movie.id).first<{ id: number }>();

        if (content) {
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

        results.movies++;
      }
    }

    // 2. 현재 방영 드라마 (on_the_air)
    for (let page = 1; page <= dramaPages; page++) {
      const res = await fetch(
        `https://api.themoviedb.org/3/tv/on_the_air?api_key=${apiKey}&language=ko-KR&page=${page}`
      );
      const data = await res.json() as { results: TMDbTV[] };

      for (const tv of data.results) {
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

        const content = await db.prepare(
          'SELECT id FROM contents WHERE tmdb_id = ?'
        ).bind(tv.id).first<{ id: number }>();

        if (content) {
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

        results.dramas++;
      }
    }

    return c.json({ success: true, ...results });
  } catch (error) {
    console.error('Collect latest error:', error);
    return c.json({ error: 'Failed to collect latest data', partial: results }, 500);
  }
});

// 한국 OTT Provider IDs
const KOREAN_OTT_PROVIDERS = '8|97|337|350|356|1883'; // Netflix, Watcha, Disney+, Apple TV+, Wavve, TVING

// 한국 OTT에서 시청 가능한 콘텐츠만 수집 (discover API 사용)
adminRoutes.post('/collect-korea', async (c) => {
  const db = c.env.DB;
  const apiKey = c.env.TMDB_API_KEY;
  const { moviePages = 10, dramaPages = 10 } = await c.req.json().catch(() => ({ moviePages: 10, dramaPages: 10 }));

  if (!apiKey) {
    return c.json({ error: 'TMDB_API_KEY not configured' }, 400);
  }

  const results = { movies: 0, dramas: 0 };

  try {
    // 1. 영화 수집 (한국 OTT에서 시청 가능한 것만)
    for (let page = 1; page <= moviePages; page++) {
      const res = await fetch(
        `https://api.themoviedb.org/3/discover/movie?api_key=${apiKey}&language=ko-KR&page=${page}` +
        `&watch_region=KR&with_watch_providers=${KOREAN_OTT_PROVIDERS}&with_watch_monetization_types=flatrate` +
        `&sort_by=popularity.desc`
      );
      const data = await res.json() as { results: TMDbMovie[] };

      for (const movie of data.results) {
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

        // Link genres
        const content = await db.prepare(
          'SELECT id FROM contents WHERE tmdb_id = ?'
        ).bind(movie.id).first<{ id: number }>();

        if (content) {
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

        results.movies++;
      }
    }

    // 2. 드라마 수집 (한국 OTT에서 시청 가능한 것만)
    for (let page = 1; page <= dramaPages; page++) {
      const res = await fetch(
        `https://api.themoviedb.org/3/discover/tv?api_key=${apiKey}&language=ko-KR&page=${page}` +
        `&watch_region=KR&with_watch_providers=${KOREAN_OTT_PROVIDERS}&with_watch_monetization_types=flatrate` +
        `&sort_by=popularity.desc`
      );
      const data = await res.json() as { results: TMDbTV[] };

      for (const tv of data.results) {
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

        // Link genres
        const content = await db.prepare(
          'SELECT id FROM contents WHERE tmdb_id = ?'
        ).bind(tv.id).first<{ id: number }>();

        if (content) {
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

        results.dramas++;
      }
    }

    return c.json({ success: true, ...results });
  } catch (error) {
    console.error('Collect Korea error:', error);
    return c.json({ error: 'Failed to collect Korea data', partial: results }, 500);
  }
});

// 콘텐츠 데이터 전체 삭제
adminRoutes.delete('/clear-contents', async (c) => {
  const db = c.env.DB;

  try {
    // CASCADE로 인해 관련 테이블도 자동 삭제됨
    await db.prepare('DELETE FROM content_genres').run();
    await db.prepare('DELETE FROM content_platforms').run();
    await db.prepare('DELETE FROM content_cast').run();
    await db.prepare('DELETE FROM youtube_reviews').run();
    await db.prepare('DELETE FROM contents').run();

    return c.json({ success: true, message: 'All content data cleared' });
  } catch (error) {
    console.error('Clear contents error:', error);
    return c.json({ error: 'Failed to clear contents' }, 500);
  }
});

// 통계 조회
adminRoutes.get('/stats', async (c) => {
  const db = c.env.DB;

  const [contents, movies, dramas, genres, platforms, reviews] = await Promise.all([
    db.prepare('SELECT COUNT(*) as count FROM contents').first<{ count: number }>(),
    db.prepare("SELECT COUNT(*) as count FROM contents WHERE content_type = 'movie'").first<{ count: number }>(),
    db.prepare("SELECT COUNT(*) as count FROM contents WHERE content_type = 'drama'").first<{ count: number }>(),
    db.prepare('SELECT COUNT(*) as count FROM genres').first<{ count: number }>(),
    db.prepare('SELECT COUNT(*) as count FROM platforms').first<{ count: number }>(),
    db.prepare('SELECT COUNT(*) as count FROM youtube_reviews').first<{ count: number }>(),
  ]);

  return c.json({
    contents: contents?.count || 0,
    movies: movies?.count || 0,
    dramas: dramas?.count || 0,
    genres: genres?.count || 0,
    platforms: platforms?.count || 0,
    youtube_reviews: reviews?.count || 0,
  });
});

// 국가별 지원 플랫폼 목록 (TMDB provider_id)
const COUNTRY_PROVIDERS: Record<string, number[]> = {
  KR: [8, 97, 356, 337, 350, 1883, 2062], // Netflix, Watcha, Wavve, Disney+, Apple TV+, TVING, Coupang Play
  US: [8, 9, 337, 15, 384, 350, 531],     // Netflix, Amazon Prime, Disney+, Hulu, Max, Apple TV+, Paramount+
  JP: [8, 9, 84, 85, 15, 337],            // Netflix, Amazon Prime, U-NEXT, dTV, Hulu, Disney+
};

// OTT 시청 정보 수집 (TMDb Watch Providers) - 다국가 지원
adminRoutes.post('/collect-watch-providers', async (c) => {
  const db = c.env.DB;
  const apiKey = c.env.TMDB_API_KEY;
  const { offset = 0, limit = 50, country = 'all' } = await c.req.json().catch(() => ({ offset: 0, limit: 50, country: 'all' }));

  if (!apiKey) {
    return c.json({ error: 'TMDB_API_KEY not configured' }, 400);
  }

  // 수집할 국가 목록
  const countriesToCollect = country === 'all' ? ['KR', 'US', 'JP'] : [country];

  try {
    // 페이지네이션으로 콘텐츠 가져오기
    const totalResult = await db.prepare('SELECT COUNT(*) as count FROM contents').first<{ count: number }>();
    const total = totalResult?.count || 0;

    const contents = await db.prepare(
      `SELECT id, tmdb_id, content_type FROM contents ORDER BY id LIMIT ? OFFSET ?`
    ).bind(limit, offset).all<{ id: number; tmdb_id: number; content_type: string }>();

    const results: Record<string, number> = { KR: 0, US: 0, JP: 0 };
    let processed = 0;

    for (const content of contents.results || []) {
      const mediaType = content.content_type === 'movie' ? 'movie' : 'tv';

      try {
        const res = await fetch(
          `https://api.themoviedb.org/3/${mediaType}/${content.tmdb_id}/watch/providers?api_key=${apiKey}`
        );
        const data = await res.json() as {
          results?: Record<string, {
            flatrate?: Array<{ provider_id: number; provider_name: string; logo_path: string }>;
          }>
        };

        // 각 국가별로 처리
        for (const countryCode of countriesToCollect) {
          const countryData = data.results?.[countryCode];
          const providers = countryData?.flatrate || [];
          const supportedProviders = COUNTRY_PROVIDERS[countryCode] || [];

          for (const provider of providers) {
            // 해당 국가에서 지원하는 플랫폼인지 확인
            if (!supportedProviders.includes(provider.provider_id)) continue;

            // country_platforms에서 해당 국가/플랫폼 찾기
            const countryPlatform = await db.prepare(
              'SELECT platform_id FROM country_platforms WHERE country_code = ? AND tmdb_provider_id = ?'
            ).bind(countryCode, provider.provider_id).first<{ platform_id: number }>();

            if (countryPlatform) {
              await db.prepare(`
                INSERT INTO content_platforms (content_id, platform_id, country_code)
                VALUES (?, ?, ?)
                ON CONFLICT(content_id, platform_id, country_code) DO NOTHING
              `).bind(content.id, countryPlatform.platform_id, countryCode).run();
              results[countryCode]++;
            }
          }
        }
        processed++;
      } catch (e) {
        console.error(`Failed to get providers for ${content.tmdb_id}:`, e);
      }
    }

    const nextOffset = offset + limit < total ? offset + limit : null;

    return c.json({ success: true, processed, collected: results, total, nextOffset });
  } catch (error) {
    console.error('Collect watch providers error:', error);
    return c.json({ error: 'Failed to collect watch providers' }, 500);
  }
});

// 한국 제작 콘텐츠 수집 (with_origin_country=KR)
adminRoutes.post('/collect-korean-origin', async (c) => {
  const db = c.env.DB;
  const apiKey = c.env.TMDB_API_KEY;
  const { moviePages = 15, dramaPages = 15 } = await c.req.json().catch(() => ({ moviePages: 15, dramaPages: 15 }));

  if (!apiKey) {
    return c.json({ error: 'TMDB_API_KEY not configured' }, 400);
  }

  const results = { movies: 0, dramas: 0, skipped: 0 };

  try {
    // 1. 한국 영화 수집
    for (let page = 1; page <= moviePages; page++) {
      const res = await fetch(
        `https://api.themoviedb.org/3/discover/movie?api_key=${apiKey}&language=ko-KR&page=${page}` +
        `&with_origin_country=KR&sort_by=popularity.desc`
      );
      const data = await res.json() as { results: TMDbMovie[] };

      for (const movie of data.results) {
        // 이미 존재하는지 확인
        const existing = await db.prepare(
          'SELECT id FROM contents WHERE tmdb_id = ?'
        ).bind(movie.id).first<{ id: number }>();

        if (existing) {
          // 이미 있으면 업데이트만
          await db.prepare(`
            UPDATE contents SET
              title = ?, rating = ?, popularity = ?, vote_count = ?, updated_at = datetime('now')
            WHERE tmdb_id = ?
          `).bind(movie.title, movie.vote_average, movie.popularity, movie.vote_count, movie.id).run();
          results.skipped++;
        } else {
          // 새로 삽입
          await db.prepare(`
            INSERT INTO contents (
              tmdb_id, title, title_en, content_type, poster_url, backdrop_url,
              overview, release_date, rating, popularity, vote_count, is_adult, updated_at
            ) VALUES (?, ?, ?, 'movie', ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
          `).bind(
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

          // 장르 연결
          const content = await db.prepare(
            'SELECT id FROM contents WHERE tmdb_id = ?'
          ).bind(movie.id).first<{ id: number }>();

          if (content) {
            for (const genreId of movie.genre_ids) {
              const genre = await db.prepare(
                'SELECT id FROM genres WHERE tmdb_id = ?'
              ).bind(genreId).first<{ id: number }>();

              if (genre) {
                await db.prepare(`
                  INSERT INTO content_genres (content_id, genre_id) VALUES (?, ?)
                  ON CONFLICT DO NOTHING
                `).bind(content.id, genre.id).run();
              }
            }
          }

          results.movies++;
        }
      }
    }

    // 2. 한국 드라마 수집
    for (let page = 1; page <= dramaPages; page++) {
      const res = await fetch(
        `https://api.themoviedb.org/3/discover/tv?api_key=${apiKey}&language=ko-KR&page=${page}` +
        `&with_origin_country=KR&sort_by=popularity.desc`
      );
      const data = await res.json() as { results: TMDbTV[] };

      for (const tv of data.results) {
        // 이미 존재하는지 확인
        const existing = await db.prepare(
          'SELECT id FROM contents WHERE tmdb_id = ?'
        ).bind(tv.id).first<{ id: number }>();

        if (existing) {
          // 이미 있으면 업데이트만
          await db.prepare(`
            UPDATE contents SET
              title = ?, rating = ?, popularity = ?, vote_count = ?, updated_at = datetime('now')
            WHERE tmdb_id = ?
          `).bind(tv.name, tv.vote_average, tv.popularity, tv.vote_count, tv.id).run();
          results.skipped++;
        } else {
          // 새로 삽입
          await db.prepare(`
            INSERT INTO contents (
              tmdb_id, title, title_en, content_type, poster_url, backdrop_url,
              overview, release_date, rating, popularity, vote_count, updated_at
            ) VALUES (?, ?, ?, 'drama', ?, ?, ?, ?, ?, ?, ?, datetime('now'))
          `).bind(
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

          // 장르 연결
          const content = await db.prepare(
            'SELECT id FROM contents WHERE tmdb_id = ?'
          ).bind(tv.id).first<{ id: number }>();

          if (content) {
            for (const genreId of tv.genre_ids) {
              const genre = await db.prepare(
                'SELECT id FROM genres WHERE tmdb_id = ?'
              ).bind(genreId).first<{ id: number }>();

              if (genre) {
                await db.prepare(`
                  INSERT INTO content_genres (content_id, genre_id) VALUES (?, ?)
                  ON CONFLICT DO NOTHING
                `).bind(content.id, genre.id).run();
              }
            }
          }

          results.dramas++;
        }
      }
    }

    return c.json({ success: true, ...results });
  } catch (error) {
    console.error('Collect Korean origin error:', error);
    return c.json({ error: 'Failed to collect Korean origin data', partial: results }, 500);
  }
});

// YouTube 리뷰 수집
adminRoutes.post('/collect-youtube-reviews', async (c) => {
  const db = c.env.DB;
  const apiKey = c.env.YOUTUBE_API_KEY;

  if (!apiKey || apiKey === 'your-youtube-api-key-here') {
    return c.json({ error: 'YOUTUBE_API_KEY not configured' }, 400);
  }

  const { limit = 20, debug = false, content_type = null, recent_only = true, korean_ott_only = false } = await c.req.json().catch(() => ({ limit: 20, debug: false, content_type: null, recent_only: true, korean_ott_only: false }));

  try {
    // 1년 전 날짜 계산
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    const oneYearAgoStr = oneYearAgo.toISOString().split('T')[0];

    // 리뷰가 없는 콘텐츠 가져오기 (content_type, recent_only, korean_ott_only 필터 지원)
    let query = `
      SELECT DISTINCT c.id, c.title, c.content_type
      FROM contents c
      LEFT JOIN youtube_reviews yr ON c.id = yr.content_id
    `;

    // 한국 OTT 시청 가능 콘텐츠만 필터
    if (korean_ott_only) {
      query += ` INNER JOIN content_platforms cp ON c.id = cp.content_id`;
    }

    query += ` WHERE yr.id IS NULL`;

    if (content_type === 'movie' || content_type === 'drama') {
      query += ` AND c.content_type = '${content_type}'`;
    }

    if (recent_only) {
      query += ` AND c.release_date >= '${oneYearAgoStr}'`;
    }

    query += ` ORDER BY c.popularity DESC LIMIT ?`;

    const contents = await db.prepare(query).bind(limit).all<{ id: number; title: string; content_type: string }>();

    let collected = 0;
    const errors: string[] = [];
    let debugInfo: any = null;

    for (const content of contents.results || []) {
      const searchQuery = `${content.title} ${content.content_type === 'movie' ? '영화' : '드라마'} 리뷰`;

      try {
        const res = await fetch(
          `https://www.googleapis.com/youtube/v3/search?` +
          `part=snippet&q=${encodeURIComponent(searchQuery)}&type=video&maxResults=3&` +
          `relevanceLanguage=ko&regionCode=KR&key=${apiKey}`
        );
        const data = await res.json() as {
          error?: { message: string; code: number };
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

        // 첫 번째 응답을 디버그 정보로 저장
        if (debug && !debugInfo) {
          debugInfo = { query: searchQuery, response: data };
        }

        // API 에러 체크
        if (data.error) {
          errors.push(`${content.title}: ${data.error.message}`);
          continue;
        }

        const items = data.items || [];
        if (items.length === 0) continue;

        // Video IDs로 조회수 가져오기
        const videoIds = items.map(item => item.id.videoId).join(',');
        let viewCounts: Record<string, number> = {};

        try {
          const statsRes = await fetch(
            `https://www.googleapis.com/youtube/v3/videos?` +
            `part=statistics&id=${videoIds}&key=${apiKey}`
          );
          const statsData = await statsRes.json() as {
            items?: Array<{
              id: string;
              statistics: { viewCount: string };
            }>;
          };

          for (const stat of statsData.items || []) {
            viewCounts[stat.id] = parseInt(stat.statistics.viewCount) || 0;
          }
        } catch (e) {
          // 조회수 가져오기 실패해도 리뷰는 저장
        }

        for (const item of items) {
          const viewCount = viewCounts[item.id.videoId] || 0;
          await db.prepare(`
            INSERT INTO youtube_reviews (
              content_id, video_id, title, channel_name, thumbnail_url, youtube_url, published_at, view_count
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(video_id) DO UPDATE SET view_count = excluded.view_count
          `).bind(
            content.id,
            item.id.videoId,
            item.snippet.title,
            item.snippet.channelTitle,
            item.snippet.thumbnails.high?.url || '',
            `https://www.youtube.com/watch?v=${item.id.videoId}`,
            item.snippet.publishedAt,
            viewCount
          ).run();
          collected++;
        }
      } catch (e) {
        errors.push(`${content.title}: ${e instanceof Error ? e.message : 'Unknown error'}`);
      }
    }

    return c.json({
      success: true,
      collected,
      processed: contents.results?.length || 0,
      errors: errors.length > 0 ? errors : undefined,
      debug: debug ? debugInfo : undefined
    });
  } catch (error) {
    console.error('Collect youtube reviews error:', error);
    return c.json({ error: 'Failed to collect youtube reviews' }, 500);
  }
});

// 다국어 번역 수집 (TMDB Translations API)
adminRoutes.post('/collect-translations', async (c) => {
  const db = c.env.DB;
  const apiKey = c.env.TMDB_API_KEY;
  const { limit = 50, offset = 0, language = 'all' } = await c.req.json().catch(() => ({ limit: 50, offset: 0, language: 'all' }));

  if (!apiKey) {
    return c.json({ error: 'TMDB_API_KEY not configured' }, 400);
  }

  // 지원 언어 및 TMDB 언어 코드 매핑
  const languageMap: Record<string, { tmdbCode: string; iso: string }> = {
    en: { tmdbCode: 'en-US', iso: 'en' },
    ja: { tmdbCode: 'ja-JP', iso: 'ja' },
  };

  const languagesToFetch = language === 'all'
    ? Object.keys(languageMap)
    : [language].filter(l => l in languageMap);

  if (languagesToFetch.length === 0) {
    return c.json({ error: 'Invalid language. Use: en, ja, or all' }, 400);
  }

  try {
    // 번역이 없는 콘텐츠 가져오기
    const totalResult = await db.prepare('SELECT COUNT(*) as count FROM contents').first<{ count: number }>();
    const total = totalResult?.count || 0;

    const contents = await db.prepare(
      `SELECT id, tmdb_id, content_type, title FROM contents ORDER BY id LIMIT ? OFFSET ?`
    ).bind(limit, offset).all<{ id: number; tmdb_id: number; content_type: string; title: string }>();

    const results = {
      processed: 0,
      translations: { en: 0, ja: 0 },
      errors: [] as string[],
    };

    for (const content of contents.results || []) {
      const mediaType = content.content_type === 'movie' ? 'movie' : 'tv';

      for (const lang of languagesToFetch) {
        const { tmdbCode, iso } = languageMap[lang];

        try {
          // 해당 언어로 콘텐츠 정보 직접 가져오기
          const res = await fetch(
            `https://api.themoviedb.org/3/${mediaType}/${content.tmdb_id}?api_key=${apiKey}&language=${tmdbCode}`
          );

          if (!res.ok) {
            if (res.status === 404) continue;
            throw new Error(`HTTP ${res.status}`);
          }

          const data = await res.json() as {
            title?: string;
            name?: string;
            overview?: string;
            poster_path?: string | null;
          };

          // 영화는 title, TV는 name 사용
          const title = data.title || data.name;

          // 제목이 있고, 원본 한국어 제목과 다른 경우에만 저장
          if (title && title !== content.title) {
            await db.prepare(`
              INSERT INTO content_translations (content_id, language_code, title, overview, poster_path, updated_at)
              VALUES (?, ?, ?, ?, ?, datetime('now'))
              ON CONFLICT(content_id, language_code) DO UPDATE SET
                title = excluded.title,
                overview = COALESCE(excluded.overview, content_translations.overview),
                poster_path = COALESCE(excluded.poster_path, content_translations.poster_path),
                updated_at = datetime('now')
            `).bind(
              content.id,
              iso,
              title,
              data.overview || null,
              data.poster_path ? `${TMDB_IMAGE_BASE}/w500${data.poster_path}` : null
            ).run();

            results.translations[lang as 'en' | 'ja']++;
          }
        } catch (e) {
          results.errors.push(`${content.title} (${lang}): ${e instanceof Error ? e.message : 'Unknown error'}`);
        }
      }

      results.processed++;
    }

    const nextOffset = offset + limit < total ? offset + limit : null;

    return c.json({
      success: true,
      ...results,
      total,
      nextOffset,
      errors: results.errors.length > 0 ? results.errors : undefined,
    });
  } catch (error) {
    console.error('Collect translations error:', error);
    return c.json({ error: 'Failed to collect translations' }, 500);
  }
});

// Piped API 인스턴스 목록 (fallback용)
const PIPED_INSTANCES = [
  'https://api.piped.private.coffee',
  'https://pipedapi.syncpundit.io',
  'https://api.piped.projectsegfau.lt',
  'https://pipedapi.darkness.services',
  'https://pipedapi.drgns.space',
];

// Piped API를 통한 YouTube 검색
async function searchViaPiped(query: string): Promise<{
  items: Array<{
    videoId: string;
    title: string;
    uploaderName: string;
    thumbnail: string;
    views: number;
    uploaded: number;
  }>;
  instance: string;
  errors: string[];
} | null> {
  const errors: string[] = [];

  for (const instance of PIPED_INSTANCES) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10초 타임아웃

      const res = await fetch(
        `${instance}/search?q=${encodeURIComponent(query)}&filter=videos`,
        {
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'WhatView/1.0'
          },
          signal: controller.signal
        }
      );

      clearTimeout(timeoutId);

      if (!res.ok) {
        errors.push(`${instance}: HTTP ${res.status}`);
        continue;
      }

      const text = await res.text();

      // HTML 응답 체크 (에러 페이지)
      if (text.startsWith('<') || text.startsWith('<!')) {
        errors.push(`${instance}: HTML response (blocked or error page)`);
        continue;
      }

      const data = JSON.parse(text) as {
        items?: Array<{
          url: string;
          title: string;
          uploaderName: string;
          thumbnail: string;
          views: number;
          uploaded: number;
        }>;
        error?: string;
      };

      if (data.error) {
        errors.push(`${instance}: ${data.error}`);
        continue;
      }

      if (!data.items || data.items.length === 0) {
        errors.push(`${instance}: No results`);
        continue;
      }

      // 조회수 높은 순으로 정렬 후 상위 10개
      const items = data.items
        .sort((a, b) => (b.views || 0) - (a.views || 0))
        .slice(0, 10)
        .map(item => ({
          videoId: item.url.replace('/watch?v=', ''),
          title: item.title,
          uploaderName: item.uploaderName,
          thumbnail: item.thumbnail,
          views: item.views || 0,
          uploaded: item.uploaded,
        }));

      return { items, instance, errors };
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : 'Unknown error';
      errors.push(`${instance}: ${errorMsg}`);
      continue;
    }
  }
  return { items: [], instance: '', errors };
}

// YouTube 리뷰 수집 (Piped API 사용 - 할당량 무제한)
adminRoutes.post('/collect-youtube-reviews-piped', async (c) => {
  const db = c.env.DB;
  const { limit = 20, debug = false, content_type = null, recent_only = true, korean_ott_only = false, include_existing = false, offset = 0 } = await c.req.json().catch(() => ({ limit: 20, debug: false, content_type: null, recent_only: true, korean_ott_only: false, include_existing: false, offset: 0 }));

  try {
    // 1년 전 날짜 계산
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    const oneYearAgoStr = oneYearAgo.toISOString().split('T')[0];

    // 콘텐츠 가져오기
    let query = `
      SELECT DISTINCT c.id, c.title, c.content_type
      FROM contents c
    `;

    if (!include_existing) {
      query += ` LEFT JOIN youtube_reviews yr ON c.id = yr.content_id`;
    }

    if (korean_ott_only) {
      query += ` INNER JOIN content_platforms cp ON c.id = cp.content_id`;
    }

    query += ` WHERE 1=1`;

    if (!include_existing) {
      query += ` AND yr.id IS NULL`;
    }

    if (content_type === 'movie' || content_type === 'drama') {
      query += ` AND c.content_type = '${content_type}'`;
    }

    if (recent_only) {
      query += ` AND c.release_date >= '${oneYearAgoStr}'`;
    }

    query += ` ORDER BY c.popularity DESC LIMIT ? OFFSET ?`;

    const contents = await db.prepare(query).bind(limit, offset).all<{ id: number; title: string; content_type: string }>();

    let collected = 0;
    const errors: string[] = [];
    let debugInfo: any = null;
    let usedInstance = '';

    for (const content of contents.results || []) {
      const searchQuery = `${content.title} ${content.content_type === 'movie' ? '영화' : '드라마'} 리뷰`;

      try {
        const result = await searchViaPiped(searchQuery);

        if (!result || result.items.length === 0) {
          errors.push(`${content.title}: ${result?.errors?.join(', ') || 'No results'}`);
          continue;
        }

        usedInstance = result.instance;

        // 첫 번째 응답을 디버그 정보로 저장
        if (debug && !debugInfo) {
          debugInfo = { query: searchQuery, response: result };
        }

        for (const item of result.items) {
          // 썸네일 URL 정리 (프록시 URL에서 원본으로 변환)
          let thumbnailUrl = item.thumbnail;
          if (thumbnailUrl.includes('proxy.')) {
            thumbnailUrl = `https://i.ytimg.com/vi/${item.videoId}/hqdefault.jpg`;
          }

          await db.prepare(`
            INSERT INTO youtube_reviews (
              content_id, video_id, title, channel_name, thumbnail_url, youtube_url, published_at, view_count, source
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'piped_api')
            ON CONFLICT(video_id) DO UPDATE SET view_count = excluded.view_count, source = 'piped_api'
          `).bind(
            content.id,
            item.videoId,
            item.title,
            item.uploaderName,
            thumbnailUrl,
            `https://www.youtube.com/watch?v=${item.videoId}`,
            item.uploaded ? new Date(item.uploaded).toISOString() : null,
            item.views
          ).run();
          collected++;
        }
      } catch (e) {
        errors.push(`${content.title}: ${e instanceof Error ? e.message : 'Unknown error'}`);
      }
    }

    return c.json({
      success: true,
      collected,
      processed: contents.results?.length || 0,
      usedInstance,
      errors: errors.length > 0 ? errors : undefined,
      debug: debug ? debugInfo : undefined
    });
  } catch (error) {
    console.error('Collect youtube reviews via Piped error:', error);
    return c.json({ error: 'Failed to collect youtube reviews via Piped' }, 500);
  }
});
