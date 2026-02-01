-- Migration 004: Fix content_platforms UNIQUE constraint to include country_code
-- Created: 2026-02-01
-- Purpose: Allow same content+platform combination for different countries

-- 1. Create new table with correct UNIQUE constraint
CREATE TABLE IF NOT EXISTS content_platforms_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    content_id INTEGER NOT NULL,
    platform_id INTEGER NOT NULL,
    country_code TEXT DEFAULT 'KR',
    available_from TEXT,
    FOREIGN KEY (content_id) REFERENCES contents(id) ON DELETE CASCADE,
    FOREIGN KEY (platform_id) REFERENCES platforms(id) ON DELETE CASCADE,
    UNIQUE(content_id, platform_id, country_code)
);

-- 2. Copy existing data
INSERT OR IGNORE INTO content_platforms_new (id, content_id, platform_id, country_code, available_from)
SELECT id, content_id, platform_id, COALESCE(country_code, 'KR'), available_from FROM content_platforms;

-- 3. Drop old table
DROP TABLE content_platforms;

-- 4. Rename new table
ALTER TABLE content_platforms_new RENAME TO content_platforms;

-- 5. Recreate index
CREATE INDEX IF NOT EXISTS idx_content_platforms_country ON content_platforms(country_code);
CREATE INDEX IF NOT EXISTS idx_content_platforms_content ON content_platforms(content_id);
