# CLAUDE.md - 왓뷰(WhatView) 프로젝트 컨텍스트

> Claude Code AI 어시스턴트를 위한 프로젝트 컨텍스트 문서

---

## 프로젝트 개요

**왓뷰(WhatView)**는 국내 주요 OTT 플랫폼(넷플릭스, 티빙, 웨이브, 쿠팡플레이, 디즈니+ 등)의 영화와 드라마를 통합 검색하고, 어디서 시청 가능한지 확인할 수 있는 **OTT 통합 검색 & 유튜브 리뷰 서비스**입니다.

- **이름 유래**: What to View + Review = WhatView(왓뷰)

> **참고**: 로그인, 회원가입, 찜목록, 평점, 푸시 알림 등 개인화 기능은 의도적으로 제외되었습니다. 누구나 로그인 없이 콘텐츠를 검색하고 정보를 확인할 수 있습니다.

### 배포 URL
- **프론트엔드**: https://whatview.magi815.workers.dev
- **백엔드 API**: https://whatview-api.magi815.workers.dev/api/v1

### 기술 스택 (Cloudflare Full Stack)
- **백엔드**: Cloudflare Workers + Hono (TypeScript)
- **데이터베이스**: Cloudflare D1 (SQLite) - `streamly-db-v2`
- **프론트엔드**: Next.js 15.1 + TypeScript + Tailwind CSS
- **배포**: Cloudflare Workers (프론트엔드 + 백엔드)
- **자동화**: Cron Triggers (콘텐츠/리뷰 자동 수집)

### 무료 티어 제한
- Workers: 100,000 요청/일, **30초 실행 시간 제한**
- D1: 5GB 저장소, 5M 읽기/일
- YouTube API: 10,000 units/일

> **⚠️ Workers 타임아웃 주의**: 대량 데이터 수집 시 30초 제한으로 인해 배치 처리 필요.
> - `collect-watch-providers`: offset/limit 파라미터로 100개씩 분할 수집
> - `collect-korea`: 페이지 수 제한 (한 번에 5-10페이지 권장)

---

## 프로젝트 구조

```
project-claude/
├── workers/                   # Cloudflare Workers 백엔드
│   ├── src/
│   │   ├── index.ts           # 메인 Hono 앱 (CORS, 라우팅)
│   │   ├── types.ts           # TypeScript 타입
│   │   ├── scheduled.ts       # Cron Trigger 핸들러
│   │   └── routes/
│   │       ├── contents.ts    # 콘텐츠 API (목록, 상세, 검색)
│   │       ├── genres.ts      # 장르 API
│   │       ├── platforms.ts   # 플랫폼 API
│   │       └── admin.ts       # 관리자 API (수집, 통계)
│   ├── schema.sql             # D1 데이터베이스 스키마
│   ├── seed.sql               # 초기 데이터 (플랫폼 정보)
│   ├── wrangler.toml          # Workers 설정
│   └── package.json
├── frontend/                  # Next.js 앱
│   ├── src/
│   │   ├── app/               # App Router 페이지
│   │   │   ├── page.tsx       # 홈 (인기/신작/영화/드라마)
│   │   │   ├── search/        # 검색 페이지
│   │   │   ├── content/[id]/  # 콘텐츠 상세
│   │   │   ├── movies/        # 영화 목록
│   │   │   ├── dramas/        # 드라마 목록
│   │   │   ├── trending/      # 인기 콘텐츠
│   │   │   └── new-releases/  # 신작 콘텐츠
│   │   ├── components/        # React 컴포넌트
│   │   │   ├── Header.tsx
│   │   │   ├── ContentCard.tsx
│   │   │   ├── ContentSection.tsx
│   │   │   ├── ContentCardSkeleton.tsx
│   │   │   ├── GenreFilter.tsx
│   │   │   ├── SortDropdown.tsx
│   │   │   └── Pagination.tsx
│   │   ├── lib/
│   │   │   ├── api.ts         # API 클라이언트
│   │   │   └── mock-data.ts   # Fallback용 Mock 데이터
│   │   └── types/
│   │       └── content.ts     # TypeScript 타입
│   ├── wrangler.toml          # Workers 설정 (OpenNext)
│   ├── next.config.ts
│   └── package.json
├── apps/                      # (레거시) Django 앱 - 참조용
├── config/                    # (레거시) Django 설정 - 참조용
├── PROJECT.md                 # 상세 프로젝트 기획 문서
└── APP_INFO.md                # 앱 브랜드/스토어 정보
```

