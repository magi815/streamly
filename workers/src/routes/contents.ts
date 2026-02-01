import { Hono } from 'hono';
import type { Env } from '../index';
import type { Content, Genre, PaginatedResponse, CountryCode, LanguageCode, CountryPlatform } from '../types';
import { COUNTRY_LANGUAGE_MAP, SUPPORTED_COUNTRIES, SUPPORTED_LANGUAGES } from '../types';

export const contentsRoutes = new Hono<{ Bindings: Env }>();

const PAGE_SIZE = 20;

// Helper: Validate and get country code
function getValidCountry(country?: string): CountryCode {
  if (country && SUPPORTED_COUNTRIES.includes(country as CountryCode)) {
    return country as CountryCode;
  }
  return 'KR';
}

// Helper: Validate and get language code
function getValidLanguage(language?: string, country?: CountryCode): LanguageCode {
  if (language && SUPPORTED_LANGUAGES.includes(language as LanguageCode)) {
    return language as LanguageCode;
  }
  return country ? COUNTRY_LANGUAGE_MAP[country] : 'ko';
}

// Helper function to get genres for contents
async function getGenresForContent(db: D1Database, contentId: number): Promise<Genre[]> {
  const genres = await db.prepare(
    `SELECT g.* FROM genres g
     JOIN content_genres cg ON g.id = cg.genre_id
     WHERE cg.content_id = ?`
  ).bind(contentId).all<Genre>();
  return genres.results || [];
}

// Helper function to get platforms for content by country
async function getPlatformsForContent(
  db: D1Database,
  contentId: number,
  country: CountryCode = 'KR'
): Promise<CountryPlatform[]> {
  // First try to get from country_platforms
  const platforms = await db.prepare(
    `SELECT cp.*, p.code, p.logo_url
     FROM country_platforms cp
     JOIN platforms p ON cp.platform_id = p.id
     JOIN content_platforms cpl ON p.id = cpl.platform_id
     WHERE cpl.content_id = ? AND cp.country_code = ? AND cp.is_active = 1`
  ).bind(contentId, country).all<CountryPlatform>();

  if (platforms.results && platforms.results.length > 0) {
    return platforms.results;
  }

  // Fallback to original platforms table (backward compatibility for KR)
  if (country === 'KR') {
    const fallbackPlatforms = await db.prepare(
      `SELECT p.id as platform_id, p.name as name_local, p.code, p.logo_url
       FROM platforms p
       JOIN content_platforms cp ON p.id = cp.platform_id
       WHERE cp.content_id = ?`
    ).bind(contentId).all<CountryPlatform>();
    return fallbackPlatforms.results || [];
  }

  return [];
}

// Helper function to get translated content
async function getTranslatedContent(
  db: D1Database,
  content: Content,
  language: LanguageCode
): Promise<Content> {
  if (language === 'ko') {
    // Korean is stored in main contents table
    return content;
  }

  // Try to get translation from content_translations table
  const translation = await db.prepare(
    `SELECT title, overview, poster_path
     FROM content_translations
     WHERE content_id = ? AND language_code = ?`
  ).bind(content.id, language).first<{ title: string; overview: string | null; poster_path: string | null }>();

  if (translation) {
    return {
      ...content,
      title: translation.title,
      overview: translation.overview || content.overview,
      poster_url: translation.poster_path || content.poster_url,
    };
  }

  // Fallback: use title_en for non-Korean languages
  if (content.title_en) {
    return {
      ...content,
      title: content.title_en,
      // Keep original overview if no translation (better than nothing)
    };
  }

  return content;
}

// Helper function to get review count for content (optionally by country)
async function getReviewCountForContent(
  db: D1Database,
  contentId: number,
  country?: CountryCode
): Promise<number> {
  // For now, return all reviews count (country filtering can be added later)
  const result = await db.prepare(
    `SELECT COUNT(*) as count FROM youtube_reviews WHERE content_id = ?`
  ).bind(contentId).first<{ count: number }>();
  return result?.count || 0;
}

