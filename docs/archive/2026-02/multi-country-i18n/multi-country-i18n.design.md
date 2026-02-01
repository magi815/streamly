# Design Document: Multi-Country & i18n Expansion

> 다국가 콘텐츠 및 다국어 지원 확장 - 상세 설계

## 1. Document Info

| 항목 | 내용 |
|------|------|
| **Feature Name** | multi-country-i18n |
| **Plan Reference** | [multi-country-i18n.plan.md](../01-plan/features/multi-country-i18n.plan.md) |
| **Version** | v1.0.0 |
| **Created** | 2026-02-01 |
| **Status** | Design |

### 1.1 결정된 사항 (Plan에서 승인됨)

| 항목 | 결정 |
|------|------|
| 기본 언어 정책 | 브라우저 언어 감지 (Accept-Language) |
| 콘텐츠 중복 처리 | 언어별로 포스터/제목/내용 별도 저장 |
| 리뷰 언어 | 국가별로 콘텐츠별 리뷰 별도 처리 |
| URL 리다이렉트 | `/movies` → `/ko/movies` 자동 리다이렉트 |
| Workers 배포 | 단일 Worker로 통합 관리 |

---

## 2. System Architecture

### 2.1 전체 시스템 구조

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              Client Browser                              │
│  Accept-Language: ko-KR, en-US, ja-JP                                   │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        Next.js Middleware                                │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  1. Accept-Language 헤더 파싱                                     │   │
│  │  2. 지원 로케일 매칭 (ko, en, ja)                                 │   │
│  │  3. /movies → /ko/movies 리다이렉트                               │   │
│  │  4. 쿠키에 NEXT_LOCALE 저장                                       │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                     Next.js App Router                                   │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │  app/[locale]/                                                     │ │
│  │  ├── layout.tsx        (NextIntlClientProvider)                   │ │
│  │  ├── page.tsx          (홈)                                        │ │
│  │  ├── movies/page.tsx                                              │ │
│  │  ├── dramas/page.tsx                                              │ │
│  │  ├── trending/page.tsx                                            │ │
│  │  ├── new-releases/page.tsx                                        │ │
│  │  ├── search/page.tsx                                              │ │
│  │  └── content/[id]/page.tsx                                        │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│  messages/                                                              │
│  ├── ko.json              (한국어 번역)                                │
│  ├── en.json              (영어 번역)                                  │
│  └── ja.json              (일본어 번역)                                │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        API Layer (Cloudflare Workers)                    │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │  GET /api/v1/contents?country=KR&language=ko                      │ │
│  │  GET /api/v1/contents/:id?language=ko                             │ │
│  │  GET /api/v1/platforms?country=KR                                 │ │
│  │  GET /api/v1/contents/:id/reviews?country=KR                      │ │
│  └───────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        Database (Cloudflare D1)                          │
│  ┌──────────────┐ ┌────────────────────┐ ┌─────────────────────────┐   │
│  │  contents    │ │ content_translations│ │ country_platforms       │   │
│  │  (기본 정보) │ │ (언어별 제목/설명)  │ │ (국가별 OTT 플랫폼)     │   │
│  └──────────────┘ └────────────────────┘ └─────────────────────────┘   │
│  ┌──────────────┐ ┌────────────────────┐ ┌─────────────────────────┐   │
│  │ youtube_     │ │ content_platforms  │ │ platforms               │   │
│  │ reviews      │ │ (국가별 매핑)      │ │ (플랫폼 마스터)         │   │
│  └──────────────┘ └────────────────────┘ └─────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

### 2.2 로케일 감지 흐름

```
┌─────────────────────────────────────────────────────────────────┐
│                     Request Flow                                 │
└─────────────────────────────────────────────────────────────────┘

1. 사용자 요청: GET /movies
        │
        ▼
2. Middleware 확인
   ┌─────────────────────────────────────┐
   │ URL에 locale 있음?                  │
   │ /ko/movies → Yes (통과)             │
   │ /movies → No (감지 필요)            │
   └─────────────────────────────────────┘
        │ No
        ▼
3. 로케일 결정 우선순위
   ┌─────────────────────────────────────┐
   │ 1. 쿠키: NEXT_LOCALE                │
   │ 2. Accept-Language 헤더            │
   │ 3. 기본값: 'ko'                     │
   └─────────────────────────────────────┘
        │
        ▼
4. 리다이렉트
   ┌─────────────────────────────────────┐
   │ 302 Redirect: /movies → /ko/movies  │
   │ Set-Cookie: NEXT_LOCALE=ko          │
   └─────────────────────────────────────┘
```

