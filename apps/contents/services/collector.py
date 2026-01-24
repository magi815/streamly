"""
콘텐츠 데이터 수집 서비스
TMDb API에서 데이터를 가져와 DB에 저장
"""
import logging
from typing import Optional
from django.db import transaction

from apps.contents.models import Content, Genre, Drama
from apps.contents.services.tmdb import tmdb_service

logger = logging.getLogger(__name__)


class ContentCollector:
    """콘텐츠 수집기"""

    def __init__(self):
        self.tmdb = tmdb_service
        self._genre_cache = {}

    # ========== 장르 ==========

    def sync_genres(self) -> tuple[int, int]:
        """TMDb에서 장르 동기화"""
        movie_genres = self.tmdb.get_movie_genres()
        tv_genres = self.tmdb.get_tv_genres()

        # 중복 제거 (movie와 tv 장르 합치기)
        all_genres = {g["id"]: g["name"] for g in movie_genres}
        all_genres.update({g["id"]: g["name"] for g in tv_genres})

        created_count = 0
        updated_count = 0

        for tmdb_id, name in all_genres.items():
            genre, created = Genre.objects.update_or_create(
                tmdb_id=tmdb_id,
                defaults={"name": name}
            )
            if created:
                created_count += 1
            else:
                updated_count += 1

        # 캐시 갱신
        self._genre_cache = {g.tmdb_id: g for g in Genre.objects.all()}

        logger.info(f"장르 동기화 완료: 생성 {created_count}, 업데이트 {updated_count}")
        return created_count, updated_count

    def _get_genre(self, tmdb_id: int) -> Optional[Genre]:
        """캐시에서 장르 조회"""
        if not self._genre_cache:
            self._genre_cache = {g.tmdb_id: g for g in Genre.objects.all()}
        return self._genre_cache.get(tmdb_id)

    # ========== 영화 ==========

    @transaction.atomic
    def save_movie(self, movie_data: dict, fetch_detail: bool = True) -> Optional[Content]:
        """영화 데이터 저장"""
        try:
            tmdb_id = movie_data["id"]

            # 상세 정보 가져오기
            detail = None
            if fetch_detail:
                detail = self.tmdb.get_movie_detail(tmdb_id)

            # 데이터 파싱
            parsed = self.tmdb.parse_movie_data(movie_data, detail)

            # release_date 처리
            release_date = parsed.get("release_date")
            if release_date == "":
                release_date = None

            # Content 저장
            content, created = Content.objects.update_or_create(
                tmdb_id=tmdb_id,
                defaults={
                    "title": parsed["title"],
                    "title_en": parsed["title_en"],
                    "content_type": "movie",
                    "poster_url": parsed["poster_url"],
                    "backdrop_url": parsed["backdrop_url"],
                    "overview": parsed["overview"],
                    "release_date": release_date,
                    "rating": parsed["rating"],
                    "vote_count": parsed["vote_count"],
                    "popularity": parsed["popularity"],
                    "runtime": parsed.get("runtime"),
                    "director": parsed.get("director", ""),
                    "cast": parsed.get("cast", []),
                    "is_adult": parsed["is_adult"],
                }
            )

            # 장르 연결
            genre_ids = parsed.get("genre_ids", [])
            if detail:
                genre_ids = [g["id"] for g in detail.get("genres", [])]

            genres = [self._get_genre(gid) for gid in genre_ids]
            genres = [g for g in genres if g]
            content.genres.set(genres)

            action = "생성" if created else "업데이트"
            logger.debug(f"영화 {action}: {content.title}")
            return content

        except Exception as e:
            logger.error(f"영화 저장 실패 (tmdb_id={movie_data.get('id')}): {e}")
            return None

    def collect_popular_movies(self, pages: int = 5) -> int:
        """인기 영화 수집"""
        total = 0
        for page in range(1, pages + 1):
            data = self.tmdb.get_popular_movies(page=page)
            results = data.get("results", [])

            for movie in results:
                if self.save_movie(movie):
                    total += 1

            logger.info(f"인기 영화 페이지 {page}/{pages} 완료")

        logger.info(f"인기 영화 수집 완료: 총 {total}개")
        return total

    def collect_top_rated_movies(self, pages: int = 3) -> int:
        """높은 평점 영화 수집"""
        total = 0
        for page in range(1, pages + 1):
            data = self.tmdb.get_top_rated_movies(page=page)
            results = data.get("results", [])

            for movie in results:
                if self.save_movie(movie):
                    total += 1

            logger.info(f"높은 평점 영화 페이지 {page}/{pages} 완료")

        logger.info(f"높은 평점 영화 수집 완료: 총 {total}개")
        return total

    def collect_now_playing_movies(self, pages: int = 2) -> int:
        """현재 상영 영화 수집"""
        total = 0
        for page in range(1, pages + 1):
            data = self.tmdb.get_now_playing_movies(page=page)
            results = data.get("results", [])

            for movie in results:
                if self.save_movie(movie):
                    total += 1

        logger.info(f"현재 상영 영화 수집 완료: 총 {total}개")
        return total

    # ========== 드라마/TV ==========

    @transaction.atomic
    def save_tv(self, tv_data: dict, fetch_detail: bool = True) -> Optional[Content]:
        """TV/드라마 데이터 저장"""
        try:
            tmdb_id = tv_data["id"]

            # 상세 정보 가져오기
            detail = None
            if fetch_detail:
                detail = self.tmdb.get_tv_detail(tmdb_id)

            # 데이터 파싱
            parsed = self.tmdb.parse_tv_data(tv_data, detail)

            # release_date 처리
            release_date = parsed.get("release_date")
            if release_date == "":
                release_date = None

            # Content 저장
            content, created = Content.objects.update_or_create(
                tmdb_id=tmdb_id,
                defaults={
                    "title": parsed["title"],
                    "title_en": parsed["title_en"],
                    "content_type": "drama",
                    "poster_url": parsed["poster_url"],
                    "backdrop_url": parsed["backdrop_url"],
                    "overview": parsed["overview"],
                    "release_date": release_date,
                    "rating": parsed["rating"],
                    "vote_count": parsed["vote_count"],
                    "popularity": parsed["popularity"],
                    "runtime": parsed.get("runtime"),
                    "director": parsed.get("director", ""),
                    "cast": parsed.get("cast", []),
                    "is_adult": False,
                }
            )

            # 장르 연결
            genre_ids = parsed.get("genre_ids", [])
            if detail:
                genre_ids = [g["id"] for g in detail.get("genres", [])]

            genres = [self._get_genre(gid) for gid in genre_ids]
            genres = [g for g in genres if g]
            content.genres.set(genres)

            # Drama 추가 정보 저장
            if detail and "drama_info" in parsed:
                drama_info = parsed["drama_info"]
                Drama.objects.update_or_create(
                    content=content,
                    defaults={
                        "episode_count": drama_info.get("episode_count", 0),
                        "status": drama_info.get("status", "ended"),
                        "broadcaster": drama_info.get("broadcaster", ""),
                    }
                )

            action = "생성" if created else "업데이트"
            logger.debug(f"드라마 {action}: {content.title}")
            return content

        except Exception as e:
            logger.error(f"드라마 저장 실패 (tmdb_id={tv_data.get('id')}): {e}")
            return None

    def collect_popular_tv(self, pages: int = 5) -> int:
        """인기 TV 수집"""
        total = 0
        for page in range(1, pages + 1):
            data = self.tmdb.get_popular_tv(page=page)
            results = data.get("results", [])

            for tv in results:
                if self.save_tv(tv):
                    total += 1

            logger.info(f"인기 TV 페이지 {page}/{pages} 완료")

        logger.info(f"인기 TV 수집 완료: 총 {total}개")
        return total

    def collect_korean_dramas(self, pages: int = 5) -> int:
        """한국 드라마 수집"""
        total = 0
        for page in range(1, pages + 1):
            data = self.tmdb.discover_tv(
                page=page,
                with_origin_country="KR",
                sort_by="popularity.desc"
            )
            results = data.get("results", [])

            for tv in results:
                if self.save_tv(tv):
                    total += 1

            logger.info(f"한국 드라마 페이지 {page}/{pages} 완료")

        logger.info(f"한국 드라마 수집 완료: 총 {total}개")
        return total

    def collect_airing_tv(self, pages: int = 2) -> int:
        """현재 방영 중인 TV 수집"""
        total = 0
        for page in range(1, pages + 1):
            data = self.tmdb.get_on_the_air_tv(page=page)
            results = data.get("results", [])

            for tv in results:
                if self.save_tv(tv):
                    total += 1

        logger.info(f"방영 중 TV 수집 완료: 총 {total}개")
        return total

    # ========== 통합 수집 ==========

    def collect_all(self, movie_pages: int = 3, tv_pages: int = 3) -> dict:
        """모든 콘텐츠 수집"""
        results = {
            "genres": 0,
            "movies": 0,
            "dramas": 0,
        }

        # 1. 장르 동기화
        created, _ = self.sync_genres()
        results["genres"] = created

        # 2. 영화 수집
        results["movies"] += self.collect_popular_movies(pages=movie_pages)
        results["movies"] += self.collect_top_rated_movies(pages=2)

        # 3. 드라마 수집
        results["dramas"] += self.collect_popular_tv(pages=tv_pages)
        results["dramas"] += self.collect_korean_dramas(pages=tv_pages)

        logger.info(f"전체 수집 완료: {results}")
        return results


# 싱글톤 인스턴스
content_collector = ContentCollector()
