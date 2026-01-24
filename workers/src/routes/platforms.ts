import { Hono } from 'hono';
import type { Env } from '../index';
import type { Platform } from '../types';

export const platformsRoutes = new Hono<{ Bindings: Env }>();

// Get all platforms
platformsRoutes.get('/', async (c) => {
  const db = c.env.DB;

  const platforms = await db.prepare(
    'SELECT * FROM platforms WHERE is_active = 1 ORDER BY name'
  ).all<Platform>();

  return c.json(platforms.results || []);
});

// Get single platform
platformsRoutes.get('/:id', async (c) => {
  const db = c.env.DB;
  const id = parseInt(c.req.param('id'));

  const platform = await db.prepare(
    'SELECT * FROM platforms WHERE id = ?'
  ).bind(id).first<Platform>();

  if (!platform) {
    return c.json({ error: 'Platform not found' }, 404);
  }

  return c.json(platform);
});
