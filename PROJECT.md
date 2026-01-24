# OTT 콘텐츠 소개 웹사이트 프로젝트

> **"오늘 뭐 볼까?"** - 국내 주요 OTT 플랫폼의 영화와 드라마를 한눈에 검색하고, 유튜브 리뷰와 함께 제공하는 통합 콘텐츠 가이드 서비스

---

## 📋 프로젝트 개요

### 서비스 범위

| 구분 | 포함 | 제외 |
|------|------|------|
| 영화 | OTT 스트리밍 가능 영화 | 극장 상영작 |
| 드라마 | 지상파 + OTT 오리지널 | - |
| 예능/다큐 | 추후 확장 | 1차 MVP 제외 |

### 대상 OTT 플랫폼

| 구분 | 플랫폼 |
|------|--------|
| 지상파 연계 | KBS, MBC, SBS (웨이브) |
| 글로벌 OTT | 넷플릭스, 디즈니+ |
| 국내 OTT | 티빙, 쿠팡플레이, 웨이브 |

### 핵심 차별점

- ✅ OTT별 시청 가능 여부 한눈에 확인
- ✅ 유튜브 리뷰 영상 큐레이션 (스포일러 없는 리뷰 선별)
- ✅ 신작 드라마 편성 정보 제공
- ✅ 깔끔한 UI와 빠른 검색

---

## 🗄️ 데이터 수집 전략

### 활용 가능한 공개 API

| API | 제공 데이터 | 용도 | 비용 |
|-----|------------|------|------|
| **TMDb** | 영화/드라마 정보, 포스터, 배우 | 기본 콘텐츠 정보 | 무료 |
| **KMDB** | 한국영화 상세정보 | 국내 영화 보충 | 무료 |
| **Watchmode** | OTT별 시청 가능 여부 | 플랫폼 필터링 | 부분무료 |
| **YouTube Data** | 영상 검색, 채널 정보 | 리뷰 영상 수집 | 무료 |

### 데이터 수집 방식

**자동 수집 (API 연동)**
- TMDb API: 신작 영화/드라마 자동 체크 (매일)
- Watchmode API: OTT 시청 가능 정보 동기화 (주 1회)
- YouTube Data API: 콘텐츠별 리뷰 영상 자동 검색

**수동 관리 필요**
- 신작 드라마 편성 정보 (방송사 발표 시)
- OTT 오리지널 신작 (TMDb 반영 전)
- 큐레이션 리뷰 영상 선별

### 저작권 준수 가이드

| 항목 | 상태 | 조건 |
|------|------|------|
| 공개 API 데이터 | ✅ 합법 | API 이용약관 준수 |
| 포스터/스틸컷 | ✅ 합법 | 소개 목적, 출처 표시 |
| 유튜브 임베드 | ✅ 합법 | 공식 iframe 사용 |
| OTT 사이트 크롤링 | ❌ 불가 | 약관 위반, 법적 위험 |

---

## 🛠️ 기술 스택

### 백엔드 (API 서버)
```
Framework:  Django 4.x + Django REST Framework
인증:       djangorestframework-simplejwt (JWT 토큰)
API 문서:   drf-spectacular (OpenAPI 3.0 / Swagger)
CORS:       django-cors-headers
푸시 알림:  firebase-admin
Scheduler:  Celery + Redis
Database:   PostgreSQL (운영) / SQLite (개발)
```

### 프론트엔드 (웹 + 앱)
```
추천 옵션 A: Flutter 3.x (웹 + iOS + Android 단일 코드베이스)
추천 옵션 B: React (웹) + React Native (앱)
대안 옵션:   Next.js (웹) + Capacitor (앱 래핑)
```

### 인프라
```
Backend:    Railway / Render (Redis 포함)
CDN:        CloudFlare (이미지, 정적 파일)
푸시 알림:  Firebase Cloud Messaging (FCM)
모니터링:   Sentry (에러 트래킹)
```

### 기술 스택 선택 가이드

| 상황 | 추천 스택 | 이유 |
|------|----------|------|
| 1인 개발 | Flutter | 단일 코드베이스, 학습 곡선 완만 |
| 팀 개발 (2-3명) | React + React Native | 생태계 풍부, 인력 확보 용이 |
| 웹 우선, 앱 나중 | Next.js + Capacitor | 웹 먼저 완성 후 앱 래핑 |
| 빠른 MVP | Django Templates + PWA | 앱스토어 없이 설치형 웹앱 |

---

## 🏗️ 시스템 아키텍처

### 전체 구조도

