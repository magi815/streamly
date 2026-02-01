/**
 * TMDb 데이터 수집 스크립트
 * 로컬에서 실행하여 SQL 파일 생성 후 D1에 업로드
 *
 * 사용법:
 *   node scripts/collect-data.js
 *   npx wrangler d1 execute streamly-db --remote --file=scripts/collected-data.sql
 */

const fs = require('fs');
const path = require('path');

const TMDB_API_KEY = '74b85514826f0c6ea02fd2d55cff5298';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

// 한국 OTT 플랫폼
const KOREAN_PROVIDERS = {
  8: { name: 'Netflix', code: 'netflix', logo: '/t2yyOv40HZeVlLjYsCsPHnWLk4W.jpg' },
  97: { name: 'Watcha', code: 'watcha', logo: '/2ioan5BX5L9tz4fIGU93blTeFhv.jpg' },
  356: { name: 'Wavve', code: 'wavve', logo: '/6UKUfqUCOEbCpaChyPtBqR8HR13.jpg' },
  337: { name: 'Disney+', code: 'disney_plus', logo: '/7rwgEs15tFwyR9NPQ5vpzxTj19Q.jpg' },
  350: { name: 'Apple TV+', code: 'apple_tv_plus', logo: '/6uhKBfmtzFqOcLousHwZuzcrScK.jpg' },
  1883: { name: 'TVING', code: 'tving', logo: '/cNi4Nv5EPsnvf5WmgwhfWDsdMUd.jpg' },
  2062: { name: 'Coupang Play', code: 'coupang_play', logo: '/7tN0sXfPK5cYIQWOLhLk4rXnsgz.jpg' },
};

// 수집된 데이터 저장
const collectedContents = new Map();
const contentGenres = [];
const contentPlatforms = [];
const contentCast = [];

// 유틸리티 함수
function escapeSQL(str) {
  if (str === null || str === undefined) return 'NULL';
  return `'${String(str).replace(/'/g, "''")}'`;
}

async function fetchTMDb(endpoint) {
  const url = `${TMDB_BASE_URL}${endpoint}${endpoint.includes('?') ? '&' : '?'}api_key=${TMDB_API_KEY}&language=ko-KR`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`TMDb API error: ${res.status}`);
  return res.json();
}

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 영화 수집
async function collectMovies(pages = 20) {
  console.log(`\n📽️ Collecting movies (${pages} pages)...`);
  let collected = 0;

  for (let page = 1; page <= pages; page++) {
    try {
      const data = await fetchTMDb(`/movie/popular?page=${page}&region=KR`);

      for (const movie of data.results || []) {
        if (collectedContents.has(`movie-${movie.id}`)) continue;

        // 상세 정보 가져오기
        let detail = null;
        try {
          detail = await fetchTMDb(`/movie/${movie.id}?append_to_response=credits`);
        } catch (e) {
          console.log(`  ⚠️ Failed to get details for movie ${movie.id}`);
        }

        const content = {
          tmdb_id: movie.id,
          title: movie.title || '',
          title_en: movie.original_title || '',
          content_type: 'movie',
          poster_url: movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : null,
          backdrop_url: movie.backdrop_path ? `https://image.tmdb.org/t/p/original${movie.backdrop_path}` : null,
          overview: movie.overview || '',
          release_date: movie.release_date || null,
          rating: movie.vote_average || 0,
          popularity: movie.popularity || 0,
          runtime: detail?.runtime || null,
          director: detail?.credits?.crew?.find(c => c.job === 'Director')?.name || null,
          vote_count: movie.vote_count || 0,
          is_adult: movie.adult ? 1 : 0,
          genres: movie.genre_ids || [],
          cast: detail?.credits?.cast?.slice(0, 10).map(c => c.name) || [],
        };

        collectedContents.set(`movie-${movie.id}`, content);
        collected++;
      }

      console.log(`  Page ${page}/${pages} - Total collected: ${collected}`);
      await delay(250); // Rate limiting
    } catch (error) {
      console.error(`  Error on page ${page}:`, error.message);
    }
  }

  console.log(`✅ Movies collected: ${collected}`);
  return collected;
}