---

## 3. Database Schema Design

### 3.1 ERD (Entity Relationship Diagram)

```
┌─────────────────────────────────────────────────────────────────────┐
│                           DATABASE SCHEMA                            │
└─────────────────────────────────────────────────────────────────────┘

┌──────────────────────┐       ┌──────────────────────────────┐
│      contents        │       │    content_translations      │
├──────────────────────┤       ├──────────────────────────────┤
│ id (PK)              │──────<│ content_id (FK)              │
│ tmdb_id              │       │ language_code                │
│ content_type         │       │ title                        │
│ original_title       │       │ overview                     │
│ original_language    │       │ poster_path                  │
│ release_date         │       │ created_at                   │
│ rating               │       │ updated_at                   │
│ popularity           │       └──────────────────────────────┘
│ backdrop_path        │
│ created_at           │       ┌──────────────────────────────┐
│ updated_at           │       │    content_platforms         │
└──────────────────────┘       ├──────────────────────────────┤
         │                     │ content_id (FK)              │
         │                     │ country_code                 │
         └────────────────────<│ platform_id (FK)             │
                               │ available                    │
                               │ updated_at                   │
                               └──────────────────────────────┘

┌──────────────────────┐       ┌──────────────────────────────┐
│     platforms        │       │    country_platforms         │
├──────────────────────┤       ├──────────────────────────────┤
│ id (PK)              │──────<│ platform_id (FK)             │
│ code                 │       │ country_code                 │
│ name                 │       │ tmdb_provider_id             │
│ logo_url             │       │ name_local                   │
│ created_at           │       │ search_url_template          │
└──────────────────────┘       │ is_active                    │
                               └──────────────────────────────┘

┌──────────────────────┐
│   youtube_reviews    │
├──────────────────────┤
│ id (PK)              │
│ content_id (FK)      │
│ country_code         │  ← 추가
│ video_id             │
│ title                │
│ channel_title        │
│ view_count           │
│ published_at         │
│ thumbnail_url        │
│ source               │
│ created_at           │
└──────────────────────┘
```

### 3.2 SQL Migration Scripts

```sql
-- Migration 001: Add country/language support to contents
-- 파일: workers/migrations/001_add_i18n_support.sql

-- 1. content_translations 테이블 생성
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

-- 2. country_platforms 테이블 생성
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

-- 3. content_platforms 테이블에 country_code 추가
ALTER TABLE content_platforms ADD COLUMN country_code TEXT DEFAULT 'KR';

-- 4. youtube_reviews 테이블에 country_code 추가
ALTER TABLE youtube_reviews ADD COLUMN country_code TEXT DEFAULT 'KR';

-- 5. 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_content_translations_content_id
    ON content_translations(content_id);
CREATE INDEX IF NOT EXISTS idx_content_translations_language
    ON content_translations(language_code);
CREATE INDEX IF NOT EXISTS idx_country_platforms_country
    ON country_platforms(country_code);
CREATE INDEX IF NOT EXISTS idx_content_platforms_country
    ON content_platforms(country_code);
CREATE INDEX IF NOT EXISTS idx_youtube_reviews_country
    ON youtube_reviews(country_code);

-- 6. 기존 한국 데이터 마이그레이션 (contents → content_translations)
INSERT INTO content_translations (content_id, language_code, title, overview, poster_path)
SELECT id, 'ko', title, overview, poster_path
FROM contents
WHERE title IS NOT NULL;
```

### 3.3 국가별 플랫폼 초기 데이터

