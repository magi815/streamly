"""
TMDb API 서비스
https://developer.themoviedb.org/docs
"""
import logging
import requests
from django.conf import settings
from typing import Optional

logger = logging.getLogger(__name__)


class TMDbService:
    """TMDb API 클라이언트"""

    BASE_URL = "https://api.themoviedb.org/3"
    IMAGE_BASE_URL = "https://image.tmdb.org/t/p"

    def __init__(self):
        self.api_key = settings.TMDB_API_KEY
        if not self.api_key:
            logger.warning("TMDB_API_KEY가 설정되지 않았습니다.")

    def _request(self, endpoint: str, params: dict = None) -> Optional[dict]:
        """API 요청 공통 메서드"""
        if not self.api_key:
            logger.error("TMDB_API_KEY가 없습니다.")
            return None

        url = f"{self.BASE_URL}{endpoint}"
        default_params = {
            "api_key": self.api_key,
            "language": "ko-KR",
        }
        if params:
            default_params.update(params)

        try:
            response = requests.get(url, params=default_params, timeout=10)
            response.raise_for_status()
            return response.json()
        except requests.RequestException as e:
            logger.error(f"TMDb API 요청 실패: {e}")
            return None

    def get_poster_url(self, path: str, size: str = "w500") -> str:
        """포스터 URL 생성"""
        if not path:
            return ""
        return f"{self.IMAGE_BASE_URL}/{size}{path}"

    def get_backdrop_url(self, path: str, size: str = "w1280") -> str:
        """배경 이미지 URL 생성"""
        if not path:
            return ""
        return f"{self.IMAGE_BASE_URL}/{size}{path}"

    # ========== 장르 ==========

    def get_movie_genres(self) -> list:
        """영화 장르 목록 조회"""
        data = self._request("/genre/movie/list")
        return data.get("genres", []) if data else []

    def get_tv_genres(self) -> list:
        """TV 장르 목록 조회"""
        data = self._request("/genre/tv/list")
        return data.get("genres", []) if data else []

    # ========== 영화 ==========

    def get_popular_movies(self, page: int = 1, region: str = "KR") -> dict:
        """인기 영화 목록"""
        return self._request("/movie/popular", {"page": page, "region": region}) or {}

    def get_now_playing_movies(self, page: int = 1, region: str = "KR") -> dict:
        """현재 상영 중인 영화"""
        return self._request("/movie/now_playing", {"page": page, "region": region}) or {}

    def get_top_rated_movies(self, page: int = 1, region: str = "KR") -> dict:
        """높은 평점 영화"""
        return self._request("/movie/top_rated", {"page": page, "region": region}) or {}

    def get_movie_detail(self, movie_id: int) -> Optional[dict]:
        """영화 상세 정보"""
        return self._request(f"/movie/{movie_id}", {"append_to_response": "credits"})

    def search_movies(self, query: str, page: int = 1) -> dict:
        """영화 검색"""
        return self._request("/search/movie", {"query": query, "page": page}) or {}

    def discover_movies(self, **kwargs) -> dict:
        """영화 발견 (필터링)"""
        params = {"page": kwargs.get("page", 1)}

        if kwargs.get("with_genres"):
            params["with_genres"] = kwargs["with_genres"]
        if kwargs.get("primary_release_year"):
            params["primary_release_year"] = kwargs["primary_release_year"]
        if kwargs.get("sort_by"):
            params["sort_by"] = kwargs["sort_by"]
        if kwargs.get("watch_region"):
            params["watch_region"] = kwargs["watch_region"]
        if kwargs.get("with_watch_providers"):
            params["with_watch_providers"] = kwargs["with_watch_providers"]

        return self._request("/discover/movie", params) or {}

    # ========== TV/드라마 ==========

    def get_popular_tv(self, page: int = 1) -> dict:
        """인기 TV 프로그램"""
        return self._request("/tv/popular", {"page": page}) or {}

    def get_airing_today_tv(self, page: int = 1) -> dict:
        """오늘 방영 TV"""
        return self._request("/tv/airing_today", {"page": page}) or {}

    def get_on_the_air_tv(self, page: int = 1) -> dict:
        """현재 방영 중인 TV"""
        return self._request("/tv/on_the_air", {"page": page}) or {}

    def get_top_rated_tv(self, page: int = 1) -> dict:
        """높은 평점 TV"""
        return self._request("/tv/top_rated", {"page": page}) or {}

    def get_tv_detail(self, tv_id: int) -> Optional[dict]:
        """TV 상세 정보"""
        return self._request(f"/tv/{tv_id}", {"append_to_response": "credits"})

    def search_tv(self, query: str, page: int = 1) -> dict:
        """TV 검색"""
        return self._request("/search/tv", {"query": query, "page": page}) or {}

    def discover_tv(self, **kwargs) -> dict:
        """TV 발견 (필터링)"""
        params = {"page": kwargs.get("page", 1)}

        if kwargs.get("with_genres"):
            params["with_genres"] = kwargs["with_genres"]
        if kwargs.get("first_air_date_year"):
            params["first_air_date_year"] = kwargs["first_air_date_year"]
        if kwargs.get("sort_by"):
            params["sort_by"] = kwargs["sort_by"]
        if kwargs.get("with_origin_country"):
            params["with_origin_country"] = kwargs["with_origin_country"]

        return self._request("/discover/tv", params) or {}

    # ========== 검색 ==========

    def multi_search(self, query: str, page: int = 1) -> dict:
        """통합 검색 (영화 + TV)"""
        return self._request("/search/multi", {"query": query, "page": page}) or {}

    # ========== OTT 정보 ==========

    def get_movie_watch_providers(self, movie_id: int, region: str = "KR") -> dict:
        """영화 OTT 제공 정보"""
        data = self._request(f"/movie/{movie_id}/watch/providers")
        if data and "results" in data:
            return data["results"].get(region, {})
        return {}

    def get_tv_watch_providers(self, tv_id: int, region: str = "KR") -> dict:
        """TV OTT 제공 정보"""
        data = self._request(f"/tv/{tv_id}/watch/providers")
        if data and "results" in data:
            return data["results"].get(region, {})
        return {}

    # ========== 데이터 파싱 헬퍼 ==========

    def parse_movie_data(self, movie: dict, detail: dict = None) -> dict:
        """영화 데이터를 Content 모델 형식으로 변환"""
        data = {
            "tmdb_id": movie["id"],
            "title": movie.get("title", ""),
            "title_en": movie.get("original_title", ""),
            "content_type": "movie",
            "poster_url": self.get_poster_url(movie.get("poster_path")),
            "backdrop_url": self.get_backdrop_url(movie.get("backdrop_path")),
            "overview": movie.get("overview", ""),
            "release_date": movie.get("release_date") or None,
            "rating": movie.get("vote_average", 0),
            "vote_count": movie.get("vote_count", 0),
            "popularity": movie.get("popularity", 0),
            "is_adult": movie.get("adult", False),
            "genre_ids": movie.get("genre_ids", []),
        }

        if detail:
            data["runtime"] = detail.get("runtime")
            # 감독 추출
            credits = detail.get("credits", {})
            crew = credits.get("crew", [])
            directors = [c["name"] for c in crew if c.get("job") == "Director"]
            data["director"] = ", ".join(directors[:2])

            # 출연진 추출 (상위 10명)
            cast = credits.get("cast", [])[:10]
            data["cast"] = [
                {
                    "name": c.get("name", ""),
                    "character": c.get("character", ""),
                    "profile_url": self.get_poster_url(c.get("profile_path"), "w185"),
                }
                for c in cast
            ]

        return data

    def parse_tv_data(self, tv: dict, detail: dict = None) -> dict:
        """TV 데이터를 Content 모델 형식으로 변환"""
        data = {
            "tmdb_id": tv["id"],
            "title": tv.get("name", ""),
            "title_en": tv.get("original_name", ""),
            "content_type": "drama",
            "poster_url": self.get_poster_url(tv.get("poster_path")),
            "backdrop_url": self.get_backdrop_url(tv.get("backdrop_path")),
            "overview": tv.get("overview", ""),
            "release_date": tv.get("first_air_date") or None,
            "rating": tv.get("vote_average", 0),
            "vote_count": tv.get("vote_count", 0),
            "popularity": tv.get("popularity", 0),
            "is_adult": False,
            "genre_ids": tv.get("genre_ids", []),
        }

        if detail:
            # 에피소드 런타임 (평균)
            runtimes = detail.get("episode_run_time", [])
            data["runtime"] = runtimes[0] if runtimes else None

            # 제작자/크리에이터
            creators = detail.get("created_by", [])
            data["director"] = ", ".join([c["name"] for c in creators[:2]])

            # 출연진
            credits = detail.get("credits", {})
            cast = credits.get("cast", [])[:10]
            data["cast"] = [
                {
                    "name": c.get("name", ""),
                    "character": c.get("character", ""),
                    "profile_url": self.get_poster_url(c.get("profile_path"), "w185"),
                }
                for c in cast
            ]

            # 드라마 추가 정보
            data["drama_info"] = {
                "episode_count": detail.get("number_of_episodes", 0),
                "status": self._parse_tv_status(detail.get("status", "")),
                "broadcaster": ", ".join([n["name"] for n in detail.get("networks", [])[:2]]),
            }

        return data

    def _parse_tv_status(self, status: str) -> str:
        """TMDb TV 상태를 앱 상태로 변환"""
        status_map = {
            "Returning Series": "airing",
            "In Production": "airing",
            "Planned": "upcoming",
            "Ended": "ended",
            "Canceled": "ended",
        }
        return status_map.get(status, "ended")


# 싱글톤 인스턴스
tmdb_service = TMDbService()