---

## 완료된 작업 내역

### Phase 1: Django 백엔드 (레거시)
- [x] Django 프로젝트 구조 설정
- [x] 데이터베이스 모델 설계
- [x] TMDb API 연동 서비스
- [x] REST API 엔드포인트
- [x] Celery 태스크 구현

### Phase 2: Next.js 프론트엔드
- [x] Next.js 15.1 + TypeScript + Tailwind CSS 설정
- [x] 홈 화면 (인기/신작/영화/드라마 섹션)
- [x] 검색 화면 (실시간 검색 with useDeferredValue)
- [x] 콘텐츠 상세 화면 (클라이언트 렌더링)
- [x] 영화/드라마/인기/신작 목록 화면
- [x] YouTube 리뷰 표시 UI + 페이지네이션 ("더보기" 버튼)
- [x] 반응형 디자인
- [x] 스켈레톤 로딩 UI

### Phase 3: Cloudflare 마이그레이션
- [x] Cloudflare Workers 프로젝트 설정 (Hono)
- [x] D1 데이터베이스 스키마 설계
- [x] API 엔드포인트 구현 (contents, genres, platforms, admin)
- [x] Cron Triggers 설정 (콘텐츠 자동 수집)
- [x] Next.js OpenNext로 Workers 배포

### Phase 4: YouTube 리뷰 시스템
- [x] YouTube Data API 연동 (Search + Videos API)
- [x] 리뷰 자동 수집 (Cron Triggers)
- [x] 영화 30% / 드라마 70% 비율 수집 (2026-01-25 변경)
- [x] 최근 1년 이내 콘텐츠만 리뷰 수집 (API 할당량 최적화)
- [x] 조회수 정보 수집 및 표시
- [x] 콘텐츠 카드에 리뷰 개수 뱃지 표시
- [x] 상세 페이지 리뷰 페이지네이션 (6개씩 "더보기")

### Phase 5: 데이터 수집 최적화 (2026-01-25)
- [x] TMDB 자동수집: 최근 1년 이내 콘텐츠만 수집하도록 변경
- [x] YouTube 수집 비율: 영화 30%, 드라마 70%로 변경
- [x] OTT 플랫폼 버튼 클릭 시 해당 플랫폼 검색 페이지로 연결
- [x] TMDb/YouTube API 키 Cloudflare Secrets 설정 완료
- [x] Watch Providers 전체 수집 완료 (1,157개 콘텐츠)

### Phase 6: Piped API 연동 (2026-01-27)
- [x] Piped API 연동 (YouTube API 대체, 할당량 무제한)
- [x] `youtube_reviews` 테이블에 `source` 컬럼 추가 (`youtube_api` / `piped_api`)
- [x] Piped API 수동 수집 엔드포인트 구현 (`/collect-youtube-reviews-piped`)
- [x] Piped API 자동 수집 Cron 설정 (10분 간격, 2시간/일)
- [x] 조회수 기반 정렬로 고품질 리뷰 우선 수집
- [x] Fallback 인스턴스 지원 (5개 인스턴스 순차 시도)
- [x] 전체 콘텐츠 리뷰 수집 완료 (~5,000개 리뷰)

### Phase 7: 다국가/다국어(i18n) 지원 (2026-02-01~02)
- [x] next-intl v4.8.1 적용 (프론트엔드 i18n)
- [x] 3개국 지원: KR(한국), US(미국), JP(일본)
- [x] 3개 언어 지원: ko(한국어), en(영어), ja(일본어)
- [x] `content_translations` 테이블 생성 (언어별 제목/설명/포스터/감독)
- [x] `country_platforms` 테이블 생성 (국가별 OTT 플랫폼 매핑)
- [x] TMDB API에서 다국어 번역 수집 (`/collect-translations`)
- [x] API에 `country` 및 `language` 파라미터 추가
- [x] 언어 선택기(LanguageSelector) 컴포넌트 구현
- [x] 자동 언어 감지 (Accept-Language 헤더 기반)
- [x] 다국어 YouTube 리뷰 수집 (ko, en, ja)
- [x] **다국어 Director 수집** (2026-02-02)
- [x] **다국어 Cast 수집** (content_cast에 language_code, tmdb_person_id 추가)
- [x] 번역 수집 자동화 (Cron Triggers에 포함)
- [x] ~450+ 번역 항목 완성 (en: ~230, ja: ~200)
- [x] ~3,500+ 다국어 Cast 정보 수집