```sql
-- Migration 002: Seed country platforms
-- 파일: workers/migrations/002_seed_country_platforms.sql

-- 한국 (KR) 플랫폼
INSERT INTO country_platforms (platform_id, country_code, tmdb_provider_id, name_local, search_url_template) VALUES
(1, 'KR', 8, '넷플릭스', 'https://www.netflix.com/search?q={title}'),
(2, 'KR', 1883, '티빙', 'https://www.tving.com/search?keyword={title}'),
(3, 'KR', 356, '웨이브', 'https://www.wavve.com/search?searchWord={title}'),
(4, 'KR', 97, '왓챠', 'https://watcha.com/search?query={title}'),
(5, 'KR', 2062, '쿠팡플레이', 'https://www.coupangplay.com/search?q={title}'),
(6, 'KR', 337, '디즈니+', 'https://www.disneyplus.com/ko-kr/search?q={title}'),
(7, 'KR', 350, 'Apple TV+', 'https://tv.apple.com/kr/search?term={title}');

-- 미국 (US) 플랫폼
INSERT INTO country_platforms (platform_id, country_code, tmdb_provider_id, name_local, search_url_template) VALUES
(1, 'US', 8, 'Netflix', 'https://www.netflix.com/search?q={title}'),
(8, 'US', 9, 'Amazon Prime Video', 'https://www.amazon.com/s?k={title}&i=instant-video'),
(6, 'US', 337, 'Disney+', 'https://www.disneyplus.com/search?q={title}'),
(9, 'US', 15, 'Hulu', 'https://www.hulu.com/search?q={title}'),
(10, 'US', 384, 'Max', 'https://www.max.com/search?q={title}'),
(7, 'US', 350, 'Apple TV+', 'https://tv.apple.com/us/search?term={title}'),
(11, 'US', 531, 'Paramount+', 'https://www.paramountplus.com/search/?q={title}');

-- 일본 (JP) 플랫폼
INSERT INTO country_platforms (platform_id, country_code, tmdb_provider_id, name_local, search_url_template) VALUES
(1, 'JP', 8, 'Netflix', 'https://www.netflix.com/search?q={title}'),
(8, 'JP', 9, 'Amazon Prime Video', 'https://www.amazon.co.jp/s?k={title}&i=instant-video'),
(12, 'JP', 84, 'U-NEXT', 'https://video.unext.jp/search?query={title}'),
(13, 'JP', 85, 'dTV', 'https://video.dmkt-sp.jp/search?keyword={title}'),
(9, 'JP', 15, 'Hulu', 'https://www.hulu.jp/search?q={title}'),
(6, 'JP', 337, 'Disney+', 'https://www.disneyplus.com/ja-jp/search?q={title}');
```

---

## 4. API Design

### 4.1 API Endpoints 변경

| Endpoint | 현재 | 변경 후 |
|----------|------|---------|
| `GET /contents` | `?content_type=movie` | `?content_type=movie&country=KR&language=ko` |
| `GET /contents/:id` | (없음) | `?language=ko` |
| `GET /contents/:id/reviews` | (없음) | `?country=KR` |
| `GET /platforms` | (없음) | `?country=KR` |

### 4.2 API Request/Response 예시

#### 콘텐츠 목록 조회

```typescript
// Request
GET /api/v1/contents?country=US&language=en&content_type=movie&page=1

// Response
{
  "success": true,
  "data": {
    "contents": [
      {
        "id": 123,
        "tmdb_id": 550,
        "content_type": "movie",
        "title": "Fight Club",           // language에 따라 변경
        "overview": "An insomniac...",   // language에 따라 변경
        "poster_path": "/poster.jpg",    // language에 따라 변경 가능
        "release_date": "1999-10-15",
        "rating": 8.4,
        "popularity": 61.416,
        "platforms": [                   // country에 따라 변경
          {
            "code": "netflix",
            "name": "Netflix",
            "logo_url": "..."
          },
          {
            "code": "hulu",
            "name": "Hulu",
            "logo_url": "..."
          }
        ],
        "review_count": 5
      }
    ],
    "pagination": {
      "page": 1,
      "total_pages": 10,
      "total_count": 200
    }
  }
}
```

#### 콘텐츠 상세 조회

```typescript
// Request
GET /api/v1/contents/123?language=ja

// Response
{
  "success": true,
  "data": {
    "id": 123,
    "tmdb_id": 550,
    "content_type": "movie",
    "title": "ファイト・クラブ",        // 일본어
    "original_title": "Fight Club",
    "overview": "不眠症に悩む...",       // 일본어
    "poster_path": "/poster_ja.jpg",
    "backdrop_path": "/backdrop.jpg",
    "release_date": "1999-10-15",
    "rating": 8.4,
    "genres": [...],
    "cast": [...],
    "available_countries": ["KR", "US", "JP"]  // 시청 가능 국가
  }
}
```