// Get all contents with filtering and pagination
contentsRoutes.get('/', async (c) => {
  const db = c.env.DB;
  const {
    page = '1',
    content_type,
    genre,
    ordering = '-popularity',
    recent,
    period = '1',
    available_kr,
    country: countryParam,
    language: languageParam
  } = c.req.query();

  const country = getValidCountry(countryParam);
  const language = getValidLanguage(languageParam, country);
  const pageNum = parseInt(page);
  const offset = (pageNum - 1) * PAGE_SIZE;

  let whereClause = '1=1';
  const params: (string | number)[] = [];

  // Filter by country availability (default: show only available in requested country)
  if (available_kr !== 'false') {
    whereClause += ' AND id IN (SELECT content_id FROM content_platforms)';
  }

  if (content_type) {
    whereClause += ' AND content_type = ?';
    params.push(content_type);
  }

  if (genre) {
    whereClause += ' AND id IN (SELECT content_id FROM content_genres WHERE genre_id = ?)';
    params.push(parseInt(genre));
  }

  // Filter by recent releases
  if (recent === 'true') {
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    const dateStr = oneYearAgo.toISOString().split('T')[0];
    whereClause += ' AND release_date >= ?';
    params.push(dateStr);
  }

  // Ordering
  let orderClause = 'popularity DESC';
  if (ordering === '-rating') orderClause = 'rating DESC';
  else if (ordering === 'rating') orderClause = 'rating ASC';
  else if (ordering === '-release_date') orderClause = 'release_date DESC';
  else if (ordering === 'release_date') orderClause = 'release_date ASC';
  else if (ordering === 'popularity') orderClause = 'popularity ASC';

  // Period filter for popularity ordering
  if ((ordering === '-popularity' || !ordering) && recent !== 'true' && recent !== 'false') {
    if (period !== 'all') {
      const years = parseInt(period) || 1;
      const periodAgo = new Date();
      periodAgo.setFullYear(periodAgo.getFullYear() - years);
      const dateStr = periodAgo.toISOString().split('T')[0];
      whereClause += ' AND release_date >= ?';
      params.push(dateStr);
    }
  }

  // Get count
  const countResult = await db.prepare(
    `SELECT COUNT(*) as count FROM contents WHERE ${whereClause}`
  ).bind(...params).first<{ count: number }>();

  const totalCount = countResult?.count || 0;

  // Get contents
  const contents = await db.prepare(
    `SELECT * FROM contents WHERE ${whereClause} ORDER BY ${orderClause} LIMIT ? OFFSET ?`
  ).bind(...params, PAGE_SIZE, offset).all<Content>();

  // Get genres, platforms, review count, and apply translations
  const results = await Promise.all(
    (contents.results || []).map(async (content) => {
      const translated = await getTranslatedContent(db, content, language);
      return {
        ...translated,
        genres: await getGenresForContent(db, content.id),
        platforms: await getPlatformsForContent(db, content.id, country),
        review_count: await getReviewCountForContent(db, content.id, country),
      };
    })
  );

  const response: PaginatedResponse<Content> = {
    count: totalCount,
    next: offset + PAGE_SIZE < totalCount ? `?page=${pageNum + 1}` : null,
    previous: pageNum > 1 ? `?page=${pageNum - 1}` : null,
    results,
  };

  return c.json(response);
});

// IMPORTANT: Static routes MUST come before dynamic routes (/:id)

// Get movies only
contentsRoutes.get('/movies', async (c) => {
  const db = c.env.DB;
  const { page = '1', country: countryParam, language: languageParam } = c.req.query();

  const country = getValidCountry(countryParam);
  const language = getValidLanguage(languageParam, country);
  const pageNum = parseInt(page);
  const offset = (pageNum - 1) * PAGE_SIZE;

  const countResult = await db.prepare(
    `SELECT COUNT(*) as count FROM contents
     WHERE content_type = 'movie'
     AND id IN (SELECT content_id FROM content_platforms)`
  ).first<{ count: number }>();

  const totalCount = countResult?.count || 0;

  const contents = await db.prepare(
    `SELECT * FROM contents
     WHERE content_type = 'movie'
     AND id IN (SELECT content_id FROM content_platforms)
     ORDER BY popularity DESC LIMIT ? OFFSET ?`
  ).bind(PAGE_SIZE, offset).all<Content>();

  const results = await Promise.all(
    (contents.results || []).map(async (content) => {
      const translated = await getTranslatedContent(db, content, language);
      return {
        ...translated,
        genres: await getGenresForContent(db, content.id),
        platforms: await getPlatformsForContent(db, content.id, country),
        review_count: await getReviewCountForContent(db, content.id, country),
      };
    })
  );

  return c.json({
    count: totalCount,
    next: offset + PAGE_SIZE < totalCount ? `?page=${pageNum + 1}` : null,
    previous: pageNum > 1 ? `?page=${pageNum - 1}` : null,
    results,
  });
});

