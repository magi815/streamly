-- Seed data for Streamly D1 Database

-- Platforms
INSERT INTO platforms (name, code, logo_url, website_url, is_active) VALUES
('넷플릭스', 'netflix', 'https://image.tmdb.org/t/p/original/wwemzKWzjKYJFfCeiB57q3r4Bcm.png', 'https://www.netflix.com', 1),
('티빙', 'tving', null, 'https://www.tving.com', 1),
('웨이브', 'wavve', null, 'https://www.wavve.com', 1),
('쿠팡플레이', 'coupang', null, 'https://www.coupangplay.com', 1),
('디즈니+', 'disney', 'https://image.tmdb.org/t/p/original/7Fl8ylPDclt3ZYgNbW2t7dHBQQK.png', 'https://www.disneyplus.com', 1),
('왓챠', 'watcha', null, 'https://watcha.com', 1),
('시즌', 'seezn', null, 'https://www.seezntv.com', 1),
('애플TV+', 'appletv', 'https://image.tmdb.org/t/p/original/6uhKBfmtzFqOcLousHwZuzcrScK.png', 'https://tv.apple.com', 1);

-- Genres
INSERT INTO genres (name, tmdb_id) VALUES
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

-- Sample movies
INSERT INTO contents (tmdb_id, title, title_en, content_type, poster_url, backdrop_url, overview, release_date, rating, popularity, runtime, director, vote_count) VALUES
(1022789, '파묘', 'Exhuma', 'movie', 'https://image.tmdb.org/t/p/w500/eH9XHJmGO8i7NJWU3p3J9JxwLel.jpg', 'https://image.tmdb.org/t/p/original/eH9XHJmGO8i7NJWU3p3J9JxwLel.jpg', '미국 LA, 거액의 의뢰를 받은 무당 화림과 봉길은 기이한 병이 대물림되는 집안의 장손을 만난다.', '2024-02-22', 8.2, 95.5, 134, '장재현', 1520),
(1001311, '범죄도시 4', 'The Roundup: Punishment', 'movie', 'https://image.tmdb.org/t/p/w500/aK6lX5pLAhWqfEbgWLXOHx17Nwd.jpg', null, '괴물형사 마석도가 신종 온라인 범죄 조직과 맞서 싸운다.', '2024-04-24', 7.8, 88.2, 109, '허명행', 980),
(693134, '듄: 파트 2', 'Dune: Part Two', 'movie', 'https://image.tmdb.org/t/p/w500/8b8R8l88Qje9dn9OE8PY05Nxl1X.jpg', null, '폴 아트레이데스가 프레멘과 함께 하코넨에 맞서 싸운다.', '2024-02-28', 8.5, 92.1, 166, '드니 빌뇌브', 2500),
(1011985, '쿵푸팬더 4', 'Kung Fu Panda 4', 'movie', 'https://image.tmdb.org/t/p/w500/kDp1vUBnMpe8ak4rjgl3cLELqjU.jpg', null, '드래곤 워리어 포가 새로운 악당과 맞서 싸운다.', '2024-03-08', 7.2, 78.5, 94, '마이크 미첼', 1200),
(872585, '오펜하이머', 'Oppenheimer', 'movie', 'https://image.tmdb.org/t/p/w500/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg', null, '원자폭탄 개발을 이끈 물리학자 로버트 오펜하이머의 이야기.', '2023-07-21', 8.4, 85.3, 180, '크리스토퍼 놀란', 8500),
(447365, '가디언즈 오브 갤럭시 Vol.3', 'Guardians of the Galaxy Vol. 3', 'movie', 'https://image.tmdb.org/t/p/w500/r2J02Z2OpNTctfOSN1Ydgii51I3.jpg', null, '가디언즈가 로켓의 과거를 마주하며 마지막 모험을 떠난다.', '2023-05-03', 8.0, 82.1, 150, '제임스 건', 4500);