### 4.3 Backend Route 변경

```typescript
// workers/src/routes/contents.ts

// 콘텐츠 목록
app.get('/contents', async (c) => {
  const country = c.req.query('country') || 'KR';
  const language = c.req.query('language') || getDefaultLanguage(country);
  const content_type = c.req.query('content_type');
  const page = parseInt(c.req.query('page') || '1');

  // 국가/언어별 콘텐츠 조회
  const contents = await getContentsByCountryAndLanguage(
    c.env.DB,
    { country, language, content_type, page }
  );

  return c.json({ success: true, data: contents });
});

// 콘텐츠 상세
app.get('/contents/:id', async (c) => {
  const id = c.req.param('id');
  const language = c.req.query('language') || 'ko';

  const content = await getContentWithTranslation(c.env.DB, id, language);

  return c.json({ success: true, data: content });
});

// 플랫폼 목록
app.get('/platforms', async (c) => {
  const country = c.req.query('country') || 'KR';

  const platforms = await getPlatformsByCountry(c.env.DB, country);

  return c.json({ success: true, data: platforms });
});
```

### 4.4 TMDB API 호출 동적화

```typescript
// workers/src/services/tmdb.ts

interface TMDBOptions {
  country: 'KR' | 'US' | 'JP';
  language: 'ko' | 'en' | 'ja';
}

const LANGUAGE_MAP = {
  KR: 'ko-KR',
  US: 'en-US',
  JP: 'ja-JP'
};

export async function fetchPopularMovies(
  apiKey: string,
  options: TMDBOptions,
  page: number = 1
) {
  const language = LANGUAGE_MAP[options.country];
  const url = `https://api.themoviedb.org/3/movie/popular?api_key=${apiKey}&language=${language}&region=${options.country}&page=${page}`;

  const response = await fetch(url);
  return response.json();
}

export async function fetchWatchProviders(
  apiKey: string,
  tmdbId: number,
  mediaType: 'movie' | 'tv'
) {
  const url = `https://api.themoviedb.org/3/${mediaType}/${tmdbId}/watch/providers?api_key=${apiKey}`;
  const response = await fetch(url);
  const data = await response.json();

  // 모든 국가의 watch providers 반환
  return {
    KR: data.results?.KR || null,
    US: data.results?.US || null,
    JP: data.results?.JP || null
  };
}
```

---

## 5. Frontend Design

### 5.1 Directory Structure 변경

```
frontend/src/
├── app/
│   ├── [locale]/                    # 동적 로케일 라우트
│   │   ├── layout.tsx               # NextIntlClientProvider
│   │   ├── page.tsx                 # 홈
│   │   ├── movies/
│   │   │   └── page.tsx
│   │   ├── dramas/
│   │   │   └── page.tsx
│   │   ├── trending/
│   │   │   └── page.tsx
│   │   ├── new-releases/
│   │   │   └── page.tsx
│   │   ├── search/
│   │   │   └── page.tsx
│   │   ├── content/
│   │   │   └── [id]/
│   │   │       └── page.tsx
│   │   ├── privacy/
│   │   │   └── page.tsx
│   │   └── terms/
│   │       └── page.tsx
│   ├── layout.tsx                   # Root layout (폰트, 글로벌)
│   └── not-found.tsx
├── components/
│   ├── Header.tsx                   # 언어 선택 UI 추가
│   ├── LanguageSelector.tsx         # 새로 추가
│   ├── ContentCard.tsx
│   └── ...
├── lib/
│   ├── api.ts                       # country/language 파라미터 추가
│   └── i18n/
│       ├── config.ts                # 로케일 설정
│       ├── request.ts               # 서버 컴포넌트용
│       └── navigation.ts            # 네비게이션 헬퍼
├── messages/
│   ├── ko.json
│   ├── en.json
│   └── ja.json
├── middleware.ts                    # 로케일 감지 및 리다이렉트
└── i18n.ts                          # next-intl 설정
```

### 5.2 Middleware 구현

```typescript
// frontend/middleware.ts

import createMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';

const locales = ['ko', 'en', 'ja'];
const defaultLocale = 'ko';