---

## 주요 API 엔드포인트

### 콘텐츠 (`/api/v1/contents/`)
| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/` | 콘텐츠 목록 (필터/정렬/페이지네이션) |
| GET | `/:id` | 콘텐츠 상세 (장르, 플랫폼, 캐스트, 리뷰 포함) |
| GET | `/movies` | 영화 목록 (한국 시청 가능) |
| GET | `/dramas` | 드라마 목록 (한국 시청 가능) |
| GET | `/trending` | 인기 콘텐츠 (최근 1년, 상위 10개) |
| GET | `/new-releases` | 신작 콘텐츠 (상위 10개) |
| GET | `/search?q=` | 제목/영문제목/줄거리 검색 |
| GET | `/:id/reviews` | YouTube 리뷰 목록 |

#### 쿼리 파라미터 (콘텐츠 목록)
- `page`: 페이지 번호 (기본: 1)
- `content_type`: movie 또는 drama
- `genre`: 장르 ID
- `ordering`: -popularity, -rating, -release_date 등
- `recent`: true면 최근 1년 필터
- `period`: 1, 2, 5, all (인기순 정렬 시 기간 필터)
- `available_kr`: false면 한국 미지원 콘텐츠 포함
- `country`: KR, US, JP (기본: KR) - 국가별 플랫폼 필터
- `language`: ko, en, ja (기본: 국가에 따라 자동 설정) - 번역 언어

### 플랫폼 (`/api/v1/platforms/`)
| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/` | 플랫폼 목록 |
| GET | `/:id` | 플랫폼 상세 |
| GET | `/:id/contents` | 플랫폼별 콘텐츠 |

### 장르 (`/api/v1/genres/`)
| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/` | 장르 목록 |

### 관리자 (`/api/v1/admin/`)
| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | `/sync-genres` | TMDb 장르 동기화 |
| POST | `/collect-movies` | 인기 영화 수집 |
| POST | `/collect-dramas` | 인기 드라마 수집 |
| POST | `/collect-all` | 전체 수집 (장르+영화+드라마) |
| POST | `/collect-latest` | 최신 콘텐츠 수집 |
| POST | `/collect-korea` | 한국 콘텐츠 수집 |
| POST | `/collect-korean-origin` | 한국 제작 콘텐츠 수집 |
| POST | `/collect-watch-providers` | Watch Provider 수집 |
| POST | `/collect-youtube-reviews` | YouTube 리뷰 수집 (YouTube API) |
| POST | `/collect-youtube-reviews-piped` | YouTube 리뷰 수집 (Piped API) |
| POST | `/collect-translations` | 다국어 번역 수집 (TMDB API) |
| GET | `/stats` | 데이터베이스 통계 |
| DELETE | `/clear-contents` | 콘텐츠 삭제 |

#### 번역 수집 파라미터 (`/collect-translations`)
```json
{
  "limit": 50,             // 처리할 콘텐츠 수 (기본: 50)
  "offset": 0,             // 시작 위치
  "language": "all",       // "en", "ja", 또는 "all" (기본: all)
  "include_credits": true  // director, cast 포함 여부 (기본: true)
}
```

**수집 항목**: title, overview, poster_path, **director**, **cast** (상위 10명)

#### Piped API 수집 파라미터 (`/collect-youtube-reviews-piped`)
```json
{
  "limit": 20,           // 처리할 콘텐츠 수 (기본: 20)
  "offset": 0,           // 시작 위치
  "content_type": null,  // "movie" 또는 "drama" (null=전체)
  "recent_only": true,   // 최근 1년 콘텐츠만
  "include_existing": false,  // 기존 리뷰 있어도 수집
  "debug": false         // 디버그 정보 포함
}

---

## Cron Triggers (자동화)

