# Plan Document: Multi-Country & i18n Expansion

> 다국가 콘텐츠 및 다국어 지원 확장

## 1. Feature Overview

| 항목 | 내용 |
|------|------|
| **Feature Name** | multi-country-i18n |
| **Version** | v1.0.0 |
| **Created** | 2026-02-01 |
| **Status** | Planning |
| **Priority** | High |

### 1.1 Problem Statement

현재 왓뷰(WhatView)는 **한국 전용** 서비스로 설계되어 있습니다:

- TMDB API 호출 시 `language=ko-KR`, `region=KR` 하드코딩
- OTT 플랫폼 7개 모두 한국 전용 (Watcha, Wavve, TVING, Coupang Play 등)
- UI 텍스트 100% 한국어 하드코딩 (40+ 지점)
- 메타데이터, SEO, 폰트 모두 한국어 전용
- DB 스키마에 국가/언어 필드 없음

**79개 하드코딩 지점**이 한국으로 고정되어 있어 글로벌 확장 불가능.

### 1.2 Goals

1. **다국가 콘텐츠 지원**: 미국, 일본, 영국 등 주요 국가별 OTT 콘텐츠 제공
2. **다국어 UI 지원**: 한국어, 영어, 일본어 UI 텍스트 (확장 가능 구조)
3. **국가별 OTT 플랫폼**: 각 국가의 주요 스트리밍 서비스 연동
4. **SEO 최적화**: 국가/언어별 메타데이터 및 URL 구조

### 1.3 Non-Goals (Scope Out)

- 사용자 계정/로그인 시스템 (기존 설계 유지)
- 국가별 개별 도메인 (단일 도메인 유지)
- 실시간 번역 (정적 번역 파일 사용)
- 통화/결제 시스템

---

## 2. Current State Analysis

### 2.1 하드코딩된 한국 전용 요소