// 로케일과 국가 매핑
const localeToCountry: Record<string, string> = {
  ko: 'KR',
  en: 'US',
  ja: 'JP'
};

const intlMiddleware = createMiddleware({
  locales,
  defaultLocale,
  localeDetection: true,  // Accept-Language 감지
  localePrefix: 'always'  // 항상 /ko, /en, /ja 접두사
});

export default function middleware(request: NextRequest) {
  // 정적 파일 스킵
  const pathname = request.nextUrl.pathname;
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: ['/((?!api|_next|.*\\..*).*)']
};
```

### 5.3 i18n 설정

```typescript
// frontend/i18n.ts

import { notFound } from 'next/navigation';
import { getRequestConfig } from 'next-intl/server';

const locales = ['ko', 'en', 'ja'];

export default getRequestConfig(async ({ locale }) => {
  if (!locales.includes(locale as any)) notFound();

  return {
    messages: (await import(`./messages/${locale}.json`)).default
  };
});
```

### 5.4 번역 파일 구조

```json
// messages/ko.json
{
  "metadata": {
    "title": "WhatView - 어디서 볼까? | OTT 통합 검색",
    "description": "보고 싶은 영화, 드라마를 어디서 볼 수 있을까? 왓뷰에서 넷플릭스, 티빙, 웨이브 등 모든 OTT를 한번에 검색하세요."
  },
  "nav": {
    "home": "홈",
    "movies": "영화",
    "dramas": "드라마",
    "trending": "인기",
    "newReleases": "신작",
    "search": "검색"
  },
  "home": {
    "trending": "🔥 지금 인기있는 콘텐츠",
    "newReleases": "✨ 신작 콘텐츠",
    "popularMovies": "🎬 인기 영화",
    "popularDramas": "📺 인기 드라마",
    "viewAll": "전체보기"
  },
  "content": {
    "watchOn": "시청 가능한 곳",
    "reviews": "리뷰",
    "cast": "출연진",
    "noReviews": "리뷰가 없습니다",
    "moreReviews": "더보기",
    "rating": "평점",
    "releaseDate": "개봉일"
  },
  "search": {
    "placeholder": "영화, 드라마 제목을 검색하세요",
    "noResults": "검색 결과가 없습니다",
    "searching": "검색 중..."
  },
  "common": {
    "loading": "로딩 중...",
    "error": "오류가 발생했습니다",
    "retry": "다시 시도"
  },
  "language": {
    "ko": "한국어",
    "en": "English",
    "ja": "日本語"
  }
}
```

```json
// messages/en.json
{
  "metadata": {
    "title": "WhatView - Where to Watch? | OTT Search",
    "description": "Find where to watch your favorite movies and TV shows. Search Netflix, Hulu, Disney+ and more in one place."
  },
  "nav": {
    "home": "Home",
    "movies": "Movies",
    "dramas": "TV Shows",
    "trending": "Trending",
    "newReleases": "New",
    "search": "Search"
  },
  "home": {
    "trending": "🔥 Trending Now",
    "newReleases": "✨ New Releases",
    "popularMovies": "🎬 Popular Movies",
    "popularDramas": "📺 Popular TV Shows",
    "viewAll": "View All"
  },
  "content": {
    "watchOn": "Where to Watch",
    "reviews": "Reviews",
    "cast": "Cast",
    "noReviews": "No reviews yet",
    "moreReviews": "Load More",
    "rating": "Rating",
    "releaseDate": "Release Date"
  },
  "search": {
    "placeholder": "Search movies and TV shows",
    "noResults": "No results found",
    "searching": "Searching..."
  },
  "common": {
    "loading": "Loading...",
    "error": "An error occurred",
    "retry": "Try Again"
  },
  "language": {
    "ko": "한국어",
    "en": "English",
    "ja": "日本語"
  }
}
```

```json
// messages/ja.json
{
  "metadata": {
    "title": "WhatView - どこで見る？| 動画配信サービス検索",
    "description": "見たい映画やドラマはどこで見られる？Netflix、Amazon Prime、U-NEXTなどを一括検索。"
  },
  "nav": {
    "home": "ホーム",
    "movies": "映画",
    "dramas": "ドラマ",
    "trending": "人気",
    "newReleases": "新作",
    "search": "検索"
  },
  "home": {
    "trending": "🔥 今人気のコンテンツ",
    "newReleases": "✨ 新作コンテンツ",
    "popularMovies": "🎬 人気映画",
    "popularDramas": "📺 人気ドラマ",
    "viewAll": "すべて見る"
  },
  "content": {
    "watchOn": "視聴可能なサービス",
    "reviews": "レビュー",
    "cast": "キャスト",
    "noReviews": "レビューはまだありません",
    "moreReviews": "もっと見る",
    "rating": "評価",
    "releaseDate": "公開日"
  },
  "search": {
    "placeholder": "映画、ドラマのタイトルを検索",
    "noResults": "検索結果がありません",
    "searching": "検索中..."
  },
  "common": {
    "loading": "読み込み中...",
    "error": "エラーが発生しました",
    "retry": "再試行"
  },
  "language": {
    "ko": "한국어",
    "en": "English",
    "ja": "日本語"
  }
}
```

### 5.5 컴포넌트 변경 예시

```typescript
// components/Header.tsx

