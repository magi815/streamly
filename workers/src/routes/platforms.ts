import { Hono } from 'hono';
import type { Env } from '../index';
import type { Platform, CountryPlatform, CountryCode } from '../types';
import { SUPPORTED_COUNTRIES } from '../types';

export const platformsRoutes = new Hono<{ Bindings: Env }>();

// Helper: Validate and get country code
function getValidCountry(country?: string): CountryCode {
  if (country && SUPPORTED_COUNTRIES.includes(country as CountryCode)) {
    return country as CountryCode;
  }
  return 'KR';
}

// Get all platforms (with country filtering)
platformsRoutes.get('/', async (c) => {
  const db = c.env.DB;
  const { country: countryParam } = c.req.query();
  const country = getValidCountry(countryParam);

  // Try to get from country_platforms first
  const countryPlatforms = await db.prepare(
    `SELECT cp.*, p.code, p.logo_url, p.website_url
     FROM country_platforms cp
     JOIN platforms p ON cp.platform_id = p.id
     WHERE cp.country_code = ? AND cp.is_active = 1
     ORDER BY cp.name_local`
  ).bind(country).all<CountryPlatform & { website_url: string }>();

  if (countryPlatforms.results && countryPlatforms.results.length > 0) {
    // Transform to standard format
    const platforms = countryPlatforms.results.map(cp => ({
      id: cp.platform_id,
      name: cp.name_local,
      code: cp.code,
      logo_url: cp.logo_url,
      website_url: cp.website_url,
      search_url_template: cp.search_url_template,
      tmdb_provider_id: cp.tmdb_provider_id,
      country_code: cp.country_code,
    }));
    return c.json(platforms);
  }

  // Fallback to original platforms table (backward compatibility)
  const platforms = await db.prepare(
    'SELECT * FROM platforms WHERE is_active = 1 ORDER BY name'
  ).all<Platform>();

  return c.json(platforms.results || []);
});

// Get platforms by country (explicit endpoint)
platformsRoutes.get('/country/:countryCode', async (c) => {
  const db = c.env.DB;
  const countryCode = c.req.param('countryCode').toUpperCase();
  const country = getValidCountry(countryCode);

  const countryPlatforms = await db.prepare(
    `SELECT cp.*, p.code, p.logo_url, p.website_url
     FROM country_platforms cp
     JOIN platforms p ON cp.platform_id = p.id
     WHERE cp.country_code = ? AND cp.is_active = 1
     ORDER BY cp.name_local`
  ).bind(country).all<CountryPlatform & { website_url: string }>();

  if (!countryPlatforms.results || countryPlatforms.results.length === 0) {
    return c.json({ error: 'No platforms found for this country' }, 404);
  }

  const platforms = countryPlatforms.results.map(cp => ({
    id: cp.platform_id,
    name: cp.name_local,
    code: cp.code,
    logo_url: cp.logo_url,
    website_url: cp.website_url,
    search_url_template: cp.search_url_template,
    tmdb_provider_id: cp.tmdb_provider_id,
    country_code: cp.country_code,
  }));

  return c.json(platforms);
});

// Get single platform
platformsRoutes.get('/:id', async (c) => {
  const db = c.env.DB;
  const id = parseInt(c.req.param('id'));
  const { country: countryParam } = c.req.query();
  const country = getValidCountry(countryParam);

  // Try country-specific first
  const countryPlatform = await db.prepare(
    `SELECT cp.*, p.code, p.logo_url, p.website_url
     FROM country_platforms cp
     JOIN platforms p ON cp.platform_id = p.id
     WHERE cp.platform_id = ? AND cp.country_code = ?`
  ).bind(id, country).first<CountryPlatform & { website_url: string }>();

  if (countryPlatform) {
    return c.json({
      id: countryPlatform.platform_id,
      name: countryPlatform.name_local,
      code: countryPlatform.code,
      logo_url: countryPlatform.logo_url,
      website_url: countryPlatform.website_url,
      search_url_template: countryPlatform.search_url_template,
      tmdb_provider_id: countryPlatform.tmdb_provider_id,
      country_code: countryPlatform.country_code,
    });
  }

  // Fallback to original
  const platform = await db.prepare(
    'SELECT * FROM platforms WHERE id = ?'
  ).bind(id).first<Platform>();

  if (!platform) {
    return c.json({ error: 'Platform not found' }, 404);
  }

  return c.json(platform);
});

// Get supported countries
platformsRoutes.get('/supported/countries', async (c) => {
  return c.json({
    countries: [
      { code: 'KR', name: '한국', language: 'ko' },
      { code: 'US', name: 'United States', language: 'en' },
      { code: 'JP', name: '日本', language: 'ja' },
    ]
  });
});
