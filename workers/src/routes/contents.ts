import { Hono } from 'hono';
import type { Env } from '../index';
import type { Content, Genre, PaginatedResponse } from '../types';

export const contentsRoutes = new Hono<{ Bindings: Env }>();

const PAGE_SIZE = 20;

// Helper function to get genres for contents
async function getGenresForContent(db: D1Database, contentId: number): Promise<Genre[]> {
  const genres = await db.prepare(
    `SELECT g.* FROM genres g
     JOIN content_genres cg ON g.id = cg.genre_id
     WHERE cg.content_id = ?`
  ).bind(contentId).all<Genre>();
  return genres.results || [];
}

// Helper function to get platforms for contents
interface Platform {
  id: number;
  name: string;
  code: string;
  logo_url: string | null;
}

async function getPlatformsForContent(db: D1Database, contentId: number): Promise<Platform[]> {
  const platforms = await db.prepare(
    `SELECT p.id, p.name, p.code, p.logo_url FROM platforms p
     JOIN content_platforms cp ON p.id = cp.platform_id
     WHERE cp.content_id = ?`
  ).bind(contentId).all<Platform>();
  return platforms.results || [];
}

// Helper function to get review count for content
async function getReviewCountForContent(db: D1Database, contentId: number): Promise<number> {
  const result = await db.prepare(
    `SELECT COUNT(*) as count FROM youtube_reviews WHERE content_id = ?`
  ).bind(contentId).first<{ count: number }>();
  return result?.count || 0;
}