'use client';

import { useTranslations } from 'next-intl';
import { Link, usePathname } from '@/lib/i18n/navigation';
import LanguageSelector from './LanguageSelector';

export default function Header() {
  const t = useTranslations('nav');
  const pathname = usePathname();

  const navItems = [
    { href: '/', label: t('home') },
    { href: '/movies', label: t('movies') },
    { href: '/dramas', label: t('dramas') },
    { href: '/trending', label: t('trending') },
    { href: '/new-releases', label: t('newReleases') },
    { href: '/search', label: t('search') },
  ];

  return (
    <header className="...">
      <nav>
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={pathname === item.href ? 'active' : ''}
          >
            {item.label}
          </Link>
        ))}
      </nav>
      <LanguageSelector />
    </header>
  );
}
```

```typescript
// components/LanguageSelector.tsx

'use client';

import { useLocale, useTranslations } from 'next-intl';
import { usePathname, useRouter } from '@/lib/i18n/navigation';

const locales = ['ko', 'en', 'ja'] as const;

export default function LanguageSelector() {
  const t = useTranslations('language');
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  const handleChange = (newLocale: string) => {
    router.replace(pathname, { locale: newLocale });
  };

  return (
    <select
      value={locale}
      onChange={(e) => handleChange(e.target.value)}
      className="bg-gray-800 text-white rounded px-2 py-1"
    >
      {locales.map((loc) => (
        <option key={loc} value={loc}>
          {t(loc)}
        </option>
      ))}
    </select>
  );
}
```

### 5.6 API 클라이언트 변경

```typescript
// lib/api.ts

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://whatview-api.magi815.workers.dev/api/v1';

// 로케일 → 국가 매핑
const localeToCountry: Record<string, string> = {
  ko: 'KR',
  en: 'US',
  ja: 'JP'
};

interface FetchOptions {
  locale?: string;
}

export async function getContents(
  params: {
    page?: number;
    content_type?: string;
    genre?: number;
    ordering?: string;
    recent?: boolean;
  } = {},
  options: FetchOptions = {}
) {
  const { locale = 'ko' } = options;
  const country = localeToCountry[locale] || 'KR';

  const searchParams = new URLSearchParams({
    country,
    language: locale,
    page: String(params.page || 1),
    ...(params.content_type && { content_type: params.content_type }),
    ...(params.genre && { genre: String(params.genre) }),
    ...(params.ordering && { ordering: params.ordering }),
    ...(params.recent && { recent: 'true' }),
  });

  const res = await fetch(`${API_BASE_URL}/contents?${searchParams}`);
  if (!res.ok) throw new Error('Failed to fetch contents');
  return res.json();
}

export async function getContentById(id: string, locale: string = 'ko') {
  const res = await fetch(`${API_BASE_URL}/contents/${id}?language=${locale}`);
  if (!res.ok) throw new Error('Failed to fetch content');
  return res.json();
}