// Get dramas only
contentsRoutes.get('/dramas', async (c) => {
  const db = c.env.DB;
  const { page = '1', country: countryParam, language: languageParam } = c.req.query();

  const country = getValidCountry(countryParam);
  const language = getValidLanguage(languageParam, country);
  const pageNum = parseInt(page);
  const offset = (pageNum - 1) * PAGE_SIZE;

  const countResult = await db.prepare(
    `SELECT COUNT(*) as count FROM contents
     WHERE content_type = 'drama'
     AND id IN (SELECT content_id FROM content_platforms)`
  ).first<{ count: number }>();

  const totalCount = countResult?.count || 0;

  const contents = await db.prepare(
    `SELECT * FROM contents
     WHERE content_type = 'drama'
     AND id IN (SELECT content_id FROM content_platforms)
     ORDER BY popularity DESC LIMIT ? OFFSET ?`
  ).bind(PAGE_SIZE, offset).all<Content>();

  const results = await Promise.all(
    (contents.results || []).map(async (content) => {
      const translated = await getTranslatedContent(db, content, language);
      return {
        ...translated,
        genres: await getGenresForContent(db, content.id),
        platforms: await getPlatformsForContent(db, content.id, country),
        review_count: await getReviewCountForContent(db, content.id, country),
      };
    })
  );

  return c.json({
    count: totalCount,
    next: offset + PAGE_SIZE < totalCount ? `?page=${pageNum + 1}` : null,
    previous: pageNum > 1 ? `?page=${pageNum - 1}` : null,
    results,
  });
});

// Get trending contents
contentsRoutes.get('/trending', async (c) => {
  const db = c.env.DB;
  const { country: countryParam, language: languageParam } = c.req.query();

  const country = getValidCountry(countryParam);
  const language = getValidLanguage(languageParam, country);

  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  const dateStr = oneYearAgo.toISOString().split('T')[0];

  const contents = await db.prepare(
    `SELECT * FROM contents
     WHERE release_date >= ?
     AND id IN (SELECT content_id FROM content_platforms)
     ORDER BY popularity DESC LIMIT 10`
  ).bind(dateStr).all<Content>();

  const results = await Promise.all(
    (contents.results || []).map(async (content) => {
      const translated = await getTranslatedContent(db, content, language);
      return {
        ...translated,
        genres: await getGenresForContent(db, content.id),
        platforms: await getPlatformsForContent(db, content.id, country),
        review_count: await getReviewCountForContent(db, content.id, country),
      };
    })
  );

  return c.json(results);
});

// Get new releases
contentsRoutes.get('/new-releases', async (c) => {
  const db = c.env.DB;
  const { country: countryParam, language: languageParam } = c.req.query();

  const country = getValidCountry(countryParam);
  const language = getValidLanguage(languageParam, country);

  const contents = await db.prepare(
    `SELECT * FROM contents
     WHERE release_date IS NOT NULL
     AND id IN (SELECT content_id FROM content_platforms)
     ORDER BY release_date DESC LIMIT 10`
  ).all<Content>();

  const results = await Promise.all(
    (contents.results || []).map(async (content) => {
      const translated = await getTranslatedContent(db, content, language);
      return {
        ...translated,
        genres: await getGenresForContent(db, content.id),
        platforms: await getPlatformsForContent(db, content.id, country),
        review_count: await getReviewCountForContent(db, content.id, country),
      };
    })
  );

  return c.json(results);
});

