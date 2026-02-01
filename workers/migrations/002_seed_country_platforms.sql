-- Migration 002: Seed country platforms data
-- Created: 2026-02-01

-- 먼저 추가 플랫폼 생성 (미국/일본 전용)
INSERT OR IGNORE INTO platforms (name, code, tmdb_provider_id, logo_url, website_url) VALUES
('Amazon Prime Video', 'amazon_prime', 9, 'https://image.tmdb.org/t/p/original/emthp39XA2YScoYL1p0sdbAH2WA.jpg', 'https://www.primevideo.com'),
('Hulu', 'hulu', 15, 'https://image.tmdb.org/t/p/original/zxrVdFjIjLqkfnwyghnfywTn3Lh.jpg', 'https://www.hulu.com'),
('Max', 'max', 384, 'https://image.tmdb.org/t/p/original/6Q3ZYUNA9Hsgj6iWnVsw2gR5V6z.jpg', 'https://www.max.com'),
('Paramount+', 'paramount_plus', 531, 'https://image.tmdb.org/t/p/original/xbhHHa1YgtpwhC8lb1NQ3ACVcLd.jpg', 'https://www.paramountplus.com'),
('U-NEXT', 'u_next', 84, 'https://image.tmdb.org/t/p/original/dNcz2AZHPEgt4BIKJe56r4visuK.jpg', 'https://video.unext.jp'),
('dTV', 'dtv', 85, 'https://image.tmdb.org/t/p/original/vLZKlXUNDcZR7ilvfY9Wr9k80FZ.jpg', 'https://video.dmkt-sp.jp');

-- 한국 (KR) 플랫폼 매핑
INSERT OR IGNORE INTO country_platforms (platform_id, country_code, tmdb_provider_id, name_local, search_url_template)
SELECT id, 'KR', 8, '넷플릭스', 'https://www.netflix.com/search?q={title}'
FROM platforms WHERE code = 'netflix';

INSERT OR IGNORE INTO country_platforms (platform_id, country_code, tmdb_provider_id, name_local, search_url_template)
SELECT id, 'KR', 1883, '티빙', 'https://www.tving.com/search?keyword={title}'
FROM platforms WHERE code = 'tving';

INSERT OR IGNORE INTO country_platforms (platform_id, country_code, tmdb_provider_id, name_local, search_url_template)
SELECT id, 'KR', 356, '웨이브', 'https://www.wavve.com/search?searchWord={title}'
FROM platforms WHERE code = 'wavve';

INSERT OR IGNORE INTO country_platforms (platform_id, country_code, tmdb_provider_id, name_local, search_url_template)
SELECT id, 'KR', 97, '왓챠', 'https://watcha.com/search?query={title}'
FROM platforms WHERE code = 'watcha';

INSERT OR IGNORE INTO country_platforms (platform_id, country_code, tmdb_provider_id, name_local, search_url_template)
SELECT id, 'KR', 2062, '쿠팡플레이', 'https://www.coupangplay.com/search?q={title}'
FROM platforms WHERE code = 'coupang_play';

INSERT OR IGNORE INTO country_platforms (platform_id, country_code, tmdb_provider_id, name_local, search_url_template)
SELECT id, 'KR', 337, '디즈니+', 'https://www.disneyplus.com/ko-kr/search?q={title}'
FROM platforms WHERE code = 'disney_plus';

INSERT OR IGNORE INTO country_platforms (platform_id, country_code, tmdb_provider_id, name_local, search_url_template)
SELECT id, 'KR', 350, 'Apple TV+', 'https://tv.apple.com/kr/search?term={title}'
FROM platforms WHERE code = 'apple_tv_plus';

-- 미국 (US) 플랫폼 매핑
INSERT OR IGNORE INTO country_platforms (platform_id, country_code, tmdb_provider_id, name_local, search_url_template)
SELECT id, 'US', 8, 'Netflix', 'https://www.netflix.com/search?q={title}'
FROM platforms WHERE code = 'netflix';

INSERT OR IGNORE INTO country_platforms (platform_id, country_code, tmdb_provider_id, name_local, search_url_template)
SELECT id, 'US', 9, 'Amazon Prime Video', 'https://www.amazon.com/s?k={title}&i=instant-video'
FROM platforms WHERE code = 'amazon_prime';

INSERT OR IGNORE INTO country_platforms (platform_id, country_code, tmdb_provider_id, name_local, search_url_template)
SELECT id, 'US', 337, 'Disney+', 'https://www.disneyplus.com/search?q={title}'
FROM platforms WHERE code = 'disney_plus';

INSERT OR IGNORE INTO country_platforms (platform_id, country_code, tmdb_provider_id, name_local, search_url_template)
SELECT id, 'US', 15, 'Hulu', 'https://www.hulu.com/search?q={title}'
FROM platforms WHERE code = 'hulu';

INSERT OR IGNORE INTO country_platforms (platform_id, country_code, tmdb_provider_id, name_local, search_url_template)
SELECT id, 'US', 384, 'Max', 'https://www.max.com/search?q={title}'
FROM platforms WHERE code = 'max';

INSERT OR IGNORE INTO country_platforms (platform_id, country_code, tmdb_provider_id, name_local, search_url_template)
SELECT id, 'US', 350, 'Apple TV+', 'https://tv.apple.com/us/search?term={title}'
FROM platforms WHERE code = 'apple_tv_plus';

INSERT OR IGNORE INTO country_platforms (platform_id, country_code, tmdb_provider_id, name_local, search_url_template)
SELECT id, 'US', 531, 'Paramount+', 'https://www.paramountplus.com/search/?q={title}'
FROM platforms WHERE code = 'paramount_plus';

-- 일본 (JP) 플랫폼 매핑
INSERT OR IGNORE INTO country_platforms (platform_id, country_code, tmdb_provider_id, name_local, search_url_template)
SELECT id, 'JP', 8, 'Netflix', 'https://www.netflix.com/search?q={title}'
FROM platforms WHERE code = 'netflix';

INSERT OR IGNORE INTO country_platforms (platform_id, country_code, tmdb_provider_id, name_local, search_url_template)
SELECT id, 'JP', 9, 'Amazon Prime Video', 'https://www.amazon.co.jp/s?k={title}&i=instant-video'
FROM platforms WHERE code = 'amazon_prime';

INSERT OR IGNORE INTO country_platforms (platform_id, country_code, tmdb_provider_id, name_local, search_url_template)
SELECT id, 'JP', 84, 'U-NEXT', 'https://video.unext.jp/search?query={title}'
FROM platforms WHERE code = 'u_next';

INSERT OR IGNORE INTO country_platforms (platform_id, country_code, tmdb_provider_id, name_local, search_url_template)
SELECT id, 'JP', 85, 'dTV', 'https://video.dmkt-sp.jp/search?keyword={title}'
FROM platforms WHERE code = 'dtv';

INSERT OR IGNORE INTO country_platforms (platform_id, country_code, tmdb_provider_id, name_local, search_url_template)
SELECT id, 'JP', 15, 'Hulu', 'https://www.hulu.jp/search?q={title}'
FROM platforms WHERE code = 'hulu';

INSERT OR IGNORE INTO country_platforms (platform_id, country_code, tmdb_provider_id, name_local, search_url_template)
SELECT id, 'JP', 337, 'Disney+', 'https://www.disneyplus.com/ja-jp/search?q={title}'
FROM platforms WHERE code = 'disney_plus';
