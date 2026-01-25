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

// OTT 시청 정보 수집 (TMDb Watch Providers)
adminRoutes.post('/collect-watch-providers', async (c) => {
  const db = c.env.DB;
  const apiKey = c.env.TMDB_API_KEY;
  const { offset = 0, limit = 50 } = await c.req.json().catch(() => ({ offset: 0, limit: 50 }));

  if (!apiKey) {
    return c.json({ error: 'TMDB_API_KEY not configured' }, 400);
  }

  // 한국에서 사용 가능한 주요 OTT 플랫폼 (TMDb provider_id)
  const koreanProviders: Record<number, { name: string; code: string; logo: string }> = {
    8: { name: 'Netflix', code: 'netflix', logo: '/t2yyOv40HZeVlLjYsCsPHnWLk4W.jpg' },
    97: { name: 'Watcha', code: 'watcha', logo: '/2ioan5BX5L9tz4fIGU93blTeFhv.jpg' },
    356: { name: 'Wavve', code: 'wavve', logo: '/6UKUfqUCOEbCpaChyPtBqR8HR13.jpg' },
    337: { name: 'Disney+', code: 'disney_plus', logo: '/7rwgEs15tFwyR9NPQ5vpzxTj19Q.jpg' },
    350: { name: 'Apple TV+', code: 'apple_tv_plus', logo: '/6uhKBfmtzFqOcLousHwZuzcrScK.jpg' },
    1883: { name: 'TVING', code: 'tving', logo: '/cNi4Nv5EPsnvf5WmgwhfWDsdMUd.jpg' },
  };

  try {
    // 플랫폼 정보 업데이트/삽입 (첫 번째 호출에서만)
    if (offset === 0) {
      for (const [providerId, info] of Object.entries(koreanProviders)) {
        await db.prepare(`
          INSERT INTO platforms (name, code, tmdb_provider_id, logo_url)
          VALUES (?, ?, ?, ?)
          ON CONFLICT(code) DO UPDATE SET
            tmdb_provider_id = excluded.tmdb_provider_id,
            logo_url = excluded.logo_url
        `).bind(
          info.name,
          info.code,
          parseInt(providerId),
          `https://image.tmdb.org/t/p/original${info.logo}`
        ).run();
      }
    }

    // 페이지네이션으로 콘텐츠 가져오기
    const totalResult = await db.prepare('SELECT COUNT(*) as count FROM contents').first<{ count: number }>();
    const total = totalResult?.count || 0;

    const contents = await db.prepare(
      `SELECT id, tmdb_id, content_type FROM contents ORDER BY id LIMIT ? OFFSET ?`
    ).bind(limit, offset).all<{ id: number; tmdb_id: number; content_type: string }>();

    let collected = 0;
    let processed = 0;

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
        processed++;
      } catch (e) {
        console.error(`Failed to get providers for ${content.tmdb_id}:`, e);
      }
    }

    const nextOffset = offset + limit < total ? offset + limit : null;

    return c.json({ success: true, processed, collected, total, nextOffset });
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

  const { limit = 20 } = await c.req.json().catch(() => ({ limit: 20 }));

  try {
    // 리뷰가 없는 콘텐츠 가져오기
    const contents = await db.prepare(`
      SELECT c.id, c.title, c.content_type
      FROM contents c
      LEFT JOIN youtube_reviews yr ON c.id = yr.content_id
      WHERE yr.id IS NULL
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
        console.error(`Failed to get reviews for ${content.title}:`, e);
      }
    }

    return c.json({ success: true, collected });
  } catch (error) {
    console.error('Collect youtube reviews error:', error);
    return c.json({ error: 'Failed to collect youtube reviews' }, 500);
  }
});