```
┌─────────────────────────────────────────────────────────────┐
│                        Clients                               │
├─────────────┬─────────────┬─────────────┬──────────────────┤
│  Flutter    │  Flutter    │  Flutter    │   PWA (옵션)      │
│  Web App    │  iOS App    │  Android    │                  │
└──────┬──────┴──────┬──────┴──────┬──────┴────────┬─────────┘
       │             │             │               │
       └─────────────┴──────┬──────┴───────────────┘
                            │
                            ▼
                    ┌───────────────┐
                    │  CloudFlare   │
                    │  (CDN/보안)    │
                    └───────┬───────┘
                            │
                            ▼
┌───────────────────────────────────────────────────────────┐
│                    Backend (Railway/Render)                │
│  ┌─────────────────┐  ┌─────────────┐  ┌───────────────┐  │
│  │  Django API     │  │   Celery    │  │    Redis      │  │
│  │  (REST + JWT)   │  │  (Workers)  │  │   (Cache)     │  │
│  └────────┬────────┘  └──────┬──────┘  └───────────────┘  │
│           │                  │                             │
│           └────────┬─────────┘                             │
│                    ▼                                       │
│           ┌─────────────────┐                              │
│           │   PostgreSQL    │                              │
│           └─────────────────┘                              │
└───────────────────────────────────────────────────────────┘
                            │
          ┌─────────────────┼─────────────────┐
          ▼                 ▼                 ▼
   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐
   │  Firebase   │   │  TMDb API   │   │ YouTube API │
   │  (FCM 푸시) │   │  (콘텐츠)    │   │  (리뷰)     │
   └─────────────┘   └─────────────┘   └─────────────┘
```

### API 통신 흐름

```
[앱/웹] ──HTTP/HTTPS──▶ [CloudFlare] ──▶ [Django API]
                                              │
                            ┌─────────────────┼─────────────────┐
                            ▼                 ▼                 ▼
                       [인증 확인]      [비즈니스 로직]     [캐시 확인]
                       (JWT 토큰)       (View/Serializer)   (Redis)
                            │                 │                 │
                            └────────┬────────┘                 │
                                     ▼                          │
                              [PostgreSQL] ◀────────────────────┘
```

---

## 📊 데이터베이스 설계

### ERD 개요

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Content   │────<│ Availability│>────│  Platform   │
└─────────────┘     └─────────────┘     └─────────────┘
       │
       │ 1:1
       ▼
┌─────────────┐
│    Drama    │
└─────────────┘
       │
       │ 1:N
       ▼
┌─────────────┐
│YouTubeReview│
└─────────────┘
```

### Content (콘텐츠)

```python
class Content(models.Model):
    CONTENT_TYPES = [
        ('movie', '영화'),
        ('drama', '드라마'),
    ]

    title = models.CharField(max_length=200)           # 제목 (한글)
    title_en = models.CharField(max_length=200)        # 제목 (영문)
    content_type = models.CharField(max_length=20, choices=CONTENT_TYPES)
    tmdb_id = models.IntegerField(unique=True)         # TMDb 고유 ID
    poster_url = models.URLField()                     # 포스터 이미지
    backdrop_url = models.URLField(blank=True)         # 배경 이미지 (상세페이지용)
    overview = models.TextField()                      # 줄거리
    release_date = models.DateField()                  # 개봉/방영일
    rating = models.FloatField(default=0)              # TMDb 평점
    vote_count = models.IntegerField(default=0)        # 평점 참여수
    popularity = models.FloatField(default=0)          # TMDb 인기도 (정렬용)
    runtime = models.IntegerField(null=True)           # 러닝타임 (분)
    director = models.CharField(max_length=100, blank=True)  # 감독
    cast = models.JSONField(default=list)              # 주요 출연진 [{name, character, profile_url}]
    is_adult = models.BooleanField(default=False)      # 성인물 여부
    genres = models.ManyToManyField('Genre')           # 장르
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=['-popularity']),
            models.Index(fields=['-release_date']),
            models.Index(fields=['content_type', '-popularity']),
        ]
```

### Platform (플랫폼)

```python
class Platform(models.Model):
    name = models.CharField(max_length=50)             # 넷플릭스, 티빙 등
    code = models.CharField(max_length=20)             # netflix, tving
    logo_url = models.URLField()                       # 로고 이미지
    website_url = models.URLField()                    # 공식 사이트
```

### Availability (시청 가능 정보)

```python
class Availability(models.Model):
    content = models.ForeignKey(Content, on_delete=models.CASCADE)
    platform = models.ForeignKey(Platform, on_delete=models.CASCADE)
    is_available = models.BooleanField(default=True)   # 현재 시청 가능
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['content', 'platform']
```

### Drama (드라마 추가정보)

```python
class Drama(models.Model):
    content = models.OneToOneField(Content, on_delete=models.CASCADE)
    broadcaster = models.CharField(max_length=20)      # KBS, MBC, tvN
    air_day = models.CharField(max_length=20)          # 월화, 수목, 금토일
    air_time = models.TimeField()                      # 방영 시간
    episode_count = models.IntegerField(default=16)    # 총 회차
    status = models.CharField(max_length=20)           # 방영중 / 완결