-- Sample dramas
INSERT INTO contents (tmdb_id, title, title_en, content_type, poster_url, backdrop_url, overview, release_date, rating, popularity) VALUES
(227167, '눈물의 여왕', 'Queen of Tears', 'drama', 'https://image.tmdb.org/t/p/w500/cTsAZ5WJsjTbKSdLGO7swhPJplz.jpg', null, '재벌가의 여왕과 그녀의 남편이 위기를 극복해 나가는 이야기.', '2024-03-09', 8.8, 98.5),
(241691, '선재 업고 튀어', 'Lovely Runner', 'drama', 'https://image.tmdb.org/t/p/w500/7i1cKoLUl7x4XfGxKb9Cjgxc3gT.jpg', null, '과거로 돌아가 첫사랑을 구하려는 여자의 이야기.', '2024-04-08', 9.1, 96.2),
(246452, '정년이', 'Jeongnyeon: The Star is Born', 'drama', 'https://image.tmdb.org/t/p/w500/A53bO3pInGTyPwV5zPvzLKM3Yxr.jpg', null, '일제강점기 기생들의 이야기.', '2024-10-12', 8.5, 89.3),
(203624, '무빙', 'Moving', 'drama', 'https://image.tmdb.org/t/p/w500/bKsxJ8ChE8xGS2fOSs0GL98j0qH.jpg', null, '초능력을 숨기고 살아가는 아이들과 그들의 부모 이야기.', '2023-08-09', 8.9, 94.1),
(197067, '이상한 변호사 우영우', 'Extraordinary Attorney Woo', 'drama', 'https://image.tmdb.org/t/p/w500/3deMHEuKpkZV3nYOSFNRi7PLpNH.jpg', null, '자폐 스펙트럼을 가진 천재 변호사의 성장 이야기.', '2022-06-29', 8.7, 91.5),
(153312, '더 글로리', 'The Glory', 'drama', 'https://image.tmdb.org/t/p/w500/ea4T78MQDV4WfOFU0iKnzoQmRY7.jpg', null, '학교 폭력 피해자의 처절한 복수극.', '2022-12-30', 8.6, 93.8);

-- Content-Genre relationships (sample)
INSERT INTO content_genres (content_id, genre_id)
SELECT c.id, g.id FROM contents c, genres g WHERE c.title = '파묘' AND g.name IN ('액션', '드라마');

INSERT INTO content_genres (content_id, genre_id)
SELECT c.id, g.id FROM contents c, genres g WHERE c.title = '범죄도시 4' AND g.name IN ('액션', '코미디');

INSERT INTO content_genres (content_id, genre_id)
SELECT c.id, g.id FROM contents c, genres g WHERE c.title = '듄: 파트 2' AND g.name IN ('SF', '액션');

INSERT INTO content_genres (content_id, genre_id)
SELECT c.id, g.id FROM contents c, genres g WHERE c.title = '눈물의 여왕' AND g.name IN ('드라마', '로맨스');

INSERT INTO content_genres (content_id, genre_id)
SELECT c.id, g.id FROM contents c, genres g WHERE c.title = '선재 업고 튀어' AND g.name IN ('로맨스', '드라마');

-- Content cast (sample)
INSERT INTO content_cast (content_id, name, character_name, order_num)
SELECT id, '최민식', '김상덕', 0 FROM contents WHERE title = '파묘';
INSERT INTO content_cast (content_id, name, character_name, order_num)
SELECT id, '김고은', '화림', 1 FROM contents WHERE title = '파묘';
INSERT INTO content_cast (content_id, name, character_name, order_num)
SELECT id, '유해진', '봉길', 2 FROM contents WHERE title = '파묘';
INSERT INTO content_cast (content_id, name, character_name, order_num)
SELECT id, '이도현', '봉길 제자', 3 FROM contents WHERE title = '파묘';

INSERT INTO content_cast (content_id, name, character_name, order_num)
SELECT id, '마동석', '마석도', 0 FROM contents WHERE title = '범죄도시 4';
INSERT INTO content_cast (content_id, name, character_name, order_num)
SELECT id, '김무열', '백창기', 1 FROM contents WHERE title = '범죄도시 4';

-- YouTube reviews (sample)
INSERT INTO youtube_reviews (content_id, video_id, title, channel_name, thumbnail_url, view_count, is_featured, published_at, youtube_url)
SELECT id, 'abc123', '[스포주의] 파묘 완벽 해석 - 숨겨진 의미와 복선 총정리', '영화리뷰채널', 'https://i.ytimg.com/vi/abc123/maxresdefault.jpg', 1520000, 1, '2024-03-01T10:00:00Z', 'https://www.youtube.com/watch?v=abc123' FROM contents WHERE title = '파묘';

INSERT INTO youtube_reviews (content_id, video_id, title, channel_name, thumbnail_url, view_count, is_featured, published_at, youtube_url)
SELECT id, 'def456', '파묘가 천만 간 이유 - 한국 호러의 새 역사', '씨네타운', 'https://i.ytimg.com/vi/def456/maxresdefault.jpg', 890000, 0, '2024-03-15T14:30:00Z', 'https://www.youtube.com/watch?v=def456' FROM contents WHERE title = '파묘';

INSERT INTO youtube_reviews (content_id, video_id, title, channel_name, thumbnail_url, view_count, is_featured, published_at, youtube_url)
SELECT id, 'jkl012', '눈물의 여왕 1-8화 몰아보기 리뷰 (김수현x김지원 케미 미쳤다)', '드라마딕', 'https://i.ytimg.com/vi/jkl012/maxresdefault.jpg', 2100000, 1, '2024-04-01T12:00:00Z', 'https://www.youtube.com/watch?v=jkl012' FROM contents WHERE title = '눈물의 여왕';
