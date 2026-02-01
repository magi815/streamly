-- Migration 003: Add country_code columns to content_platforms and youtube_reviews
-- Created: 2026-02-01
-- Purpose: Enable country-specific filtering for platform availability and reviews

-- 1. Add country_code to content_platforms table
ALTER TABLE content_platforms ADD COLUMN country_code TEXT DEFAULT 'KR';

-- 2. Add country_code to youtube_reviews table
ALTER TABLE youtube_reviews ADD COLUMN country_code TEXT DEFAULT 'KR';

-- 3. Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_content_platforms_country ON content_platforms(country_code);
CREATE INDEX IF NOT EXISTS idx_youtube_reviews_country ON youtube_reviews(country_code);
