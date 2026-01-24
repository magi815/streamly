# CLAUDE.md - Streamly 프로젝트 컨텍스트

> Claude Code AI 어시스턴트를 위한 프로젝트 컨텍스트 문서

---

## 프로젝트 개요

**Streamly**는 국내 주요 OTT 플랫폼(넷플릭스, 티빙, 웨이브, 쿠팡플레이, 디즈니+ 등)의 영화와 드라마를 통합 검색하고, 어디서 시청 가능한지 확인할 수 있는 **범용 콘텐츠 가이드 서비스**입니다.

> **참고**: 로그인, 회원가입, 찜목록, 평점, 푸시 알림 등 개인화 기능은 의도적으로 제외되었습니다. 누구나 로그인 없이 콘텐츠를 검색하고 정보를 확인할 수 있습니다.

### 기술 스택 (Cloudflare Full Stack)
- **백엔드**: Cloudflare Workers + Hono (TypeScript)
- **데이터베이스**: Cloudflare D1 (SQLite)
- **프론트엔드**: Next.js 16 + TypeScript + Tailwind CSS
- **배포**: Cloudflare Pages (프론트엔드) / Cloudflare Workers (백엔드)
- **자동화**: Cron Triggers (콘텐츠 자동 수집)

### 무료 티어 제한
- Workers: 100,000 요청/일
- D1: 5GB 저장소, 5M 읽기/일
- Pages: 무제한 요청, 무제한 대역폭

---

## 프로젝트 구조

```
project-claude/
├── workers/                   # Cloudflare Workers 백엔드
│   ├── src/
│   │   ├── index.ts           # 메인 Hono 앱
│   │   ├── types.ts           # TypeScript 타입
│   │   ├── scheduled.ts       # Cron Trigger 핸들러
│   │   └── routes/
│   │       ├── contents.ts    # 콘텐츠 API
│   │       ├── genres.ts      # 장르 API
│   │       └── platforms.ts   # 플랫폼 API
│   ├── schema.sql             # D1 데이터베이스 스키마
│   ├── seed.sql               # 초기 데이터
│   ├── wrangler.toml          # Workers 설정
│   └── package.json
├── frontend/                  # Next.js 앱
│   ├── src/
│   │   ├── app/               # App Router 페이지
│   │   ├── components/        # React 컴포넌트
│   │   ├── lib/               # API 클라이언트, Mock 데이터
│   │   └── types/             # TypeScript 타입
│   ├── wrangler.toml          # Pages 설정
│   ├── next.config.ts
│   └── package.json
├── apps/                      # (레거시) Django 앱 - 참조용
├── config/                    # (레거시) Django 설정 - 참조용
├── PROJECT.md                 # 상세 프로젝트 기획 문서
└── APP_INFO.md                # 앱 브랜드/스토어 정보
```

---

## 완료된 작업 내역

### Phase 1: Django 백엔드 (완료 - 레거시)
- [x] Django 프로젝트 구조 설정
- [x] 데이터베이스 모델 설계
- [x] TMDb API 연동 서비스
- [x] REST API 엔드포인트
- [x] Celery 태스크 구현

### Phase 2: Next.js 프론트엔드 (완료)
- [x] Next.js 16 + TypeScript + Tailwind CSS 설정
- [x] 홈 화면 (인기/신작/영화/드라마 섹션)
- [x] 검색 화면 (실시간 검색 with useDeferredValue)
- [x] 콘텐츠 상세 화면 (SSR + SEO 메타데이터)
- [x] 영화/드라마/인기/신작 목록 화면
- [x] YouTube 리뷰 표시 UI
- [x] 반응형 디자인

### Phase 3: Cloudflare 마이그레이션 (완료)
- [x] Cloudflare Workers 프로젝트 설정 (Hono)
- [x] D1 데이터베이스 스키마 설계
- [x] API 엔드포인트 구현 (contents, genres, platforms)
- [x] Cron Triggers 설정 (콘텐츠 자동 수집)
- [x] Next.js Cloudflare Pages 설정
- [x] 환경 변수 및 배포 스크립트

---

## 주요 API 엔드포인트