// Get all contents with filtering and pagination
contentsRoutes.get('/', async (c) => {
  const db = c.env.DB;
  const { page = '1', content_type, genre, ordering = '-popularity', recent, period = '1', available_kr } = c.req.query();

  const pageNum = parseInt(page);
  const offset = (pageNum - 1) * PAGE_SIZE;

  let whereClause = '1=1';
  const params: (string | number)[] = [];

  // 기본적으로 한국에서 시청 가능한 콘텐츠만 표시 (available_kr=false로 비활성화 가능)
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

  // 인기순 정렬 시 기간 필터 적용 (recent 파라미터가 없을 때)
  if ((ordering === '-popularity' || !ordering) && recent !== 'true' && recent !== 'false') {
    // period: '1' = 1년, '2' = 2년, '5' = 5년, 'all' = 전체
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

  // Get genres, platforms, and review count for each content
  const results = await Promise.all(
    (contents.results || []).map(async (content) => ({
      ...content,
      genres: await getGenresForContent(db, content.id),
      platforms: await getPlatformsForContent(db, content.id),
      review_count: await getReviewCountForContent(db, content.id),
    }))
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

// Get movies only (한국에서 시청 가능한 것만)
contentsRoutes.get('/movies', async (c) => {
  const db = c.env.DB;
  const { page = '1' } = c.req.query();

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
    (contents.results || []).map(async (content) => ({
      ...content,
      genres: await getGenresForContent(db, content.id),
      platforms: await getPlatformsForContent(db, content.id),
      review_count: await getReviewCountForContent(db, content.id),
    }))
  );

  return c.json({
    count: totalCount,
    next: offset + PAGE_SIZE < totalCount ? `?page=${pageNum + 1}` : null,
    previous: pageNum > 1 ? `?page=${pageNum - 1}` : null,
    results,
  });
});

// Get dramas only (한국에서 시청 가능한 것만)
contentsRoutes.get('/dramas', async (c) => {
  const db = c.env.DB;
  const { page = '1' } = c.req.query();

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
    (contents.results || []).map(async (content) => ({
      ...content,
      genres: await getGenresForContent(db, content.id),
      platforms: await getPlatformsForContent(db, content.id),
      review_count: await getReviewCountForContent(db, content.id),
    }))
  );

  return c.json({
    count: totalCount,
    next: offset + PAGE_SIZE < totalCount ? `?page=${pageNum + 1}` : null,
    previous: pageNum > 1 ? `?page=${pageNum - 1}` : null,
    results,
  });
});

// Get trending contents (recent 1 year + high popularity, 한국에서 시청 가능한 것만)
contentsRoutes.get('/trending', async (c) => {
  const db = c.env.DB;

  // Get content from the last 1 year, sorted by popularity
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
    (contents.results || []).map(async (content) => ({
      ...content,
      genres: await getGenresForContent(db, content.id),
      platforms: await getPlatformsForContent(db, content.id),
      review_count: await getReviewCountForContent(db, content.id),
    }))
  );

  return c.json(results);
});

// Get new releases (한국에서 시청 가능한 것만)
contentsRoutes.get('/new-releases', async (c) => {
  const db = c.env.DB;

  const contents = await db.prepare(
    `SELECT * FROM contents
     WHERE release_date IS NOT NULL
     AND id IN (SELECT content_id FROM content_platforms)
     ORDER BY release_date DESC LIMIT 10`
  ).all<Content>();

  const results = await Promise.all(
    (contents.results || []).map(async (content) => ({
      ...content,
      genres: await getGenresForContent(db, content.id),
      platforms: await getPlatformsForContent(db, content.id),
      review_count: await getReviewCountForContent(db, content.id),
    }))
  );

  return c.json(results);
});

// Search contents
contentsRoutes.get('/search', async (c) => {
  const db = c.env.DB;
  const { q, page = '1' } = c.req.query();

  if (!q) {
    return c.json({ count: 0, next: null, previous: null, results: [] });
  }

  const pageNum = parseInt(page);
  const offset = (pageNum - 1) * PAGE_SIZE;
  const searchTerm = `%${q}%`;

  const countResult = await db.prepare(
    `SELECT COUNT(*) as count FROM contents
     WHERE title LIKE ? OR title_en LIKE ? OR overview LIKE ?`
  ).bind(searchTerm, searchTerm, searchTerm).first<{ count: number }>();

  const totalCount = countResult?.count || 0;

  const contents = await db.prepare(
    `SELECT * FROM contents
     WHERE title LIKE ? OR title_en LIKE ? OR overview LIKE ?
     ORDER BY popularity DESC LIMIT ? OFFSET ?`
  ).bind(searchTerm, searchTerm, searchTerm, PAGE_SIZE, offset).all<Content>();

  const results = await Promise.all(
    (contents.results || []).map(async (content) => ({
      ...content,
      genres: await getGenresForContent(db, content.id),
      platforms: await getPlatformsForContent(db, content.id),
      review_count: await getReviewCountForContent(db, content.id),
    }))
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

  // Check if id is a valid number
  if (isNaN(id)) {
    return c.json({ error: 'Invalid content ID' }, 400);
  }

  const content = await db.prepare(
    'SELECT * FROM contents WHERE id = ?'
  ).bind(id).first<Content>();

  if (!content) {
    return c.json({ error: 'Content not found' }, 404);
  }

  // Get genres
  const genres = await getGenresForContent(db, id);

  // Get platforms (OTT 정보)
  const platformsResult = await db.prepare(
    `SELECT p.id, p.name, p.code, p.logo_url, p.website_url
     FROM platforms p
     JOIN content_platforms cp ON p.id = cp.platform_id
     WHERE cp.content_id = ?`
  ).bind(id).all<{ id: number; name: string; code: string; logo_url: string; website_url: string }>();

  // Get cast
  const castResult = await db.prepare(
    'SELECT name FROM content_cast WHERE content_id = ? ORDER BY order_num LIMIT 10'
  ).bind(id).all<{ name: string }>();

  // Get YouTube reviews
  const reviews = await db.prepare(
    'SELECT * FROM youtube_reviews WHERE content_id = ? ORDER BY is_featured DESC, view_count DESC LIMIT 6'
  ).bind(id).all();

  return c.json({
    ...content,
    genres,
    platforms: platformsResult.results || [],
    cast: (castResult.results || []).map(c => c.name),
    youtube_reviews: reviews.results || [],
  });
});

// Get YouTube reviews for a content
contentsRoutes.get('/:id/reviews', async (c) => {
  const db = c.env.DB;
  const id = parseInt(c.req.param('id'));

  if (isNaN(id)) {
    return c.json({ error: 'Invalid content ID' }, 400);
  }

  const reviews = await db.prepare(
    `SELECT * FROM youtube_reviews
     WHERE content_id = ?
     ORDER BY is_featured DESC, view_count DESC`
  ).bind(id).all();

  return c.json(reviews.results || []);
});