// Search contents
contentsRoutes.get('/search', async (c) => {
  const db = c.env.DB;
  const { q, page = '1', country: countryParam, language: languageParam } = c.req.query();

  if (!q) {
    return c.json({ count: 0, next: null, previous: null, results: [] });
  }

  const country = getValidCountry(countryParam);
  const language = getValidLanguage(languageParam, country);
  const pageNum = parseInt(page);
  const offset = (pageNum - 1) * PAGE_SIZE;
  const searchTerm = `%${q}%`;

  // Search in both main table and translations
  const countResult = await db.prepare(
    `SELECT COUNT(DISTINCT c.id) as count FROM contents c
     LEFT JOIN content_translations ct ON c.id = ct.content_id
     WHERE c.title LIKE ? OR c.title_en LIKE ? OR c.overview LIKE ?
     OR ct.title LIKE ? OR ct.overview LIKE ?`
  ).bind(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm).first<{ count: number }>();

  const totalCount = countResult?.count || 0;

  const contents = await db.prepare(
    `SELECT DISTINCT c.* FROM contents c
     LEFT JOIN content_translations ct ON c.id = ct.content_id
     WHERE c.title LIKE ? OR c.title_en LIKE ? OR c.overview LIKE ?
     OR ct.title LIKE ? OR ct.overview LIKE ?
     ORDER BY c.popularity DESC LIMIT ? OFFSET ?`
  ).bind(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, PAGE_SIZE, offset).all<Content>();

  const results = await Promise.all(
    (contents.results || []).map(async (content) => {
      const translated = await getTranslatedContent(db, content, language);
      return {
        ...translated,
        genres: await getGenresForContent(db, content.id),
        platforms: await getPlatformsForContent(db, content.id, country),
        review_count: await getReviewCountForContent(db, content.id, country),
      };
    })
  );

  return c.json({
    count: totalCount,
    next: offset + PAGE_SIZE < totalCount ? `?page=${pageNum + 1}` : null,
    previous: pageNum > 1 ? `?page=${pageNum - 1}` : null,
    results,
  });
});

// Dynamic routes MUST come after static routes

// Get single content
contentsRoutes.get('/:id', async (c) => {
  const db = c.env.DB;
  const id = parseInt(c.req.param('id'));
  const { country: countryParam, language: languageParam } = c.req.query();

  const country = getValidCountry(countryParam);
  const language = getValidLanguage(languageParam, country);

  if (isNaN(id)) {
    return c.json({ error: 'Invalid content ID' }, 400);
  }

  const content = await db.prepare(
    'SELECT * FROM contents WHERE id = ?'
  ).bind(id).first<Content>();

  if (!content) {
    return c.json({ error: 'Content not found' }, 404);
  }

  // Apply translation
  const translated = await getTranslatedContent(db, content, language);

  // Get genres
  const genres = await getGenresForContent(db, id);

  // Get platforms for the requested country
  const platforms = await getPlatformsForContent(db, id, country);

  // Get cast
  const castResult = await db.prepare(
    'SELECT name FROM content_cast WHERE content_id = ? ORDER BY order_num LIMIT 10'
  ).bind(id).all<{ name: string }>();

  // Get YouTube reviews
  const reviews = await db.prepare(
    'SELECT * FROM youtube_reviews WHERE content_id = ? ORDER BY is_featured DESC, view_count DESC'
  ).bind(id).all();

  return c.json({
    ...translated,
    genres,
    platforms,
    cast: (castResult.results || []).map(c => c.name),
    youtube_reviews: reviews.results || [],
  });
});

// Get YouTube reviews for a content
contentsRoutes.get('/:id/reviews', async (c) => {
  const db = c.env.DB;
  const id = parseInt(c.req.param('id'));
  const { country: countryParam } = c.req.query();

  const country = getValidCountry(countryParam);

  if (isNaN(id)) {
    return c.json({ error: 'Invalid content ID' }, 400);
  }

  // For now, return all reviews (country filtering can be added later)
  const reviews = await db.prepare(
    `SELECT * FROM youtube_reviews
     WHERE content_id = ?
     ORDER BY is_featured DESC, view_count DESC`
  ).bind(id).all();

  return c.json(reviews.results || []);
});
