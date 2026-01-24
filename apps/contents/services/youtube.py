"""
YouTube Data API 서비스
https://developers.google.com/youtube/v3/docs
"""
import logging
import requests
from django.conf import settings
from typing import Optional
from datetime import datetime

logger = logging.getLogger(__name__)


class YouTubeService:
    """YouTube Data API 클라이언트"""

    BASE_URL = "https://www.googleapis.com/youtube/v3"

    def __init__(self):
        self.api_key = settings.YOUTUBE_API_KEY
        if not self.api_key:
            logger.warning("YOUTUBE_API_KEY가 설정되지 않았습니다.")

    def _request(self, endpoint: str, params: dict = None) -> Optional[dict]:
        """API 요청 공통 메서드"""
        if not self.api_key:
            logger.error("YOUTUBE_API_KEY가 없습니다.")
            return None

        url = f"{self.BASE_URL}{endpoint}"
        default_params = {
            "key": self.api_key,
        }
        if params:
            default_params.update(params)

        try:
            response = requests.get(url, params=default_params, timeout=10)
            response.raise_for_status()
            return response.json()
        except requests.RequestException as e:
            logger.error(f"YouTube API 요청 실패: {e}")
            return None

    def search_reviews(
        self,
        query: str,
        max_results: int = 5,
        order: str = "relevance"
    ) -> list:
        """
        콘텐츠 리뷰 영상 검색

        Args:
            query: 검색어 (예: "파묘 리뷰", "눈물의 여왕 후기")
            max_results: 최대 결과 수 (기본 5개)
            order: 정렬 방식 (relevance, viewCount, date)

        Returns:
            검색 결과 리스트
        """
        params = {
            "part": "snippet",
            "q": query,
            "type": "video",
            "maxResults": max_results,
            "order": order,
            "regionCode": "KR",
            "relevanceLanguage": "ko",
            "videoDuration": "medium",  # 4-20분 영상
        }

        data = self._request("/search", params)
        if not data:
            return []

        results = []
        video_ids = []

        for item in data.get("items", []):
            video_id = item.get("id", {}).get("videoId")
            if video_id:
                video_ids.append(video_id)
                snippet = item.get("snippet", {})
                results.append({
                    "video_id": video_id,
                    "title": snippet.get("title", ""),
                    "channel_name": snippet.get("channelTitle", ""),
                    "thumbnail_url": self._get_best_thumbnail(snippet.get("thumbnails", {})),
                    "published_at": self._parse_datetime(snippet.get("publishedAt")),
                })

        # 조회수 정보 가져오기
        if video_ids:
            stats = self._get_video_statistics(video_ids)
            for result in results:
                vid = result["video_id"]
                if vid in stats:
                    result["view_count"] = stats[vid].get("viewCount", 0)

        return results

    def search_content_reviews(
        self,
        content_title: str,
        content_title_en: str = "",
        content_type: str = "movie",
        max_results: int = 5
    ) -> list:
        """
        특정 콘텐츠의 리뷰 영상 검색

        Args:
            content_title: 콘텐츠 한글 제목
            content_title_en: 콘텐츠 영문 제목 (선택)
            content_type: 콘텐츠 유형 (movie/drama)
            max_results: 최대 결과 수

        Returns:
            리뷰 영상 목록
        """
        # 검색어 구성
        type_keyword = "영화" if content_type == "movie" else "드라마"
        search_queries = [
            f"{content_title} {type_keyword} 리뷰",
            f"{content_title} 후기",
            f"{content_title} 결말",
        ]

        all_results = []
        seen_ids = set()

        for query in search_queries:
            results = self.search_reviews(query, max_results=3)
            for result in results:
                if result["video_id"] not in seen_ids:
                    seen_ids.add(result["video_id"])
                    all_results.append(result)

            if len(all_results) >= max_results:
                break

        # 조회수 기준 정렬 후 상위 N개 반환
        all_results.sort(key=lambda x: x.get("view_count", 0), reverse=True)
        return all_results[:max_results]

    def get_video_details(self, video_id: str) -> Optional[dict]:
        """
        단일 영상 상세 정보 조회

        Args:
            video_id: YouTube 영상 ID

        Returns:
            영상 상세 정보
        """
        params = {
            "part": "snippet,statistics,contentDetails",
            "id": video_id,
        }

        data = self._request("/videos", params)
        if not data or not data.get("items"):
            return None

        item = data["items"][0]
        snippet = item.get("snippet", {})
        stats = item.get("statistics", {})

        return {
            "video_id": video_id,
            "title": snippet.get("title", ""),
            "description": snippet.get("description", ""),
            "channel_name": snippet.get("channelTitle", ""),
            "channel_id": snippet.get("channelId", ""),
            "thumbnail_url": self._get_best_thumbnail(snippet.get("thumbnails", {})),
            "published_at": self._parse_datetime(snippet.get("publishedAt")),
            "view_count": int(stats.get("viewCount", 0)),
            "like_count": int(stats.get("likeCount", 0)),
            "comment_count": int(stats.get("commentCount", 0)),
        }

    def _get_video_statistics(self, video_ids: list) -> dict:
        """
        여러 영상의 통계 정보 조회

        Args:
            video_ids: 영상 ID 리스트

        Returns:
            {video_id: {viewCount, likeCount, ...}, ...}
        """
        if not video_ids:
            return {}

        params = {
            "part": "statistics",
            "id": ",".join(video_ids),
        }

        data = self._request("/videos", params)
        if not data:
            return {}

        result = {}
        for item in data.get("items", []):
            vid = item.get("id")
            stats = item.get("statistics", {})
            result[vid] = {
                "viewCount": int(stats.get("viewCount", 0)),
                "likeCount": int(stats.get("likeCount", 0)),
                "commentCount": int(stats.get("commentCount", 0)),
            }

        return result

    def _get_best_thumbnail(self, thumbnails: dict) -> str:
        """가장 좋은 품질의 썸네일 URL 반환"""
        # 우선순위: maxres > standard > high > medium > default
        for quality in ["maxres", "standard", "high", "medium", "default"]:
            if quality in thumbnails:
                return thumbnails[quality].get("url", "")
        return ""

    def _parse_datetime(self, datetime_str: str) -> Optional[datetime]:
        """ISO 8601 날짜 문자열을 datetime으로 변환"""
        if not datetime_str:
            return None
        try:
            # 'Z'를 '+00:00'으로 변환
            if datetime_str.endswith("Z"):
                datetime_str = datetime_str[:-1] + "+00:00"
            return datetime.fromisoformat(datetime_str)
        except (ValueError, TypeError):
            return None


# 싱글톤 인스턴스
youtube_service = YouTubeService()