```

### YouTubeReview (유튜브 리뷰)

```python
class YouTubeReview(models.Model):
    content = models.ForeignKey(Content, on_delete=models.CASCADE)
    video_id = models.CharField(max_length=20)         # YouTube 영상 ID
    title = models.CharField(max_length=200)           # 영상 제목
    channel_name = models.CharField(max_length=100)    # 채널명
    thumbnail_url = models.URLField()                  # 썸네일
    is_featured = models.BooleanField(default=False)   # 추천 리뷰
    published_at = models.DateTimeField()              # 게시일
```

### Genre (장르)

```python
class Genre(models.Model):
    name = models.CharField(max_length=50)             # 액션, 로맨스 등
    tmdb_id = models.IntegerField(unique=True)         # TMDb 장르 ID
```

### User (사용자) - Django 기본 User 확장

```python
class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    nickname = models.CharField(max_length=50)         # 닉네임
    avatar_url = models.URLField(blank=True)           # 프로필 이미지
    favorite_platforms = models.ManyToManyField('Platform', blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
```

### UserDevice (앱 디바이스 - 푸시 알림용)

```python
class UserDevice(models.Model):
    DEVICE_TYPES = [
        ('ios', 'iOS'),
        ('android', 'Android'),
        ('web', 'Web'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='devices')
    device_token = models.CharField(max_length=255)    # FCM/APNs 토큰
    device_type = models.CharField(max_length=20, choices=DEVICE_TYPES)
    device_name = models.CharField(max_length=100, blank=True)  # iPhone 15, Galaxy S24
    is_active = models.BooleanField(default=True)
    last_used_at = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['user', 'device_token']
```

### NotificationSetting (알림 설정)

```python
class NotificationSetting(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    new_episode = models.BooleanField(default=True)    # 관심 드라마 새 회차
    new_content = models.BooleanField(default=True)    # 관심 장르 신작
    wishlist_available = models.BooleanField(default=True)  # 찜 콘텐츠 OTT 추가
    marketing = models.BooleanField(default=False)     # 마케팅/이벤트
    quiet_hours_start = models.TimeField(null=True)    # 방해금지 시작
    quiet_hours_end = models.TimeField(null=True)      # 방해금지 종료
```

### Wishlist (찜 목록)

```python
class Wishlist(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    content = models.ForeignKey(Content, on_delete=models.CASCADE)
    notify_on_available = models.BooleanField(default=True)  # OTT 추가 시 알림
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['user', 'content']
```

### UserRating (사용자 평점/리뷰)

```python
class UserRating(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    content = models.ForeignKey(Content, on_delete=models.CASCADE)
    score = models.IntegerField()                      # 1-5 별점
    comment = models.TextField(blank=True)             # 간단 코멘트 (선택)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['user', 'content']
```

### Notification (알림 기록)

```python
class Notification(models.Model):
    NOTIFICATION_TYPES = [
        ('new_episode', '새 회차'),
        ('new_content', '신작 알림'),
        ('wishlist', '찜 콘텐츠 알림'),
        ('system', '시스템 알림'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE)
    notification_type = models.CharField(max_length=20, choices=NOTIFICATION_TYPES)
    title = models.CharField(max_length=200)
    message = models.TextField()
    content = models.ForeignKey(Content, on_delete=models.SET_NULL, null=True)
    is_read = models.BooleanField(default=False)
    sent_at = models.DateTimeField(auto_now_add=True)
```

---

## 📱 주요 기능

### MVP (1차 출시)

| 기능 | 상세 설명 | 우선순위 |
|------|----------|---------|
| 콘텐츠 목록 | 영화/드라마 카드 그리드, 무한 스크롤 | P0 |
| 상세 페이지 | 포스터, 줄거리, 출연진, OTT 링크 | P0 |
| OTT 필터 | 플랫폼별 필터링 | P0 |
| 장르 필터 | 장르별 필터링 | P1 |
| 검색 | 제목, 배우명 통합 검색 | P0 |
| 유튜브 리뷰 | 관련 리뷰 영상 임베드 | P1 |

### 2차 확장 기능

| 기능 | 상세 설명 |
|------|----------|
| 회원 기능 | 회원가입, 로그인 (소셜 포함) |
| 찜 목록 | 보고싶은 콘텐츠 저장 |
| 사용자 평점 | 별점 및 간단 리뷰 |
| 신작 알림 | 관심 드라마 새 회차 알림 |
| 추천 시스템 | 시청 기록 기반 추천 |

---

## 🗺️ 페이지 구성

| 페이지 | URL | 설명 |
|--------|-----|------|
| 메인 | `/` | 인기/신작 콘텐츠, 검색창 |
| 영화 목록 | `/movies` | 영화 그리드 + 필터 |
| 드라마 목록 | `/dramas` | 드라마 그리드 + 필터 |
| 상세 페이지 | `/content/<id>` | 콘텐츠 상세 정보 |
| 검색 결과 | `/search?q=` | 검색 결과 목록 |
| OTT별 보기 | `/platform/<code>` | 플랫폼별 콘텐츠 |

---

## 🔌 API 엔드포인트 명세

### 인증 API

| Method | Endpoint | 설명 | 인증 |
|--------|----------|------|------|
| POST | `/api/v1/auth/register/` | 회원가입 | - |
| POST | `/api/v1/auth/login/` | 로그인 (JWT 발급) | - |
| POST | `/api/v1/auth/token/refresh/` | 토큰 갱신 | - |
| POST | `/api/v1/auth/social/google/` | 구글 소셜 로그인 | - |
| POST | `/api/v1/auth/social/kakao/` | 카카오 소셜 로그인 | - |
| POST | `/api/v1/auth/social/apple/` | 애플 소셜 로그인 | - |
| POST | `/api/v1/auth/logout/` | 로그아웃 | 필요 |

### 콘텐츠 API

| Method | Endpoint | 설명 | 인증 |
|--------|----------|------|------|
| GET | `/api/v1/contents/` | 콘텐츠 목록 (필터/정렬) | - |
| GET | `/api/v1/contents/<id>/` | 콘텐츠 상세 | - |
| GET | `/api/v1/contents/movies/` | 영화 목록 | - |
| GET | `/api/v1/contents/dramas/` | 드라마 목록 | - |
| GET | `/api/v1/contents/search/` | 통합 검색 | - |
| GET | `/api/v1/contents/<id>/reviews/` | 유튜브 리뷰 목록 | - |
| GET | `/api/v1/contents/trending/` | 인기 콘텐츠 | - |
| GET | `/api/v1/contents/new-releases/` | 신작 콘텐츠 | - |

**쿼리 파라미터 예시:**
```
GET /api/v1/contents/?platform=netflix&genre=28&sort=-popularity&page=1
```

### 플랫폼 API

| Method | Endpoint | 설명 | 인증 |
|--------|----------|------|------|
| GET | `/api/v1/platforms/` | 플랫폼 목록 | - |
| GET | `/api/v1/platforms/<code>/` | 플랫폼 상세 | - |
| GET | `/api/v1/platforms/<code>/contents/` | 플랫폼별 콘텐츠 | - |

### 사용자 API

| Method | Endpoint | 설명 | 인증 |
|--------|----------|------|------|
| GET | `/api/v1/users/me/` | 내 정보 조회 | 필요 |
| PATCH | `/api/v1/users/me/` | 내 정보 수정 | 필요 |
| GET | `/api/v1/users/me/wishlist/` | 찜 목록 조회 | 필요 |
| POST | `/api/v1/users/me/wishlist/` | 찜 추가 | 필요 |
| DELETE | `/api/v1/users/me/wishlist/<id>/` | 찜 삭제 | 필요 |
| GET | `/api/v1/users/me/ratings/` | 내 평점 목록 | 필요 |
| POST | `/api/v1/contents/<id>/rate/` | 평점 등록 | 필요 |
| PATCH | `/api/v1/contents/<id>/rate/` | 평점 수정 | 필요 |

### 알림 API (앱 전용)

| Method | Endpoint | 설명 | 인증 |
|--------|----------|------|------|
| POST | `/api/v1/devices/register/` | 디바이스 토큰 등록 | 필요 |
| DELETE | `/api/v1/devices/<token>/` | 디바이스 토큰 삭제 | 필요 |
| GET | `/api/v1/notifications/` | 알림 목록 | 필요 |
| PATCH | `/api/v1/notifications/<id>/read/` | 읽음 처리 | 필요 |
| GET | `/api/v1/notifications/settings/` | 알림 설정 조회 | 필요 |
| PATCH | `/api/v1/notifications/settings/` | 알림 설정 수정 | 필요 |

### API 응답 형식

**성공 응답:**
```json
{
  "status": "success",
  "data": { ... },
  "meta": {
    "page": 1,
    "total_pages": 10,
    "total_count": 100
  }
}
```

**에러 응답:**
```json
{
  "status": "error",
  "code": "INVALID_TOKEN",
  "message": "토큰이 만료되었습니다."
}
```

---

## 📅 개발 일정 (20주) - 웹 + 앱 통합

### Phase 1: 백엔드 API 구축 (Week 1-5)

#### Week 1: 프로젝트 초기 설정
- [ ] Django 프로젝트 생성 및 구조 설계
- [ ] DRF, JWT, CORS 등 패키지 설치
- [ ] DB 모델 설계 및 마이그레이션
- [ ] Django Admin 설정
- [ ] GitHub 저장소 + CI/CD 기본 설정

#### Week 2: 외부 API 연동
- [ ] TMDb API 키 발급 및 연동
- [ ] KMDB API 연동 (국내 영화 보충)
- [ ] YouTube Data API 연동
- [ ] 데이터 수집 스크립트 작성
- [ ] 에러 핸들링 및 재시도 로직

#### Week 3: 콘텐츠 API 개발
- [ ] Content CRUD API
- [ ] Platform API
- [ ] 검색 API (ElasticSearch 검토)
- [ ] 필터링/정렬 API
- [ ] API 문서화 (Swagger)

#### Week 4: 인증 시스템
- [ ] JWT 인증 구현
- [ ] 회원가입/로그인 API
- [ ] 소셜 로그인 (Google, Kakao, Apple)
- [ ] 토큰 갱신 로직
- [ ] 비밀번호 재설정

#### Week 5: 사용자 기능 API
- [ ] 찜 목록 API
- [ ] 사용자 평점/리뷰 API
- [ ] 프로필 관리 API
- [ ] 초기 데이터 수집 (영화/드라마 500개)

### Phase 2: Flutter 웹 개발 (Week 6-10)

#### Week 6: Flutter 프로젝트 설정
- [ ] Flutter 프로젝트 생성
- [ ] 폴더 구조 설계 (Clean Architecture)
- [ ] 상태관리 선택 (Riverpod/Bloc)
- [ ] API 클라이언트 구현 (Dio)
- [ ] 테마 및 공통 위젯

#### Week 7-8: 핵심 화면 개발
- [ ] 메인 페이지 (인기/신작)
- [ ] 콘텐츠 목록 (무한 스크롤)
- [ ] 콘텐츠 상세 페이지
- [ ] 검색 페이지
- [ ] OTT 필터 UI

#### Week 9: 사용자 기능 화면
- [ ] 로그인/회원가입 화면
- [ ] 소셜 로그인 연동
- [ ] 마이페이지
- [ ] 찜 목록 화면
- [ ] 평점/리뷰 작성

#### Week 10: 유튜브 리뷰 연동
- [ ] 유튜브 영상 임베드
- [ ] 리뷰 목록 UI
- [ ] 영상 플레이어 최적화

### Phase 3: Flutter 앱 개발 (Week 11-14)

#### Week 11: 앱 환경 설정
- [ ] iOS/Android 프로젝트 설정
- [ ] 앱 아이콘, 스플래시 스크린
- [ ] 딥링크 설정
- [ ] 네이티브 기능 연동 준비

#### Week 12: 푸시 알림 구현
- [ ] Firebase 프로젝트 설정
- [ ] FCM 연동 (iOS/Android)
- [ ] 백엔드 푸시 발송 로직
- [ ] 알림 설정 화면
- [ ] 디바이스 토큰 관리

#### Week 13: 앱 전용 기능
- [ ] 오프라인 모드 (캐싱)
- [ ] 앱 내 브라우저 (OTT 링크)
- [ ] 공유 기능
- [ ] 앱 업데이트 체크

#### Week 14: 앱 최적화
- [ ] 성능 최적화 (이미지 캐싱)
- [ ] 메모리 관리
- [ ] 애니메이션 개선
- [ ] 접근성 (A11y) 대응

### Phase 4: 자동화 및 배포 (Week 15-17)

#### Week 15: 백엔드 자동화
- [ ] Celery + Redis 설정
- [ ] 매일 신작 체크 태스크
- [ ] OTT 시청 가능 정보 동기화
- [ ] 리뷰 영상 자동 수집
- [ ] 에러 모니터링 (Sentry)

#### Week 16: 백엔드 배포
- [ ] Railway/Render 배포
- [ ] PostgreSQL 설정
- [ ] Redis 설정
- [ ] 도메인 + SSL
- [ ] 환경변수 관리

#### Week 17: 앱 스토어 배포
- [ ] App Store 개발자 등록
- [ ] Play Store 개발자 등록
- [ ] 앱 스토어 스크린샷/설명
- [ ] 심사 제출 및 대응
- [ ] 웹 버전 배포 (Vercel/Cloudflare)

### Phase 5: 테스트 및 런칭 (Week 18-20)

#### Week 18: QA 및 테스트
- [ ] 단위 테스트 작성
- [ ] 통합 테스트
- [ ] UI/UX 테스트
- [ ] 다양한 기기 테스트
- [ ] 베타 테스터 모집

#### Week 19: 버그 수정 및 개선
- [ ] 베타 피드백 반영
- [ ] 성능 최적화
- [ ] 보안 점검
- [ ] 최종 버그 수정

#### Week 20: 정식 런칭
- [ ] 앱 스토어 정식 출시
- [ ] 웹 서비스 오픈
- [ ] 모니터링 대시보드 구축
- [ ] 운영 문서 작성
- [ ] 마케팅 시작

---

## 📅 MVP 단축 일정 (12주) - 웹 우선

> 앱 개발을 2차로 미루고 웹 MVP를 먼저 출시하는 경우

### Phase 1: 백엔드 (Week 1-4)
- Django API 서버 구축
- 외부 API 연동 및 데이터 수집
- 인증 시스템 (JWT)

### Phase 2: 웹 프론트엔드 (Week 5-9)
- Flutter Web 또는 Next.js
- 핵심 기능 (목록, 상세, 검색, 필터)
- 유튜브 리뷰 연동

### Phase 3: 배포 및 테스트 (Week 10-12)
- 서버 배포 (Railway)
- 웹 배포 (Vercel)
- QA 및 버그 수정
- 정식 오픈

### Phase 4: 앱 개발 (이후 8주)
- Flutter iOS/Android 앱
- 푸시 알림
- 앱 스토어 배포

---

## 💰 수익화 방안

| 방식 | 설명 | 예상 시점 |
|------|------|----------|
| Google AdSense | 페이지 내 배너/네이티브 광고 | 출시 후 |
| OTT 제휴 링크 | 가입 유도 시 수수료 (CPA) | 트래픽 확보 후 |
| 쿠팡 파트너스 | 관련 상품 추천 | 출시 후 |
| 프리미엄 기능 | 광고 제거, 고급 필터 | 사용자 확보 후 |

---

## ⚠️ 리스크 및 대응

### 기술적 리스크

| 리스크 | 영향 | 확률 | 대응 방안 |
|--------|------|------|----------|
| TMDb API 정책 변경 | 데이터 수집 중단 | 낮음 | KMDB 등 대체 API 준비, 자체 DB 구축 |
| Watchmode API 유료화 | OTT 정보 비용 증가 | 높음 | **MVP에서 제외**, 수동 관리 또는 사용자 제보 |
| YouTube API 할당량 초과 | 리뷰 수집 중단 | 중간 | 캐싱 강화, 할당량 모니터링 |
| 앱 스토어 심사 거절 | 출시 지연 | 중간 | 가이드라인 사전 검토, 리뷰어 피드백 대응 |

### 비즈니스 리스크

| 리스크 | 영향 | 확률 | 대응 방안 |
|--------|------|------|----------|
| 드라마 정보 부족 | 콘텐츠 품질 저하 | 중간 | 수동 입력 + 커뮤니티 기여 |
| 저작권 이슈 | 법적 분쟁 | 낮음 | API 데이터만 사용, 크롤링 금지 |
| OTT 사업자 제재 | 서비스 중단 | 낮음 | 공식 API만 사용, 제휴 추진 |
| 경쟁 서비스 등장 | 시장 점유율 하락 | 중간 | 차별화 기능 강화, 빠른 피드백 반영 |

### 앱 개발 관련 리스크

| 리스크 | 영향 | 확률 | 대응 방안 |
|--------|------|------|----------|
| Flutter 버전 호환성 | 빌드 실패 | 중간 | 버전 고정, 정기 업데이트 |
| iOS/Android 파편화 | 기기별 버그 | 높음 | 다양한 기기 테스트, Firebase Test Lab |
| 푸시 알림 전달 실패 | 사용자 이탈 | 중간 | FCM + APNs 이중 확인, 실패 로그 모니터링 |
| 앱 개발자 계정 비용 | 초기 비용 증가 | 확정 | Apple $99/년, Google $25 일회성 |

### Watchmode API 대안 검토

| 대안 | 장점 | 단점 | 추천 |
|------|------|------|------|
| **수동 관리** | 무료, 정확 | 노동 집약적 | MVP 단계 |
| **사용자 제보** | 커뮤니티 기여 | 신뢰도 낮음 | 2차 기능 |
| **JustWatch 비공식** | 데이터 풍부 | 법적 리스크 | 비추천 |
| **OTT 제휴** | 공식 데이터 | 협상 어려움 | 장기 목표 |

---

## 📈 성공 지표 (KPI)

| 지표 | 1개월 | 3개월 | 6개월 |
|------|-------|-------|-------|
| 일일 방문자 (DAU) | 100명 | 500명 | 2,000명 |
| 등록 콘텐츠 수 | 500개 | 1,500개 | 3,000개 |
| 월 수익 | - | 5만원 | 30만원 |
| 회원 수 | - | 100명 | 1,000명 |

---

## 🚀 즉시 실행 항목 (Week 1)

### API 키 발급

1. **TMDb API**: https://www.themoviedb.org/settings/api
2. **KMDB API**: https://www.kmdb.or.kr/info/api/apiDetail/6
3. **YouTube Data API**: https://console.cloud.google.com/

### 프로젝트 초기화 명령어

**백엔드 (Django)**
```bash
# 1. 프로젝트 생성
django-admin startproject whattowatch_api
cd whattowatch_api

# 2. 앱 생성
python manage.py startapp contents
python manage.py startapp platforms
python manage.py startapp users
python manage.py startapp notifications

# 3. 필수 패키지 설치
pip install djangorestframework
pip install djangorestframework-simplejwt
pip install drf-spectacular
pip install django-cors-headers
pip install requests
pip install python-dotenv
pip install celery redis
pip install firebase-admin
pip install Pillow
pip install gunicorn
pip install psycopg2-binary
pip install sentry-sdk

# 4. 환경변수 파일 생성
touch .env

# 5. requirements.txt 생성
pip freeze > requirements.txt
```

**프론트엔드 (Flutter)**
```bash
# 1. Flutter 프로젝트 생성
flutter create whattowatch_app
cd whattowatch_app

# 2. 의존성 추가 (pubspec.yaml)
flutter pub add dio                    # HTTP 클라이언트
flutter pub add flutter_riverpod       # 상태관리
flutter pub add go_router              # 라우팅
flutter pub add cached_network_image   # 이미지 캐싱
flutter pub add flutter_secure_storage # 토큰 저장
flutter pub add firebase_messaging     # 푸시 알림
flutter pub add youtube_player_flutter # 유튜브 플레이어
flutter pub add shimmer                # 로딩 애니메이션

# 3. 웹 빌드 활성화
flutter config --enable-web

# 4. 플랫폼별 빌드
flutter build web      # 웹
flutter build ios      # iOS
flutter build apk      # Android
```

### .env 파일 템플릿

```env
# Django
SECRET_KEY=your-secret-key-here
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

# Database
DATABASE_URL=postgres://user:pass@host:port/dbname

# Redis (Celery)
REDIS_URL=redis://localhost:6379/0

# External APIs
TMDB_API_KEY=your-tmdb-api-key
KMDB_API_KEY=your-kmdb-api-key
YOUTUBE_API_KEY=your-youtube-api-key

# Firebase (푸시 알림)
FIREBASE_CREDENTIALS_PATH=./firebase-credentials.json

# JWT 설정
JWT_ACCESS_TOKEN_LIFETIME=60        # 분
JWT_REFRESH_TOKEN_LIFETIME=7        # 일

# Sentry (에러 모니터링)
SENTRY_DSN=your-sentry-dsn

# CORS
CORS_ALLOWED_ORIGINS=http://localhost:3000,https://whattowatch.app
```

---

## 📁 프로젝트 구조

### 백엔드 (Django API)

```
whattowatch_api/
├── manage.py
├── requirements.txt
├── .env
├── .gitignore
├── Dockerfile
├── docker-compose.yml
│
├── config/                    # 프로젝트 설정
│   ├── settings/
│   │   ├── base.py           # 공통 설정
│   │   ├── local.py          # 개발 환경
│   │   └── production.py     # 운영 환경
│   ├── urls.py
│   ├── celery.py
│   └── wsgi.py
│
├── apps/
│   ├── contents/              # 콘텐츠 앱
│   │   ├── models.py
│   │   ├── views.py
│   │   ├── urls.py
│   │   ├── serializers.py
│   │   ├── filters.py        # 필터링 로직
│   │   ├── admin.py
│   │   └── services/
│   │       ├── tmdb.py       # TMDb API 서비스
│   │       ├── kmdb.py       # KMDB API 서비스
│   │       └── youtube.py    # YouTube API 서비스
│   │
│   ├── platforms/             # 플랫폼 앱
│   │   ├── models.py
│   │   ├── views.py
│   │   ├── urls.py
│   │   ├── serializers.py
│   │   └── admin.py
│   │
│   ├── users/                 # 사용자 앱
│   │   ├── models.py         # UserProfile, Wishlist, UserRating
│   │   ├── views.py
│   │   ├── urls.py
│   │   ├── serializers.py
│   │   └── admin.py
│   │
│   └── notifications/         # 알림 앱
│       ├── models.py         # UserDevice, NotificationSetting
│       ├── views.py
│       ├── urls.py
│       ├── serializers.py
│       └── services/
│           └── firebase.py   # FCM 푸시 발송
│
├── core/                      # 공통 모듈
│   ├── permissions.py        # 커스텀 권한
│   ├── pagination.py         # 페이지네이션
│   ├── exceptions.py         # 커스텀 예외
│   └── utils.py              # 유틸리티 함수
│
└── tasks/                     # Celery 태스크
    ├── __init__.py
    ├── content_sync.py       # 콘텐츠 동기화
    ├── youtube_sync.py       # 리뷰 영상 수집
    └── notification.py       # 푸시 알림 발송
```

### 프론트엔드 (Flutter)

```
whattowatch_app/
├── pubspec.yaml
├── analysis_options.yaml
│
├── lib/
│   ├── main.dart
│   │
│   ├── core/                  # 핵심 모듈
│   │   ├── constants/        # 상수
│   │   ├── theme/            # 테마 설정
│   │   ├── routes/           # 라우팅
│   │   └── utils/            # 유틸리티
│   │
│   ├── data/                  # 데이터 레이어
│   │   ├── api/              # API 클라이언트
│   │   │   ├── api_client.dart
│   │   │   └── interceptors/
│   │   ├── models/           # 데이터 모델
│   │   └── repositories/     # 리포지토리 구현
│   │
│   ├── domain/                # 도메인 레이어
│   │   ├── entities/         # 엔티티
│   │   ├── repositories/     # 리포지토리 인터페이스
│   │   └── usecases/         # 유스케이스
│   │
│   ├── presentation/          # UI 레이어
│   │   ├── providers/        # Riverpod 프로바이더
│   │   ├── screens/          # 화면
│   │   │   ├── home/
│   │   │   ├── content_list/
│   │   │   ├── content_detail/
│   │   │   ├── search/
│   │   │   ├── auth/
│   │   │   ├── profile/
│   │   │   └── settings/
│   │   └── widgets/          # 공통 위젯
│   │       ├── content_card.dart
│   │       ├── platform_chip.dart
│   │       └── youtube_player.dart
│   │
│   └── services/              # 서비스
│       ├── auth_service.dart
│       ├── storage_service.dart
│       └── notification_service.dart
│
├── assets/                    # 에셋
│   ├── images/
│   ├── icons/
│   └── fonts/
│
├── ios/                       # iOS 네이티브
├── android/                   # Android 네이티브
└── web/                       # 웹 설정
```

---

## 📞 참고 자료

### 백엔드
- [Django REST Framework](https://www.django-rest-framework.org/)
- [Simple JWT](https://django-rest-framework-simplejwt.readthedocs.io/)
- [drf-spectacular (API 문서화)](https://drf-spectacular.readthedocs.io/)
- [Celery](https://docs.celeryq.dev/)

### 프론트엔드
- [Flutter 공식 문서](https://docs.flutter.dev/)
- [Riverpod (상태관리)](https://riverpod.dev/)
- [go_router (라우팅)](https://pub.dev/packages/go_router)

### 외부 API
- [TMDb API 문서](https://developer.themoviedb.org/docs)
- [KMDB API 문서](https://www.kmdb.or.kr/info/api/apiDetail/6)
- [YouTube Data API 문서](https://developers.google.com/youtube/v3)
- [Watchmode API 문서](https://api.watchmode.com/docs/) *(참고용, MVP 제외)*

### 배포 및 인프라
- [Railway 문서](https://docs.railway.app/)
- [Firebase Cloud Messaging](https://firebase.google.com/docs/cloud-messaging)
- [Sentry (에러 모니터링)](https://docs.sentry.io/)

### 앱 스토어
- [App Store 심사 가이드라인](https://developer.apple.com/app-store/review/guidelines/)
- [Google Play 정책](https://play.google.com/console/about/guides/releasewithconfidence/)

---

## 💡 추가 고려사항

### 앱 스토어 심사 대비
- **Apple**: 최소 기능 요구사항 충족, 웹뷰 단독 앱 거절 가능성
- **Google**: 개인정보 처리방침 필수, 타겟 연령 설정

### 수익화 주의사항
- 인앱 결제 시 Apple/Google 수수료 30%
- 외부 결제 유도 시 스토어 정책 위반 가능

### 유지보수 계획
- Flutter/Django 정기 버전 업데이트
- 외부 API 변경사항 모니터링
- 사용자 피드백 반영 주기 설정

---

*마지막 업데이트: 2026년 1월*
