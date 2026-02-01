-- Migration 001: Add multi-country and i18n support
-- Created: 2026-02-01

-- 1. content_translations 테이블 생성 (언어별 제목/설명/포스터)
CREATE TABLE IF NOT EXISTS content_translations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    content_id INTEGER NOT NULL,
    language_code TEXT NOT NULL CHECK(language_code IN ('ko', 'en', 'ja')),
    title TEXT NOT NULL,
    overview TEXT,
    poster_path TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (content_id) REFERENCES contents(id) ON DELETE CASCADE,
    UNIQUE(content_id, language_code)
);

-- 2. country_platforms 테이블 생성 (국가별 OTT 플랫폼 매핑)
CREATE TABLE IF NOT EXISTS country_platforms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    platform_id INTEGER NOT NULL,
    country_code TEXT NOT NULL CHECK(country_code IN ('KR', 'US', 'JP')),
    tmdb_provider_id INTEGER NOT NULL,
    name_local TEXT NOT NULL,
    search_url_template TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (platform_id) REFERENCES platforms(id) ON DELETE CASCADE,
    UNIQUE(platform_id, country_code)
);

-- 3. 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_content_translations_content_id
    ON content_translations(content_id);
CREATE INDEX IF NOT EXISTS idx_content_translations_language
    ON content_translations(language_code);
CREATE INDEX IF NOT EXISTS idx_country_platforms_country
    ON country_platforms(country_code);
CREATE INDEX IF NOT EXISTS idx_country_platforms_platform
    ON country_platforms(platform_id);

-- 4. 기존 한국 데이터 마이그레이션 (contents → content_translations)
INSERT OR IGNORE INTO content_translations (content_id, language_code, title, overview, poster_path)
SELECT id, 'ko', title, overview, poster_url
FROM contents
WHERE title IS NOT NULL;