// 드라마 수집
async function collectDramas(pages = 20) {
  console.log(`\n📺 Collecting dramas (${pages} pages)...`);
  let collected = 0;

  for (let page = 1; page <= pages; page++) {
    try {
      const data = await fetchTMDb(`/tv/popular?page=${page}&region=KR`);

      for (const drama of data.results || []) {
        if (collectedContents.has(`drama-${drama.id}`)) continue;

        // 상세 정보 가져오기
        let detail = null;
        try {
          detail = await fetchTMDb(`/tv/${drama.id}?append_to_response=credits`);
        } catch (e) {
          console.log(`  ⚠️ Failed to get details for drama ${drama.id}`);
        }

        const content = {
          tmdb_id: drama.id,
          title: drama.name || '',
          title_en: drama.original_name || '',
          content_type: 'drama',
          poster_url: drama.poster_path ? `https://image.tmdb.org/t/p/w500${drama.poster_path}` : null,
          backdrop_url: drama.backdrop_path ? `https://image.tmdb.org/t/p/original${drama.backdrop_path}` : null,
          overview: drama.overview || '',
          release_date: drama.first_air_date || null,
          rating: drama.vote_average || 0,
          popularity: drama.popularity || 0,
          runtime: detail?.episode_run_time?.[0] || null,
          director: detail?.created_by?.[0]?.name || null,
          vote_count: drama.vote_count || 0,
          is_adult: drama.adult ? 1 : 0,
          genres: drama.genre_ids || [],
          cast: detail?.credits?.cast?.slice(0, 10).map(c => c.name) || [],
        };

        collectedContents.set(`drama-${drama.id}`, content);
        collected++;
      }

      console.log(`  Page ${page}/${pages} - Total collected: ${collected}`);
      await delay(250);
    } catch (error) {
      console.error(`  Error on page ${page}:`, error.message);
    }
  }

  console.log(`✅ Dramas collected: ${collected}`);
  return collected;
}

// 한국 콘텐츠 수집
async function collectKoreanContent(pages = 10) {
  console.log(`\n🇰🇷 Collecting Korean content (${pages} pages each)...`);
  let collected = 0;

  // 한국 영화
  for (let page = 1; page <= pages; page++) {
    try {
      const data = await fetchTMDb(`/discover/movie?with_origin_country=KR&sort_by=popularity.desc&page=${page}`);

      for (const movie of data.results || []) {
        if (collectedContents.has(`movie-${movie.id}`)) continue;

        let detail = null;
        try {
          detail = await fetchTMDb(`/movie/${movie.id}?append_to_response=credits`);
        } catch (e) {}

        const content = {
          tmdb_id: movie.id,
          title: movie.title || '',
          title_en: movie.original_title || '',
          content_type: 'movie',
          poster_url: movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : null,
          backdrop_url: movie.backdrop_path ? `https://image.tmdb.org/t/p/original${movie.backdrop_path}` : null,
          overview: movie.overview || '',
          release_date: movie.release_date || null,
          rating: movie.vote_average || 0,
          popularity: movie.popularity || 0,
          runtime: detail?.runtime || null,
          director: detail?.credits?.crew?.find(c => c.job === 'Director')?.name || null,
          vote_count: movie.vote_count || 0,
          is_adult: movie.adult ? 1 : 0,
          genres: movie.genre_ids || [],
          cast: detail?.credits?.cast?.slice(0, 10).map(c => c.name) || [],
        };

        collectedContents.set(`movie-${movie.id}`, content);
        collected++;
      }

      console.log(`  Korean movies page ${page}/${pages}`);
      await delay(250);
    } catch (error) {
      console.error(`  Error:`, error.message);
    }
  }

  // 한국 드라마
  for (let page = 1; page <= pages; page++) {
    try {
      const data = await fetchTMDb(`/discover/tv?with_origin_country=KR&sort_by=popularity.desc&page=${page}`);

      for (const drama of data.results || []) {
        if (collectedContents.has(`drama-${drama.id}`)) continue;

        let detail = null;
        try {
          detail = await fetchTMDb(`/tv/${drama.id}?append_to_response=credits`);
        } catch (e) {}

        const content = {
          tmdb_id: drama.id,
          title: drama.name || '',
          title_en: drama.original_name || '',
          content_type: 'drama',
          poster_url: drama.poster_path ? `https://image.tmdb.org/t/p/w500${drama.poster_path}` : null,
          backdrop_url: drama.backdrop_path ? `https://image.tmdb.org/t/p/original${drama.backdrop_path}` : null,
          overview: drama.overview || '',
          release_date: drama.first_air_date || null,
          rating: drama.vote_average || 0,
          popularity: drama.popularity || 0,
          runtime: detail?.episode_run_time?.[0] || null,
          director: detail?.created_by?.[0]?.name || null,
          vote_count: drama.vote_count || 0,
          is_adult: drama.adult ? 1 : 0,
          genres: drama.genre_ids || [],
          cast: detail?.credits?.cast?.slice(0, 10).map(c => c.name) || [],
        };

        collectedContents.set(`drama-${drama.id}`, content);
        collected++;
      }

      console.log(`  Korean dramas page ${page}/${pages}`);
      await delay(250);
    } catch (error) {
      console.error(`  Error:`, error.message);
    }
  }

  console.log(`✅ Korean content collected: ${collected}`);
  return collected;
}

// Watch Providers 수집
async function collectWatchProviders() {
  console.log(`\n🎬 Collecting watch providers...`);
  let collected = 0;
  let processed = 0;

  for (const [key, content] of collectedContents) {
    const mediaType = content.content_type === 'movie' ? 'movie' : 'tv';

    try {
      const data = await fetchTMDb(`/${mediaType}/${content.tmdb_id}/watch/providers`);
      const krProviders = data.results?.KR?.flatrate || [];

      content.providers = [];
      for (const provider of krProviders) {
        if (KOREAN_PROVIDERS[provider.provider_id]) {
          content.providers.push(KOREAN_PROVIDERS[provider.provider_id].code);
          collected++;
        }
      }

      processed++;
      if (processed % 50 === 0) {
        console.log(`  Processed ${processed}/${collectedContents.size} - Providers found: ${collected}`);
      }

      await delay(100);
    } catch (error) {
      // Ignore errors
    }
  }

  console.log(`✅ Watch providers collected: ${collected}`);
  return collected;
}

