import { Hono } from 'hono';
import type { Env } from '../index';
import type { Genre } from '../types';

export const genresRoutes = new Hono<{ Bindings: Env }>();

// Get all genres (optionally filtered by content_type)
genresRoutes.get('/', async (c) => {
  const db = c.env.DB;
  const contentType = c.req.query('content_type');

  let genres;

  if (contentType) {
    // 해당 콘텐츠 타입에 콘텐츠가 있는 장르만 반환
    genres = await db.prepare(`
      SELECT DISTINCT g.* FROM genres g
      INNER JOIN content_genres cg ON g.id = cg.genre_id
      INNER JOIN contents c ON cg.content_id = c.id
      WHERE c.content_type = ?
      ORDER BY g.name
    `).bind(contentType).all<Genre>();
  } else {
    // 전체 장르 반환
    genres = await db.prepare(
      'SELECT * FROM genres ORDER BY name'
    ).all<Genre>();
  }

  return c.json(genres.results || []);
});

// Get single genre
genresRoutes.get('/:id', async (c) => {
  const db = c.env.DB;
  const id = parseInt(c.req.param('id'));

  const genre = await db.prepare(
    'SELECT * FROM genres WHERE id = ?'
  ).bind(id).first<Genre>();

  if (!genre) {
    return c.json({ error: 'Genre not found' }, 404);
  }

  return c.json(genre);
});