Workers의 Cron Triggers로 콘텐츠와 리뷰를 자동 수집합니다. (무료 플랜 최대 5개)

| 크론 표현식 | 스케줄 | 설명 |
|-------------|--------|------|
| `0 3 * * *` | 매일 03:00 UTC (12:00 KST) | TMDB 장르 동기화 + 인기 콘텐츠 5페이지 + Watch Provider + 번역 수집 |
| `0 */6 * * *` | 6시간마다 | 빠른 업데이트 1페이지 + Watch Provider + 신규 번역 수집 |
| `*/10 4-5 * * *` | 04:00-06:00 UTC (13:00-15:00 KST) 10분마다 | YouTube 리뷰 수집 (Piped API) |

### YouTube 리뷰 수집 로직 (Piped API)
- **Piped API 사용** - YouTube API 할당량 제한 없음
- 최근 1년 이내 출시 콘텐츠 대상
- **조회수 높은 순으로 정렬** 후 상위 10개 수집
- 콘텐츠당 최대 10개 리뷰 저장
- 10분마다 20개 콘텐츠 처리 → 시간당 120개 → 하루 240개 콘텐츠
- 기존 리뷰 있어도 업데이트 (조회수 갱신)

### Piped API 인스턴스 (Fallback 순서)
```
1. https://api.piped.private.coffee
2. https://pipedapi.syncpundit.io
3. https://api.piped.projectsegfau.lt
4. https://pipedapi.darkness.services
5. https://pipedapi.drgns.space
```

### TMDB 수집 로직
- **자동 수집(Cron)**: 최근 1년 이내 콘텐츠만 수집 (discover API + date filter)
- **수동 수집**: 기간 제한 없이 수집 가능 (admin API)

---

## 현재 데이터 현황 (2026-02-02 기준)

| 항목 | 수량 |
|------|------|
| 총 콘텐츠 | **~1,186개** |
| 영화 | ~588개 |
| 드라마 | ~598개 |
| 장르 | 27개 |
| OTT 플랫폼 | 17개 (KR 6개, US 6개, JP 5개) |
| YouTube 리뷰 | **~8,300개** (ko/en/ja) |
| 다국어 번역 | **~450개** (en ~230, ja ~200) |
| 다국어 Cast | **~3,500개** |

---

## 데이터베이스 스키마

### 주요 테이블
- `contents`: 영화/드라마 정보 (TMDb 데이터, 기본 한국어)
- `content_translations`: 다국어 번역 (title, overview, poster_path, **director**)
  - `language_code`: ko, en, ja
- `genres`: 장르 정보
- `platforms`: OTT 플랫폼 기본 정보
- `country_platforms`: 국가별 플랫폼 매핑 (KR, US, JP)
- `content_genres`: 콘텐츠-장르 매핑
- `content_platforms`: 콘텐츠-플랫폼 매핑 (country_code 포함)
- `content_cast`: 출연진 정보
  - `language_code`: 다국어 지원 (ko, en, ja)
  - `tmdb_person_id`: TMDB 인물 ID (다국어 매핑용)
- `youtube_reviews`: YouTube 리뷰 정보
  - `source`: `youtube_api` 또는 `piped_api`
  - `country_code`: 리뷰 언어 (ko, en, ja)

### 지원 플랫폼 (TMDb Provider ID)
| ID | 플랫폼 | 코드 |
|----|--------|------|
| 8 | Netflix | netflix |
| 97 | Watcha | watcha |
| 356 | Wavve | wavve |
| 337 | Disney+ | disney_plus |
| 350 | Apple TV+ | apple_tv_plus |
| 1883 | TVING | tving |
| 2062 | Coupang Play | coupang_play |

---

## 환경 설정

### Workers 환경 변수 (.dev.vars 또는 Cloudflare Secrets)
```
TMDB_API_KEY=your_tmdb_api_key
YOUTUBE_API_KEY=your_youtube_api_key
```

### D1 데이터베이스 설정 (workers/wrangler.toml)
```toml
[[d1_databases]]
binding = "DB"
database_name = "streamly-db-v2"
database_id = "26d3087f-71d7-45d2-bdb8-aef51cceb8e0"
```

### 프론트엔드 환경 변수

