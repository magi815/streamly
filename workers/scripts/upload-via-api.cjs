/**
 * Upload collected data via Worker API
 * This bypasses the D1 wrangler execute which seems to have caching issues
 */

const fs = require('fs');
const path = require('path');

const API_BASE = 'https://streamly-api.magi815.workers.dev/api/v1/admin';

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function uploadPlatforms() {
  console.log('📤 Uploading platforms via API...');

  const providers = {
    8: { name: 'Netflix', code: 'netflix', logo: '/t2yyOv40HZeVlLjYsCsPHnWLk4W.jpg' },
    97: { name: 'Watcha', code: 'watcha', logo: '/2ioan5BX5L9tz4fIGU93blTeFhv.jpg' },
    337: { name: 'Disney+', code: 'disney_plus', logo: '/7rwgEs15tFwyR9NPQ5vpzxTj19Q.jpg' },
    350: { name: 'Apple TV+', code: 'apple_tv_plus', logo: '/6uhKBfmtzFqOcLousHwZuzcrScK.jpg' },
    356: { name: 'Wavve', code: 'wavve', logo: '/6UKUfqUCOEbCpaChyPtBqR8HR13.jpg' },
    1883: { name: 'TVING', code: 'tving', logo: '/cNi4Nv5EPsnvf5WmgwhfWDsdMUd.jpg' },
    2062: { name: 'Coupang Play', code: 'coupang_play', logo: '/7tN0sXfPK5cYIQWOLhLk4rXnsgz.jpg' },
  };

  // The Worker's collect-watch-providers endpoint handles platform creation
  const res = await fetch(`${API_BASE}/collect-watch-providers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ offset: 0, limit: 1 })  // Just to create platforms
  });

  console.log('Platform setup:', await res.json());
}

async function uploadMovies(pages = 5) {
  console.log(`\n📽️ Uploading movies (${pages} pages)...`);
  let collected = 0;

  for (let i = 0; i < pages; i++) {
    const res = await fetch(`${API_BASE}/collect-movies`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pages: 1 })  // 1 page at a time
    });

    const result = await res.json();
    collected += result.collected || 0;
    console.log(`  Page ${i + 1}/${pages}: collected=${result.collected || 0}`);
    await delay(2000);  // Wait between requests
  }

  console.log(`✅ Movies collected: ${collected}`);
}

async function uploadDramas(pages = 5) {
  console.log(`\n📺 Uploading dramas (${pages} pages)...`);
  let collected = 0;

  for (let i = 0; i < pages; i++) {
    const res = await fetch(`${API_BASE}/collect-dramas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pages: 1 })
    });

    const result = await res.json();
    collected += result.collected || 0;
    console.log(`  Page ${i + 1}/${pages}: collected=${result.collected || 0}`);
    await delay(2000);
  }

  console.log(`✅ Dramas collected: ${collected}`);
}

async function uploadKoreanContent(pages = 5) {
  console.log(`\n🇰🇷 Uploading Korean content (${pages} pages each)...`);
  let collected = 0;

  for (let i = 0; i < pages; i++) {
    const res = await fetch(`${API_BASE}/collect-korean-origin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pages: 1 })
    });

    const result = await res.json();
    collected += (result.partial?.movies || 0) + (result.partial?.dramas || 0);
    console.log(`  Page ${i + 1}/${pages}: movies=${result.partial?.movies || 0}, dramas=${result.partial?.dramas || 0}`);
    await delay(2000);
  }

  console.log(`✅ Korean content collected: ${collected}`);
}

async function uploadWatchProviders() {
  console.log('\n🎬 Uploading watch providers...');

  let offset = 0;
  const limit = 30;
  let totalCollected = 0;

  while (true) {
    try {
      const res = await fetch(`${API_BASE}/collect-watch-providers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ offset, limit })
      });

      const data = await res.json();

      if (data.error) {
        console.log('  Error:', data.error);
        break;
      }

      totalCollected += data.collected || 0;
      console.log(`  Offset ${offset}: processed=${data.processed}, collected=${data.collected}, total=${totalCollected}`);

      if (!data.nextOffset) {
        break;
      }

      offset = data.nextOffset;
      await delay(1000);  // Rate limiting
    } catch (error) {
      console.log('  Error:', error.message);
      break;
    }
  }

  console.log(`✅ Watch providers uploaded: ${totalCollected}`);
}

async function main() {
  console.log('🚀 Uploading data via Worker API...\n');

  try {
    // Collect content 1 page at a time to avoid Worker timeouts
    await uploadMovies(10);  // 10 pages = ~200 movies
    await delay(3000);

    await uploadDramas(10);  // 10 pages = ~200 dramas
    await delay(3000);

    await uploadKoreanContent(5);  // 5 pages each = ~100 Korean content
    await delay(3000);

    await uploadWatchProviders();

    // Check stats
    const statsRes = await fetch(`${API_BASE}/stats`);
    const stats = await statsRes.json();
    console.log('\n📊 Final stats:', stats);

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

main();