export async function getContentReviews(
  id: string,
  page: number = 1,
  locale: string = 'ko'
) {
  const country = localeToCountry[locale] || 'KR';
  const res = await fetch(
    `${API_BASE_URL}/contents/${id}/reviews?country=${country}&page=${page}`
  );
  if (!res.ok) throw new Error('Failed to fetch reviews');
  return res.json();
}
```

---

## 6. Implementation Order

### 6.1 구현 순서 (의존성 기반)

```
Phase 1: 기반 구조 (필수 선행)
───────────────────────────────────────────────────────
1.1 DB 마이그레이션
    ├── content_translations 테이블 생성
    ├── country_platforms 테이블 생성
    ├── 기존 테이블 컬럼 추가 (country_code)
    └── 인덱스 생성

1.2 Backend API 확장
    ├── types.ts 업데이트
    ├── contents.ts country/language 파라미터
    ├── platforms.ts country 파라미터
    └── TMDB 호출 동적화

1.3 Frontend i18n 설정
    ├── next-intl 설치
    ├── middleware.ts 생성
    ├── i18n.ts 설정
    └── 번역 파일 구조 생성 (ko.json만)

Phase 2: 한국어 UI 외부화
───────────────────────────────────────────────────────
2.1 messages/ko.json 완성
    └── 모든 하드코딩 텍스트 추출

2.2 컴포넌트 수정
    ├── Header.tsx (useTranslations)
    ├── ContentCard.tsx
    ├── ContentSection.tsx
    └── 각 페이지 컴포넌트

2.3 라우팅 구조 변경
    ├── app/[locale]/ 구조 생성
    └── 기존 페이지 이동

Phase 3: 영어 (US) 지원
───────────────────────────────────────────────────────
3.1 messages/en.json 생성

3.2 미국 플랫폼 데이터
    └── country_platforms US 데이터 추가

3.3 미국 콘텐츠 수집
    ├── admin.ts collect 엔드포인트 수정
    └── US 콘텐츠 수집 실행

Phase 4: 일본어 (JP) 지원
───────────────────────────────────────────────────────
4.1 messages/ja.json 생성

4.2 일본 플랫폼 데이터
    └── country_platforms JP 데이터 추가

4.3 일본 콘텐츠 수집
    └── JP 콘텐츠 수집 실행
