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

// 국가별 지원 플랫폼 목록 (TMDB provider_id)
const COUNTRY_PROVIDERS: Record<string, number[]> = {
  KR: [8, 97, 356, 337, 350, 1883, 2062], // Netflix, Watcha, Wavve, Disney+, Apple TV+, TVING, Coupang Play
  US: [8, 9, 337, 15, 384, 350, 531],     // Netflix, Amazon Prime, Disney+, Hulu, Max, Apple TV+, Paramount+
  JP: [8, 9, 84, 85, 15, 337],            // Netflix, Amazon Prime, U-NEXT, dTV, Hulu, Disney+
};

// 언어별 검색어 템플릿
const REVIEW_SEARCH_TEMPLATES: Record<string, { movie: string; drama: string }> = {
  ko: { movie: '{title} 영화 리뷰', drama: '{title} 드라마 리뷰' },
  en: { movie: '{title} movie review', drama: '{title} TV series review' },
  ja: { movie: '{title} 映画 レビュー', drama: '{title} ドラマ レビュー' },
};

// 제목 기반 언어 감지 함수
function detectLanguage(text: string): string {
  const hasKorean = /[\uAC00-\uD7AF]/.test(text);
  const hasJapanese = /[\u3040-\u309F\u30A0-\u30FF]/.test(text);
  const hasChinese = /[\u4E00-\u9FFF]/.test(text) && !hasJapanese && !hasKorean;

  if (hasKorean) return 'ko';
  if (hasJapanese) return 'ja';
  if (hasChinese) return 'zh';
  return 'en';
}

// 제목이 해당 언어와 일치하는지 확인
function matchesLanguage(title: string, targetLang: string): boolean {
  const detected = detectLanguage(title);
  if (targetLang === 'en') {
    return detected === 'en';
  }
  return detected === targetLang;
}

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