// SQL 파일 생성
function generateSQL() {
  console.log(`\n📝 Generating SQL file...`);

  let sql = `-- Streamly Data Collection
-- Generated at: ${new Date().toISOString()}
-- Total contents: ${collectedContents.size}

`;

  // 1. 플랫폼 데이터
  sql += `-- Platforms\n`;
  for (const [providerId, info] of Object.entries(KOREAN_PROVIDERS)) {
    sql += `INSERT OR REPLACE INTO platforms (name, code, tmdb_provider_id, logo_url) VALUES (${escapeSQL(info.name)}, ${escapeSQL(info.code)}, ${providerId}, ${escapeSQL(`https://image.tmdb.org/t/p/original${info.logo}`)});\n`;
  }
  sql += '\n';

  // 2. 콘텐츠 데이터
  sql += `-- Contents\n`;
  for (const [key, content] of collectedContents) {
    sql += `INSERT OR REPLACE INTO contents (tmdb_id, title, title_en, content_type, poster_url, backdrop_url, overview, release_date, rating, popularity, runtime, director, vote_count, is_adult) VALUES (${content.tmdb_id}, ${escapeSQL(content.title)}, ${escapeSQL(content.title_en)}, ${escapeSQL(content.content_type)}, ${escapeSQL(content.poster_url)}, ${escapeSQL(content.backdrop_url)}, ${escapeSQL(content.overview)}, ${content.release_date ? escapeSQL(content.release_date) : 'NULL'}, ${content.rating}, ${content.popularity}, ${content.runtime || 'NULL'}, ${escapeSQL(content.director)}, ${content.vote_count}, ${content.is_adult});\n`;
  }
  sql += '\n';

  // 3. 장르 연결 (genre_ids를 바탕으로)
  sql += `-- Content-Genre relations (will be added after content IDs are assigned)\n`;
  sql += `-- Note: Run this after contents are inserted\n`;
  for (const [key, content] of collectedContents) {
    for (const genreId of content.genres || []) {
      sql += `INSERT OR IGNORE INTO content_genres (content_id, genre_id) SELECT c.id, g.id FROM contents c, genres g WHERE c.tmdb_id = ${content.tmdb_id} AND c.content_type = ${escapeSQL(content.content_type)} AND g.tmdb_id = ${genreId};\n`;
    }
  }
  sql += '\n';

  // 4. 플랫폼 연결
  sql += `-- Content-Platform relations\n`;
  for (const [key, content] of collectedContents) {
    for (const providerCode of content.providers || []) {
      sql += `INSERT OR IGNORE INTO content_platforms (content_id, platform_id) SELECT c.id, p.id FROM contents c, platforms p WHERE c.tmdb_id = ${content.tmdb_id} AND c.content_type = ${escapeSQL(content.content_type)} AND p.code = ${escapeSQL(providerCode)};\n`;
    }
  }
  sql += '\n';

  // 5. 캐스트 정보
  sql += `-- Cast information\n`;
  for (const [key, content] of collectedContents) {
    let order = 0;
    for (const castName of content.cast || []) {
      sql += `INSERT OR IGNORE INTO content_cast (content_id, name, order_num) SELECT c.id, ${escapeSQL(castName)}, ${order} FROM contents c WHERE c.tmdb_id = ${content.tmdb_id} AND c.content_type = ${escapeSQL(content.content_type)};\n`;
      order++;
    }
  }

  const outputPath = path.join(__dirname, 'collected-data.sql');
  fs.writeFileSync(outputPath, sql, { encoding: 'utf8' });
  console.log(`✅ SQL file saved: ${outputPath}`);
  console.log(`   File size: ${(fs.statSync(outputPath).size / 1024 / 1024).toFixed(2)} MB`);

  return outputPath;
}

// 메인 실행
async function main() {
  console.log('🚀 Starting TMDb data collection...\n');
  console.log('Settings:');
  console.log('  - Movies: 20 pages');
  console.log('  - Dramas: 20 pages');
  console.log('  - Korean content: 10 pages each\n');

  const startTime = Date.now();

  try {
    await collectMovies(20);
    await collectDramas(20);
    await collectKoreanContent(10);
    await collectWatchProviders();

    const sqlPath = generateSQL();

    const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
    console.log(`\n🎉 Collection complete!`);
    console.log(`   Total contents: ${collectedContents.size}`);
    console.log(`   Time elapsed: ${elapsed} minutes`);
    console.log(`\n📤 To upload to D1, run:`);
    console.log(`   cd workers`);
    console.log(`   npx wrangler d1 execute streamly-db --remote --file=scripts/collected-data.sql`);

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

main();