| 카테고리 | 개수 | 주요 파일 |
|---------|------|-----------|
| TMDB API (language=ko-KR) | 12 | admin.ts, scheduled.ts |
| TMDB API (region=KR) | 8 | admin.ts |
| OTT 플랫폼 정보 | 7 | seed.sql, ContentCard.tsx |
| UI 텍스트 | 40+ | layout.tsx, components/* |
| 플랫폼 검색 URL | 7 | content/[id]/page.tsx |
| 메타데이터 | 2 | layout.tsx |
| 폰트 | 1 | layout.tsx (Noto_Sans_KR) |

### 2.2 현재 기술 스택

- **Frontend**: Next.js 15.1 + App Router
- **Backend**: Cloudflare Workers + Hono
- **Database**: Cloudflare D1 (SQLite)
- **API**: TMDB, YouTube Data API, Piped API

### 2.3 현재 DB 스키마 (contents 테이블)

```sql
CREATE TABLE contents (
    id INTEGER PRIMARY KEY,
    title TEXT NOT NULL,           -- 한국어 제목만
    title_en TEXT,                 -- 영문 제목
    content_type TEXT NOT NULL,
    overview TEXT,                 -- 한국어 설명만
    -- 국가/언어 필드 없음!
);
```

---

## 3. Proposed Solution

### 3.1 Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  Next.js App Router with i18n                        │    │
│  │  /[locale]/movies, /[locale]/search, etc.            │    │
│  │  next-intl for translations                          │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     API Layer                                │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  /api/v1/contents?country=US&language=en             │    │
│  │  /api/v1/platforms?country=JP                        │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Database (D1)                             │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐   │
│  │ contents      │  │ translations  │  │ country_      │   │
│  │ + country_code│  │ (UI texts)    │  │ platforms     │   │
│  └───────────────┘  └───────────────┘  └───────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 지원 국가 및 언어 (Phase 1)

| 국가 코드 | 국가명 | 언어 | 주요 OTT 플랫폼 |
|-----------|--------|------|-----------------|
| KR | 한국 | ko | Netflix, TVING, Wavve, Watcha, Coupang Play |
| US | 미국 | en | Netflix, Hulu, Amazon Prime, Disney+, HBO Max |
| JP | 일본 | ja | Netflix, Amazon Prime, U-NEXT, dTV, Hulu Japan |

### 3.3 URL 구조

```
현재: /movies, /search, /content/123
변경: /ko/movies, /en/movies, /ja/movies
      /ko/search, /en/search, /ja/search
      /ko/content/123, /en/content/123, /ja/content/123
```

---

## 4. Technical Requirements

### 4.1 Frontend Changes

| 영역 | 변경 내용 |
|------|----------|
| **라우팅** | `app/[locale]/` 동적 라우트 구조로 변경 |
| **i18n** | next-intl 라이브러리 도입 |
| **번역 파일** | `/messages/ko.json`, `/messages/en.json`, `/messages/ja.json` |
| **폰트** | 언어별 폰트 (Noto Sans KR/JP, Inter) |
| **메타데이터** | 동적 메타데이터 (locale 기반) |
| **컴포넌트** | Header, ContentCard 등 텍스트 외부화 |

### 4.2 Backend Changes

| 영역 | 변경 내용 |
|------|----------|
| **API 파라미터** | `?country=XX&language=XX` 추가 |
| **TMDB 호출** | 동적 language/region 파라미터 |
| **플랫폼 데이터** | 국가별 OTT 플랫폼 테이블 |
| **Cron Jobs** | 국가별 수집 작업 분리 |

### 4.3 Database Schema Changes

```sql
-- contents 테이블 수정
ALTER TABLE contents ADD COLUMN country_code TEXT DEFAULT 'KR';
ALTER TABLE contents ADD COLUMN language_code TEXT DEFAULT 'ko';

-- 국가별 플랫폼 매핑 테이블
CREATE TABLE country_platforms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    country_code TEXT NOT NULL,      -- 'KR', 'US', 'JP'
    platform_id INTEGER NOT NULL,
    tmdb_provider_id INTEGER,
    name TEXT NOT NULL,
    name_local TEXT,                 -- 현지화된 이름
    search_url_template TEXT,        -- OTT 검색 URL 템플릿
    FOREIGN KEY (platform_id) REFERENCES platforms(id)
);

-- 콘텐츠 번역 테이블 (선택적)
CREATE TABLE content_translations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    content_id INTEGER NOT NULL,
    language_code TEXT NOT NULL,     -- 'ko', 'en', 'ja'
    title TEXT NOT NULL,
    overview TEXT,
    FOREIGN KEY (content_id) REFERENCES contents(id),
    UNIQUE(content_id, language_code)
);
```

---

## 5. Implementation Phases

### Phase 1: 기반 구조 구축 (필수)

1. **Frontend i18n 설정**
   - next-intl 설치 및 설정
   - `[locale]` 라우트 구조 변경
   - 번역 파일 구조 생성

2. **Backend API 확장**
   - country/language 파라미터 추가
   - TMDB API 호출 동적화

3. **DB 스키마 마이그레이션**
   - country_code, language_code 컬럼 추가
   - country_platforms 테이블 생성

### Phase 2: 한국어 UI 외부화

1. **번역 키 추출**
   - 모든 하드코딩된 한국어 텍스트 추출
   - `/messages/ko.json` 파일 생성

2. **컴포넌트 수정**
   - useTranslations 훅 적용
   - 동적 텍스트 렌더링

### Phase 3: 영어 지원 추가 (US)

1. **영어 번역 파일**
   - `/messages/en.json` 생성

2. **미국 OTT 플랫폼 데이터**
   - Netflix, Hulu, Amazon Prime, Disney+, HBO Max

3. **미국 콘텐츠 수집**
   - TMDB region=US 콘텐츠 수집

### Phase 4: 일본어 지원 추가 (JP)

1. **일본어 번역 파일**
   - `/messages/ja.json` 생성

2. **일본 OTT 플랫폼 데이터**
   - Netflix, Amazon Prime, U-NEXT, dTV

3. **일본 콘텐츠 수집**
   - TMDB region=JP 콘텐츠 수집

---

## 6. Risks & Mitigations

| 리스크 | 영향도 | 대응 방안 |
|--------|--------|----------|
| DB 마이그레이션 실패 | High | 마이그레이션 스크립트 테스트, 백업 |
| API 할당량 초과 | Medium | 국가별 수집 시간 분산, 캐싱 |
| 번역 품질 문제 | Medium | 검수 프로세스, 커뮤니티 피드백 |
| Workers 타임아웃 | Medium | 국가별 배치 분리, 30초 제한 준수 |
| SEO 영향 | Medium | 기존 URL 리다이렉트 설정 |

---

## 7. Success Metrics

| 지표 | 목표 |
|------|------|
| 지원 국가 수 | 3개국 (KR, US, JP) |
| 지원 언어 수 | 3개 (ko, en, ja) |
| 번역 완성도 | 100% UI 텍스트 번역 |
| 국가별 콘텐츠 수 | 각 국가 500+ 콘텐츠 |
| 페이지 로딩 시간 | 현재 대비 동일 수준 유지 |

---

## 8. Dependencies

### 8.1 라이브러리

| 패키지 | 버전 | 용도 |
|--------|------|------|
| next-intl | ^3.x | i18n 프레임워크 |
| @formatjs/intl-localematcher | ^0.5.x | 로케일 매칭 |
| negotiator | ^0.6.x | Accept-Language 헤더 파싱 |

### 8.2 외부 API

| API | 용도 | 제한 |
|-----|------|------|
| TMDB | 다국가 콘텐츠 수집 | 40 req/10sec |
| YouTube/Piped | 다국어 리뷰 수집 | Piped: 무제한 |

---

## 9. Open Questions

1. **기본 언어 정책**: 브라우저 언어 감지 vs 명시적 선택? 브라우저 언어 감지
2. **콘텐츠 중복 처리**: 한 영화가 여러 국가에 있을 때 하나로 통합? 포스터 및 제목, 내용 등을 각 언어별로 저장후 관리
3. **리뷰 언어**: 국가별 YouTube 리뷰만? 전체 언어? 국가별로 컨텐츠별 리뷰 별도 처리
4. **URL 리다이렉트**: 기존 `/movies` → `/ko/movies` 자동 리다이렉트? 자동
5. **Workers 배포**: 국가별 별도 Worker vs 단일 Worker? 단일

---

## 10. Timeline (Rough Estimate)

| Phase | 작업 내용 |
|-------|----------|
| Phase 1 | 기반 구조 구축 (i18n, API, DB) |
| Phase 2 | 한국어 UI 외부화 |
| Phase 3 | 영어 (US) 지원 |
| Phase 4 | 일본어 (JP) 지원 |

---

## 11. Approval

| 역할 | 상태 | 비고 |
|------|------|------|
| Product Owner | ⏳ Pending | 기능 범위 확인 필요 |
| Tech Lead | ⏳ Pending | 아키텍처 검토 필요 |

---

## Appendix

### A. 국가별 주요 OTT 플랫폼 (TMDB Provider ID)

**한국 (KR)**
| Provider | ID |
|----------|-----|
| Netflix | 8 |
| TVING | 1883 |
| Wavve | 356 |
| Watcha | 97 |
| Coupang Play | 2062 |
| Disney+ | 337 |
| Apple TV+ | 350 |

**미국 (US)**
| Provider | ID |
|----------|-----|
| Netflix | 8 |
| Amazon Prime Video | 9 |
| Disney+ | 337 |
| Hulu | 15 |
| HBO Max | 384 |
| Apple TV+ | 350 |
| Paramount+ | 531 |

**일본 (JP)**
| Provider | ID |
|----------|-----|
| Netflix | 8 |
| Amazon Prime Video | 9 |
| U-NEXT | 84 |
| dTV | 85 |
| Hulu Japan | 15 |
| Disney+ | 337 |

### B. 번역 파일 구조 예시

```json
// messages/ko.json
{
  "nav": {
    "home": "홈",
    "movies": "영화",
    "dramas": "드라마",
    "trending": "인기",
    "newReleases": "신작",
    "search": "검색"
  },
  "home": {
    "trendingTitle": "🔥 지금 인기있는 콘텐츠",
    "newReleasesTitle": "✨ 신작 콘텐츠",
    "popularMoviesTitle": "🎬 인기 영화",
    "popularDramasTitle": "📺 인기 드라마"
  },
  "content": {
    "watchOn": "시청 가능한 곳",
    "reviews": "리뷰",
    "cast": "출연진",
    "noReviews": "리뷰가 없습니다"
  }
}
```

---

*Document Version: 1.0.0*
*Last Updated: 2026-02-01*
