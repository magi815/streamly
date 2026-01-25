import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { contentsRoutes } from './routes/contents';
import { genresRoutes } from './routes/genres';
import { platformsRoutes } from './routes/platforms';
import { adminRoutes } from './routes/admin';
import { scheduledHandler } from './scheduled';

export interface Env {
  DB: D1Database;
  TMDB_API_KEY: string;
  YOUTUBE_API_KEY: string;
}

const app = new Hono<{ Bindings: Env }>();

// Middleware
app.use('*', logger());
app.use('*', cors({
  origin: [
    'http://localhost:3000',
    'https://streamly.pages.dev',
    'https://streamly.magi815.workers.dev',
  ],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

// Health check
app.get('/', (c) => {
  return c.json({
    status: 'ok',
    service: 'Streamly API',
    version: '1.0.0'
  });
});

// API routes
app.route('/api/v1/contents', contentsRoutes);
app.route('/api/v1/genres', genresRoutes);
app.route('/api/v1/platforms', platformsRoutes);
app.route('/api/v1/admin', adminRoutes);

// 404 handler
app.notFound((c) => {
  return c.json({ error: 'Not found' }, 404);
});

// Error handler
app.onError((err, c) => {
  console.error('Error:', err);
  return c.json({ error: 'Internal server error' }, 500);
});

export default {
  fetch: app.fetch,
  scheduled: scheduledHandler,
};
