-- Migration 005: Add director to translations and language_code to cast
-- Created: 2026-02-02

-- 1. Add director column to content_translations
ALTER TABLE content_translations ADD COLUMN director TEXT;

-- 2. Add language_code column to content_cast (default 'ko' for existing data)
ALTER TABLE content_cast ADD COLUMN language_code TEXT DEFAULT 'ko';

-- 3. Add tmdb_person_id for better tracking
ALTER TABLE content_cast ADD COLUMN tmdb_person_id INTEGER;

-- 4. Create index for cast language
CREATE INDEX IF NOT EXISTS idx_content_cast_language
    ON content_cast(content_id, language_code);

-- 5. Create unique constraint for content_cast (content_id, tmdb_person_id, language_code)
-- Note: SQLite doesn't support adding constraints after creation, so we use a unique index
CREATE UNIQUE INDEX IF NOT EXISTS idx_content_cast_unique
    ON content_cast(content_id, tmdb_person_id, language_code);