> **⚠️ 중요**: Next.js에서 `.env.local`이 `.env.production`보다 우선 적용됩니다!
> 프로덕션 빌드 시 `.env.local`의 값이 번들에 포함되므로, 반드시 프로덕션 URL을 사용해야 합니다.

- `.env.local`: `NEXT_PUBLIC_API_URL=https://whatview-api.magi815.workers.dev/api/v1`
- `.env.production`: `NEXT_PUBLIC_API_URL=https://whatview-api.magi815.workers.dev/api/v1`

로컬 개발 시에는 `.env.local`을 `http://127.0.0.1:8787/api/v1`로 변경하고, 배포 전에 다시 프로덕션 URL로 변경해야 합니다.

---

## 빌드 & 배포 명령어

### Workers 백엔드
```bash
cd workers

# 개발 서버 (localhost:8787)
npm run dev

# 프로덕션 배포
npm run deploy

# D1 스키마 적용
npm run db:local    # 로컬
npm run db:remote   # 원격
```

### Next.js 프론트엔드
```bash
cd frontend

# 개발 서버 (localhost:3000)
# 먼저 .env.local을 로컬 API URL로 변경
npm run dev

# 프로덕션 빌드 + 배포
# 먼저 .env.local이 프로덕션 API URL인지 확인!
npm run pages:deploy    # OpenNext 빌드 + Workers 배포

# 캐시 문제 발생 시
rm -rf .next .open-next && npm run pages:deploy
```

> **⚠️ 배포 전 체크리스트**:
> 1. `.env.local`의 `NEXT_PUBLIC_API_URL`이 `https://whatview-api.magi815.workers.dev/api/v1`인지 확인
> 2. API가 Mock 데이터를 표시하면 브라우저 캐시 문제 (Ctrl+Shift+R)

---

## 주요 결정 사항

### 1. Workers 배포 (Pages 대신)
- Next.js를 OpenNext로 빌드하여 Workers에 배포
- Pages 대비 더 세밀한 제어 가능
- 백엔드와 동일한 환경에서 관리

### 2. YouTube 리뷰 수집 최적화
- **Piped API 도입** (2026-01-27): YouTube API 할당량 제한 우회
  - YouTube API: 10,000 units/일 제한 → Piped API: 무제한
  - 자동 수집은 Piped API 사용, 수동 수집은 둘 다 지원
- 최근 1년 이내 콘텐츠만 대상
- **조회수 높은 순 정렬**: 고품질 리뷰 우선 수집
- 콘텐츠당 최대 10개 리뷰 저장

### 3. OTT 플랫폼 직접 연결
- 콘텐츠 상세 페이지에서 "시청 가능한 곳" 버튼 클릭 시 해당 OTT 검색 페이지로 이동
- 각 플랫폼별 검색 URL 형식 지원 (Netflix, Disney+, Tving, Wavve, Watcha, Coupang Play, Apple TV+)

### 4. 클라이언트 렌더링 전환
- 모든 페이지를 'use client'로 전환
- API 장애 시 Mock 데이터 fallback
- 스켈레톤 UI로 로딩 상태 표시

### 5. TMDB 수집 필터
- 자동 수집(Cron): discover API로 최근 1년 이내 콘텐츠만 수집
- 과거 콘텐츠는 이미 수집 완료 상태이므로 신규 콘텐츠만 추가

---

## 다음 작업 후보

### 기능 개선
1. **검색 개선** - 한글 초성 검색, 유사어 검색
2. **필터링 UI** - 장르, 연도, 평점 범위 등
3. **캐싱 전략** - KV를 활용한 응답 캐싱

### 고급 기능
1. **KMDB API 연동** - 한국 영화 보충 데이터
2. **AI 기반 추천** - Workers AI 활용

---

## 참고 문서

- [PROJECT.md](./PROJECT.md) - 전체 프로젝트 기획서
- [APP_INFO.md](./APP_INFO.md) - 앱 브랜드/스토어 정보
- [Cloudflare Workers 문서](https://developers.cloudflare.com/workers/)
- [Hono 프레임워크](https://hono.dev/)
- [Cloudflare D1 문서](https://developers.cloudflare.com/d1/)
- [OpenNext Cloudflare](https://opennext.js.org/cloudflare)

---

*Last Updated: 2026-01-27*