async function collectPopularMovies(db: D1Database, apiKey: string, pages = 3, recentOnly = true) {
  console.log('Collecting popular movies...');
  let collected = 0;

  // 최근 1년 필터
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  const dateFilter = recentOnly ? `&primary_release_date.gte=${oneYearAgo.toISOString().split('T')[0]}` : '';

  for (let page = 1; page <= pages; page++) {
    const res = await fetch(
      `https://api.themoviedb.org/3/discover/movie?api_key=${apiKey}&language=ko-KR&page=${page}&region=KR&sort_by=popularity.desc&watch_region=KR${dateFilter}`
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

async function collectPopularDramas(db: D1Database, apiKey: string, pages = 3, recentOnly = true) {
  console.log('Collecting popular dramas...');
  let collected = 0;

  // 최근 1년 필터
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  const dateFilter = recentOnly ? `&first_air_date.gte=${oneYearAgo.toISOString().split('T')[0]}` : '';

  for (let page = 1; page <= pages; page++) {
    const res = await fetch(
      `https://api.themoviedb.org/3/discover/tv?api_key=${apiKey}&language=ko-KR&page=${page}&with_origin_country=KR&sort_by=popularity.desc&watch_region=KR${dateFilter}`
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

// 최근 업데이트된 콘텐츠의 Watch Provider 수집 (다국가 지원)
async function collectWatchProvidersForRecent(
  db: D1Database,
  apiKey: string,
  hoursAgo = 24,
  countries = ['KR', 'US', 'JP']
): Promise<Record<string, number>> {
  console.log(`Collecting watch providers for recent content (countries: ${countries.join(', ')})...`);

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

  const results: Record<string, number> = { KR: 0, US: 0, JP: 0 };

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
      for (const countryCode of countries) {
        const countryData = data.results?.[countryCode];
        const providers = countryData?.flatrate || [];
        const supportedProviders = COUNTRY_PROVIDERS[countryCode] || [];

        for (const provider of providers) {
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
    } catch (e) {
      console.error(`Failed to get providers for ${content.tmdb_id}:`, e);
    }
  }

  console.log(`Collected watch providers: KR=${results.KR}, US=${results.US}, JP=${results.JP}`);
  return results;
}

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
} | null> {
  for (const instance of PIPED_INSTANCES) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const res = await fetch(
        `${instance}/search?q=${encodeURIComponent(query)}&filter=videos`,
        {
          headers: { 'Accept': 'application/json', 'User-Agent': 'WhatView/1.0' },
          signal: controller.signal
        }
      );

      clearTimeout(timeoutId);

      if (!res.ok) continue;

      const text = await res.text();
      if (text.startsWith('<')) continue;

      const data = JSON.parse(text) as {
        items?: Array<{
          url: string;
          title: string;
          uploaderName: string;
          thumbnail: string;
          views: number;
          uploaded: number;
        }>;
      };

      if (!data.items || data.items.length === 0) continue;

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

      return { items };
    } catch (e) {
      continue;
    }
  }
  return null;
}

// YouTube 리뷰 수집 (Piped API 사용 - 할당량 무제한, 다언어 지원)
async function collectYouTubeReviewsViaPiped(
  db: D1Database,
  limit = 20,
  options: {
    includeExisting?: boolean;
    orderBy?: 'popularity' | 'release_date';
    language?: 'ko' | 'en' | 'ja';
  } = {}
): Promise<{ collected: number; language: string }> {
  const { includeExisting = false, orderBy = 'popularity', language = 'ko' } = options;
  console.log(`Collecting YouTube reviews via Piped API (limit=${limit}, language=${language}, includeExisting=${includeExisting}, orderBy=${orderBy})...`);

  // 최근 1년
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  const oneYearAgoStr = oneYearAgo.toISOString().split('T')[0];

  // 쿼리 구성
  let query: string;
  const orderClause = orderBy === 'release_date' ? 'c.release_date DESC' : 'c.popularity DESC';

  if (includeExisting) {
    // 기존 리뷰가 있어도 모두 수집 (업데이트)
    query = `
      SELECT c.id, c.title, c.content_type
      FROM contents c
      WHERE c.release_date >= ?
      ORDER BY ${orderClause}
      LIMIT ?
    `;
  } else {
    // 해당 언어 리뷰가 없는 콘텐츠만
    query = `
      SELECT c.id, c.title, c.content_type
      FROM contents c
      LEFT JOIN youtube_reviews yr ON c.id = yr.content_id AND yr.country_code = '${language}'
      WHERE yr.id IS NULL AND c.release_date >= ?
      ORDER BY ${orderClause}
      LIMIT ?
    `;
  }

  const contents = await db.prepare(query).bind(oneYearAgoStr, limit).all<{ id: number; title: string; content_type: string }>();

  let collected = 0;

  for (const content of contents.results || []) {
    // 언어별 검색어 생성
    const template = REVIEW_SEARCH_TEMPLATES[language] || REVIEW_SEARCH_TEMPLATES['ko'];
    const searchTemplate = content.content_type === 'movie' ? template.movie : template.drama;
    const searchQuery = searchTemplate.replace('{title}', content.title);

    try {
      const result = await searchViaPiped(searchQuery);
      if (!result || result.items.length === 0) continue;

      for (const item of result.items) {
        // 제목 기반 언어 필터링 - 해당 언어와 일치하는 영상만 수집
        if (!matchesLanguage(item.title, language)) {
          continue;
        }

        let thumbnailUrl = item.thumbnail;
        if (thumbnailUrl.includes('proxy.')) {
          thumbnailUrl = `https://i.ytimg.com/vi/${item.videoId}/hqdefault.jpg`;
        }

        await db.prepare(`
          INSERT INTO youtube_reviews (
            content_id, video_id, title, channel_name, thumbnail_url, youtube_url, published_at, view_count, source, country_code
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'piped_api', ?)
          ON CONFLICT(video_id) DO UPDATE SET view_count = excluded.view_count, source = 'piped_api', country_code = excluded.country_code
        `).bind(
          content.id,
          item.videoId,
          item.title,
          item.uploaderName,
          thumbnailUrl,
          `https://www.youtube.com/watch?v=${item.videoId}`,
          item.uploaded ? new Date(item.uploaded).toISOString() : null,
          item.views,
          language
        ).run();
        collected++;
      }
    } catch (e) {
      console.error(`Failed to get reviews for ${content.title}:`, e);
    }
  }

  console.log(`Collected ${collected} YouTube reviews via Piped API (${language})`);
  return { collected, language };
}

// 다국어 번역 수집 (영어, 일본어)
async function collectTranslations(db: D1Database, apiKey: string, limit = 50): Promise<{ en: number; ja: number }> {
  console.log('Collecting translations...');

  const results = { en: 0, ja: 0 };
  const languages = [
    { code: 'en', tmdbCode: 'en-US' },
    { code: 'ja', tmdbCode: 'ja-JP' },
  ];

  // 번역이 없는 최근 콘텐츠 가져오기 (최근 업데이트 순)
  const contents = await db.prepare(`
    SELECT c.id, c.tmdb_id, c.content_type, c.title
    FROM contents c
    WHERE c.id NOT IN (
      SELECT DISTINCT content_id FROM content_translations WHERE language_code IN ('en', 'ja')
    )
    ORDER BY c.updated_at DESC
    LIMIT ?
  `).bind(limit).all<{ id: number; tmdb_id: number; content_type: string; title: string }>();

  for (const content of contents.results || []) {
    const mediaType = content.content_type === 'movie' ? 'movie' : 'tv';

    for (const lang of languages) {
      try {
        const res = await fetch(
          `https://api.themoviedb.org/3/${mediaType}/${content.tmdb_id}?api_key=${apiKey}&language=${lang.tmdbCode}`
        );

        if (!res.ok) continue;

        const data = await res.json() as {
          title?: string;
          name?: string;
          overview?: string;
          poster_path?: string | null;
        };

        const title = data.title || data.name;
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
            lang.code,
            title,
            data.overview || null,
            data.poster_path ? `${TMDB_IMAGE_BASE}/w500${data.poster_path}` : null
          ).run();

          results[lang.code as 'en' | 'ja']++;
        }
      } catch (e) {
        console.error(`Translation fetch error for ${content.title} (${lang.code}):`, e);
      }
    }
  }

  console.log(`Collected translations: en=${results.en}, ja=${results.ja}`);
  return results;
}

// YouTube 리뷰 수집 (리뷰가 없는 콘텐츠 대상, 영화 30% / 드라마 70%)
async function collectYouTubeReviews(db: D1Database, apiKey: string, limit = 20): Promise<number> {
  console.log('Collecting YouTube reviews...');

  if (!apiKey || apiKey === 'your-youtube-api-key-here') {
    console.log('YouTube API key not configured, skipping...');
    return 0;
  }

  // 영화 30%, 드라마 70% 비율로 수집
  const movieLimit = Math.ceil(limit * 0.3);
  const dramaLimit = Math.ceil(limit * 0.7);

  // 최근 1년 이내 작품만
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  const oneYearAgoStr = oneYearAgo.toISOString().split('T')[0]; // YYYY-MM-DD

  const movies = await db.prepare(`
    SELECT c.id, c.title, c.content_type
    FROM contents c
    LEFT JOIN youtube_reviews yr ON c.id = yr.content_id
    WHERE yr.id IS NULL
      AND c.content_type = 'movie'
      AND c.release_date >= ?
    ORDER BY c.popularity DESC
    LIMIT ?
  `).bind(oneYearAgoStr, movieLimit).all<{ id: number; title: string; content_type: string }>();

  const dramas = await db.prepare(`
    SELECT c.id, c.title, c.content_type
    FROM contents c
    LEFT JOIN youtube_reviews yr ON c.id = yr.content_id
    WHERE yr.id IS NULL
      AND c.content_type = 'drama'
      AND c.release_date >= ?
    ORDER BY c.popularity DESC
    LIMIT ?
  `).bind(oneYearAgoStr, dramaLimit).all<{ id: number; title: string; content_type: string }>();

  // 영화와 드라마를 합쳐서 처리
  const contents = {
    results: [...(movies.results || []), ...(dramas.results || [])]
  };

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

      const items = data.items || [];
      if (items.length === 0) continue;

      // Video IDs 수집해서 조회수 가져오기
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
        console.error(`Failed to get view counts for ${content.title}:`, e);
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
        // Daily at 3 AM UTC (12:00 KST): Sync genres, collect popular content, watch providers, translations
        await syncGenres(env.DB, env.TMDB_API_KEY);
        await collectPopularMovies(env.DB, env.TMDB_API_KEY, 5);
        await collectPopularDramas(env.DB, env.TMDB_API_KEY, 5);
        await collectWatchProvidersForRecent(env.DB, env.TMDB_API_KEY, 48, ['KR', 'US', 'JP']);
        await collectTranslations(env.DB, env.TMDB_API_KEY, 50); // 영어/일본어 번역 수집
        break;

      case '0 */6 * * *':
        // Every 6 hours: Quick update + watch providers + translations for new content
        await collectPopularMovies(env.DB, env.TMDB_API_KEY, 1);
        await collectPopularDramas(env.DB, env.TMDB_API_KEY, 1);
        await collectWatchProvidersForRecent(env.DB, env.TMDB_API_KEY, 6, ['KR', 'US', 'JP']);
        await collectTranslations(env.DB, env.TMDB_API_KEY, 20); // 신규 콘텐츠 번역
        break;

      case '*/10 4-5 * * *':
        // Every 10 minutes during 04:00-06:00 UTC (13:00-15:00 KST): YouTube reviews via Piped API
        // 각 언어별로 7개씩 수집 (총 21개) → 언어별 균등 수집
        // 21 items per batch × 6 batches/hour × 2 hours = 252 items/day (각 언어 84개)
        const languages: Array<'ko' | 'en' | 'ja'> = ['ko', 'en', 'ja'];
        for (const lang of languages) {
          await collectYouTubeReviewsViaPiped(env.DB, 7, {
            includeExisting: true,
            orderBy: 'release_date',
            language: lang,
          });
        }
        break;

      default:
        console.log(`Unknown cron trigger: ${trigger}`);
    }
  } catch (error) {
    console.error('Scheduled task error:', error);
    throw error;
  }
}
