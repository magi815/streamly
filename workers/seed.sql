-- Seed data for Streamly D1 Database
-- Only platforms and genres (no sample content)

-- Platforms
INSERT OR IGNORE INTO platforms (name, code, logo_url, website_url, is_active) VALUES
('넷플릭스', 'netflix', 'https://image.tmdb.org/t/p/original/wwemzKWzjKYJFfCeiB57q3r4Bcm.png', 'https://www.netflix.com', 1),
('티빙', 'tving', 'https://image.tmdb.org/t/p/original/cNi4Nv5EPsnvf5WmgwhfWDsdMUd.jpg', 'https://www.tving.com', 1),
('웨이브', 'wavve', 'https://image.tmdb.org/t/p/original/6UKUfqUCOEbCpaChyPtBqR8HR13.jpg', 'https://www.wavve.com', 1),
('쿠팡플레이', 'coupang_play', 'https://image.tmdb.org/t/p/original/7tN0sXfPK5cYIQWOLhLk4rXnsgz.jpg', 'https://www.coupangplay.com', 1),
('디즈니+', 'disney_plus', 'https://image.tmdb.org/t/p/original/7rwgEs15tFwyR9NPQ5vpzxTj19Q.jpg', 'https://www.disneyplus.com', 1),
('왓챠', 'watcha', 'https://image.tmdb.org/t/p/original/2ioan5BX5L9tz4fIGU93blTeFhv.jpg', 'https://watcha.com', 1),
('애플TV+', 'apple_tv_plus', 'https://image.tmdb.org/t/p/original/6uhKBfmtzFqOcLousHwZuzcrScK.png', 'https://tv.apple.com', 1);

-- Genres (Movie genres from TMDb)
INSERT OR IGNORE INTO genres (name, tmdb_id) VALUES
('액션', 28),
('모험', 12),
('애니메이션', 16),
('코미디', 35),
('범죄', 80),
('다큐멘터리', 99),
('드라마', 18),
('가족', 10751),
('판타지', 14),
('역사', 36),
('공포', 27),
('음악', 10402),
('미스터리', 9648),
('로맨스', 10749),
('SF', 878),
('TV 영화', 10770),
('스릴러', 53),
('전쟁', 10752),
('서부', 37);

-- TV genres from TMDb
INSERT OR IGNORE INTO genres (name, tmdb_id) VALUES
('Action & Adventure', 10759),
('Kids', 10762),
('News', 10763),
('Reality', 10764),
('Sci-Fi & Fantasy', 10765),
('Soap', 10766),
('Talk', 10767),
('War & Politics', 10768);