### 콘텐츠 (`/api/v1/contents/`)
| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/` | 콘텐츠 목록 (필터/정렬) |
| GET | `/:id` | 콘텐츠 상세 |
| GET | `/movies/` | 영화 목록 |
| GET | `/dramas/` | 드라마 목록 |
| GET | `/trending/` | 인기 콘텐츠 |
| GET | `/new-releases/` | 신작 콘텐츠 |
| GET | `/search/?q=` | 검색 |
| GET | `/:id/reviews/` | YouTube 리뷰 목록 |

### 플랫폼 (`/api/v1/platforms/`)
| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/` | 플랫폼 목록 |
| GET | `/:id` | 플랫폼 상세 |

### 장르 (`/api/v1/genres/`)
| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/` | 장르 목록 |

---

## Cron Triggers (자동화)

Workers의 Cron Triggers로 콘텐츠를 자동 수집합니다.

| 크론 표현식 | 스케줄 | 설명 |
|-------------|--------|------|
| `0 3 * * *` | 매일 03:00 UTC | 장르 동기화 + 인기 콘텐츠 수집 (5페이지) |
| `0 4 * * *` | 매일 04:00 UTC | 트렌딩 콘텐츠 수집 (2페이지) |
| `0 */6 * * *` | 6시간마다 | 빠른 업데이트 (1페이지) |

---

## 환경 설정

### Workers 환경 변수 (wrangler.toml 또는 대시보드)
```toml
[vars]
TMDB_API_KEY = "your_tmdb_api_key"
YOUTUBE_API_KEY = "your_youtube_api_key"
```

### D1 데이터베이스 설정
```toml
[[d1_databases]]
binding = "DB"
database_name = "streamly-db"
database_id = "your-database-id"  # wrangler d1 create 후 생성됨
```

### 프론트엔드 환경 변수 (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:8787/api/v1
```

---

## 빌드 & 실행 명령어

### Workers 백엔드
```bash
cd workers

# 패키지 설치
npm install

# D1 데이터베이스 생성 (최초 1회)
wrangler d1 create streamly-db

# 로컬 D1에 스키마 적용
npm run db:local

# 로컬 D1에 시드 데이터 적용
npm run db:seed

# 개발 서버 (localhost:8787)
npm run dev

# 프로덕션 배포
npm run deploy

# 원격 D1에 스키마 적용
npm run db:remote
```

### Next.js 프론트엔드
```bash
cd frontend

# 패키지 설치
npm install

# 개발 서버 (localhost:3000)
npm run dev

# 프로덕션 빌드
npm run build

# Cloudflare Pages 빌드
npm run pages:build

# Cloudflare Pages 배포
npm run pages:deploy
```

---

## 배포 프로세스

### 1. D1 데이터베이스 생성
```bash
cd workers
wrangler d1 create streamly-db
# 출력된 database_id를 wrangler.toml에 복사
```

### 2. 환경 변수 설정
```bash
# Cloudflare 대시보드 또는 CLI로 설정
wrangler secret put TMDB_API_KEY
wrangler secret put YOUTUBE_API_KEY
```

### 3. Workers 배포
```bash
cd workers
npm run deploy
```

### 4. Pages 배포
```bash
cd frontend
npm run pages:deploy
# 또는 GitHub 연동으로 자동 배포
```

---

## 주요 결정 사항

### 1. Cloudflare 풀스택 선택 이유
- **무료 티어** - 개인 프로젝트에 적합한 넉넉한 무료 한도
- **엣지 컴퓨팅** - 전 세계 300+ 위치에서 빠른 응답
- **통합 관리** - Workers, D1, Pages를 하나의 대시보드에서 관리
- **간단한 배포** - Git push만으로 자동 배포

### 2. 기존 Django → Workers 전환
- Django/Celery/PostgreSQL → Workers/D1/Cron Triggers
- 운영 비용 절감 (Railway/Render 대비)
- 서버리스로 관리 부담 감소

### 3. 범용 서비스 유지
- 로그인/회원가입 기능 **제외** - 누구나 접근 가능
- 찜목록, 평점, 시청기록 **제외** - 개인화 없음
- 푸시 알림 **제외** - 사용자 데이터 수집 없음

---

## 다음 작업 후보

### 즉시 가능
1. **실제 API 연동** - Mock 데이터를 Workers API로 교체
2. **OTT 시청 가능 정보 표시** - 플랫폼별 시청 가능 여부
3. **필터링 UI** - 장르, 연도, 평점 범위 등

### 기능 개선
1. **YouTube 리뷰 자동 수집** - Cron Trigger에 YouTube API 연동
2. **검색 개선** - 한글 초성 검색, 유사어 검색
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

---

*Last Updated: 2026-01-23*