```

### 6.2 파일별 변경 목록

| 파일 | 변경 유형 | 설명 |
|------|----------|------|
| `workers/migrations/001_add_i18n_support.sql` | 신규 | DB 마이그레이션 |
| `workers/migrations/002_seed_country_platforms.sql` | 신규 | 플랫폼 초기 데이터 |
| `workers/src/types.ts` | 수정 | Country, Language 타입 추가 |
| `workers/src/routes/contents.ts` | 수정 | country/language 파라미터 |
| `workers/src/routes/platforms.ts` | 수정 | country 파라미터 |
| `workers/src/routes/admin.ts` | 수정 | 국가별 수집 지원 |
| `workers/src/services/tmdb.ts` | 신규 | TMDB API 래퍼 |
| `frontend/package.json` | 수정 | next-intl 추가 |
| `frontend/middleware.ts` | 신규 | 로케일 미들웨어 |
| `frontend/i18n.ts` | 신규 | next-intl 설정 |
| `frontend/messages/ko.json` | 신규 | 한국어 번역 |
| `frontend/messages/en.json` | 신규 | 영어 번역 |
| `frontend/messages/ja.json` | 신규 | 일본어 번역 |
| `frontend/src/app/[locale]/layout.tsx` | 신규 | 로케일 레이아웃 |
| `frontend/src/app/[locale]/page.tsx` | 이동 | 홈 페이지 |
| `frontend/src/app/[locale]/movies/page.tsx` | 이동 | 영화 목록 |
| `frontend/src/app/[locale]/dramas/page.tsx` | 이동 | 드라마 목록 |
| `frontend/src/app/[locale]/...` | 이동 | 기타 페이지들 |
| `frontend/src/components/Header.tsx` | 수정 | i18n 적용 |
| `frontend/src/components/LanguageSelector.tsx` | 신규 | 언어 선택 UI |
| `frontend/src/components/ContentCard.tsx` | 수정 | i18n 적용 |
| `frontend/src/lib/api.ts` | 수정 | country/language 파라미터 |
| `frontend/src/lib/i18n/config.ts` | 신규 | i18n 설정 |
| `frontend/src/lib/i18n/navigation.ts` | 신규 | 네비게이션 헬퍼 |

---

## 7. Testing Strategy

### 7.1 테스트 범위

| 영역 | 테스트 항목 |
|------|------------|
| **Middleware** | 로케일 감지, 리다이렉트, 쿠키 |
| **API** | country/language 파라미터 처리, 응답 형식 |
| **DB** | 마이그레이션, 쿼리 성능 |
| **UI** | 번역 키 누락, 언어 전환 |
| **SEO** | 메타데이터, hreflang 태그 |

### 7.2 수동 테스트 체크리스트

```
[ ] /movies 접근 시 /ko/movies로 리다이렉트
[ ] Accept-Language: en 설정 시 /en/movies로 리다이렉트
[ ] 언어 선택기로 언어 변경 후 콘텐츠 언어 변경 확인
[ ] 각 언어별 OTT 플랫폼 목록 정확성
[ ] 각 언어별 검색 결과 정확성
[ ] 404 페이지 번역
[ ] 메타데이터 (title, description) 언어별 확인
```

---

## 8. Rollback Plan

### 8.1 롤백 시나리오

1. **DB 롤백**: 마이그레이션 실패 시
   ```sql
   DROP TABLE IF EXISTS content_translations;
   DROP TABLE IF EXISTS country_platforms;
   ALTER TABLE content_platforms DROP COLUMN country_code;
   ALTER TABLE youtube_reviews DROP COLUMN country_code;
   ```

2. **Frontend 롤백**: 기존 라우팅 구조 복원
   - `app/[locale]/` 삭제
   - 기존 `app/` 페이지 복원
   - middleware.ts 삭제

3. **API 롤백**: 파라미터 무시 처리
   - country/language 파라미터 기본값으로 고정

---

## 9. SEO Considerations

### 9.1 hreflang 태그

```html
<!-- app/[locale]/layout.tsx의 head -->
<link rel="alternate" hreflang="ko" href="https://whatview.magi815.workers.dev/ko" />
<link rel="alternate" hreflang="en" href="https://whatview.magi815.workers.dev/en" />
<link rel="alternate" hreflang="ja" href="https://whatview.magi815.workers.dev/ja" />
<link rel="alternate" hreflang="x-default" href="https://whatview.magi815.workers.dev/ko" />
```

### 9.2 Sitemap

```xml
<!-- sitemap.xml -->
<urlset>
  <url>
    <loc>https://whatview.magi815.workers.dev/ko</loc>
    <xhtml:link rel="alternate" hreflang="en" href="https://whatview.magi815.workers.dev/en"/>
    <xhtml:link rel="alternate" hreflang="ja" href="https://whatview.magi815.workers.dev/ja"/>
  </url>
  <!-- ... -->
</urlset>
```

---

## 10. Appendix

### A. 국가-언어-플랫폼 매핑 표

| 국가 | 언어 | 플랫폼 ID | TMDB Provider ID |
|------|------|----------|------------------|
| KR | ko | netflix | 8 |
| KR | ko | tving | 1883 |
| KR | ko | wavve | 356 |
| KR | ko | watcha | 97 |
| KR | ko | coupang_play | 2062 |
| KR | ko | disney_plus | 337 |
| KR | ko | apple_tv_plus | 350 |
| US | en | netflix | 8 |
| US | en | amazon_prime | 9 |
| US | en | disney_plus | 337 |
| US | en | hulu | 15 |
| US | en | max | 384 |
| US | en | apple_tv_plus | 350 |
| US | en | paramount_plus | 531 |
| JP | ja | netflix | 8 |
| JP | ja | amazon_prime | 9 |
| JP | ja | u_next | 84 |
| JP | ja | dtv | 85 |
| JP | ja | hulu | 15 |
| JP | ja | disney_plus | 337 |

### B. 폰트 설정

```typescript
// app/layout.tsx
import { Noto_Sans_KR, Noto_Sans_JP, Inter } from 'next/font/google';

const notoSansKR = Noto_Sans_KR({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-noto-kr'
});

const notoSansJP = Noto_Sans_JP({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-noto-jp'
});

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-inter'
});

// 로케일에 따라 폰트 클래스 적용
const fontClass = {
  ko: notoSansKR.className,
  en: inter.className,
  ja: notoSansJP.className
};
```

---

*Document Version: 1.0.0*
*Last Updated: 2026-02-01*
