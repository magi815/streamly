"""
콘텐츠 관련 Celery 태스크
"""
import logging
from celery import shared_task
from django.db import models, transaction

from apps.contents.models import Content, YouTubeReview
from apps.contents.services.collector import ContentCollector
from apps.contents.services.youtube import youtube_service

logger = logging.getLogger(__name__)


# ========== 콘텐츠 수집 태스크 ==========

@shared_task(bind=True, max_retries=3)
def collect_popular_contents(self):
    """
    인기 콘텐츠 수집 (영화 + 드라마)
    매일 새벽 3시에 실행
    """
    try:
        collector = ContentCollector()

        # 장르 동기화
        collector.sync_genres()

        # 인기 영화 수집 (5페이지)
        movies = collector.collect_popular_movies(pages=5)

        # 인기 드라마 수집 (5페이지)
        dramas = collector.collect_popular_tv(pages=5)

        logger.info(f"인기 콘텐츠 수집 완료: 영화 {movies}개, 드라마 {dramas}개")
        return {"movies": movies, "dramas": dramas}

    except Exception as e:
        logger.error(f"인기 콘텐츠 수집 실패: {e}")
        raise self.retry(exc=e, countdown=60 * 5)  # 5분 후 재시도


@shared_task(bind=True, max_retries=3)
def collect_new_releases(self):
    """
    신작 콘텐츠 수집 (현재 상영/방영 중)
    매일 새벽 4시에 실행
    """
    try:
        collector = ContentCollector()

        # 현재 상영 영화 수집
        movies = collector.collect_now_playing_movies(pages=3)

        # 현재 방영 드라마 수집
        dramas = collector.collect_airing_tv(pages=3)

        logger.info(f"신작 콘텐츠 수집 완료: 영화 {movies}개, 드라마 {dramas}개")
        return {"movies": movies, "dramas": dramas}

    except Exception as e:
        logger.error(f"신작 콘텐츠 수집 실패: {e}")
        raise self.retry(exc=e, countdown=60 * 5)


@shared_task(bind=True, max_retries=3)
def collect_korean_dramas(self, pages: int = 5):
    """한국 드라마 수집"""
    try:
        collector = ContentCollector()
        collector.sync_genres()
        count = collector.collect_korean_dramas(pages=pages)
        logger.info(f"한국 드라마 수집 완료: {count}개")
        return {"korean_dramas": count}
    except Exception as e:
        logger.error(f"한국 드라마 수집 실패: {e}")
        raise self.retry(exc=e, countdown=60 * 5)


@shared_task(bind=True)
def update_trending_contents(self):
    """
    트렌딩 콘텐츠 업데이트 (인기도 순위 갱신)
    6시간마다 실행
    """
    try:
        collector = ContentCollector()

        # 인기 영화 1페이지만 빠르게 업데이트
        movies = collector.collect_popular_movies(pages=1)

        # 인기 드라마 1페이지만 빠르게 업데이트
        dramas = collector.collect_popular_tv(pages=1)

        logger.info(f"트렌딩 업데이트 완료: 영화 {movies}개, 드라마 {dramas}개")
        return {"movies": movies, "dramas": dramas}

    except Exception as e:
        logger.error(f"트렌딩 업데이트 실패: {e}")
        return {"error": str(e)}


# ========== YouTube 리뷰 수집 태스크 ==========

@shared_task(bind=True, max_retries=2)
def collect_youtube_reviews(self, content_id: int, max_reviews: int = 5):
    """
    특정 콘텐츠의 YouTube 리뷰 수집

    Args:
        content_id: Content 모델 ID
        max_reviews: 수집할 최대 리뷰 수
    """
    try:
        content = Content.objects.get(id=content_id)

        # YouTube에서 리뷰 검색
        reviews = youtube_service.search_content_reviews(
            content_title=content.title,
            content_title_en=content.title_en,
            content_type=content.content_type,
            max_results=max_reviews
        )

        saved_count = 0
        for review in reviews:
            with transaction.atomic():
                _, created = YouTubeReview.objects.update_or_create(
                    content=content,
                    video_id=review["video_id"],
                    defaults={
                        "title": review["title"][:200],
                        "channel_name": review["channel_name"][:100],
                        "thumbnail_url": review.get("thumbnail_url", ""),
                        "view_count": review.get("view_count", 0),
                        "published_at": review.get("published_at"),
                    }
                )
                if created:
                    saved_count += 1

        logger.info(f"'{content.title}' 리뷰 수집 완료: {saved_count}개 저장")
        return {"content_id": content_id, "saved": saved_count}

    except Content.DoesNotExist:
        logger.error(f"콘텐츠를 찾을 수 없음: {content_id}")
        return {"error": "Content not found"}
    except Exception as e:
        logger.error(f"YouTube 리뷰 수집 실패 (content_id={content_id}): {e}")
        raise self.retry(exc=e, countdown=60)


@shared_task(bind=True)
def collect_youtube_reviews_for_popular(self, limit: int = 50):
    """
    인기 콘텐츠의 YouTube 리뷰 일괄 수집
    매주 일요일 새벽 5시에 실행

    Args:
        limit: 리뷰를 수집할 콘텐츠 수
    """
    try:
        # 리뷰가 없거나 적은 인기 콘텐츠 조회
        contents = Content.objects.annotate(
            review_count=models.Count('youtube_reviews')
        ).filter(
            review_count__lt=3  # 리뷰가 3개 미만인 콘텐츠
        ).order_by('-popularity')[:limit]

        queued = 0
        for content in contents:
            # 각 콘텐츠에 대해 비동기 태스크 실행
            collect_youtube_reviews.delay(content.id, max_reviews=5)
            queued += 1

        logger.info(f"YouTube 리뷰 수집 태스크 {queued}개 큐잉됨")
        return {"queued": queued}

    except Exception as e:
        logger.error(f"YouTube 리뷰 일괄 수집 실패: {e}")
        return {"error": str(e)}


@shared_task(bind=True, max_retries=2)
def refresh_youtube_review_stats(self, content_id: int):
    """
    특정 콘텐츠의 YouTube 리뷰 통계 갱신 (조회수 등)

    Args:
        content_id: Content 모델 ID
    """
    try:
        reviews = YouTubeReview.objects.filter(content_id=content_id)

        if not reviews.exists():
            return {"content_id": content_id, "updated": 0}

        video_ids = list(reviews.values_list("video_id", flat=True))
        stats = youtube_service._get_video_statistics(video_ids)

        updated = 0
        for review in reviews:
            if review.video_id in stats:
                new_view_count = stats[review.video_id].get("viewCount", 0)
                if review.view_count != new_view_count:
                    review.view_count = new_view_count
                    review.save(update_fields=["view_count"])
                    updated += 1

        logger.info(f"리뷰 통계 갱신 완료 (content_id={content_id}): {updated}개 업데이트")
        return {"content_id": content_id, "updated": updated}

    except Exception as e:
        logger.error(f"리뷰 통계 갱신 실패 (content_id={content_id}): {e}")
        raise self.retry(exc=e, countdown=60)


# ========== 유틸리티 태스크 ==========

@shared_task
def sync_all_genres():
    """모든 장르 동기화"""
    collector = ContentCollector()
    created, updated = collector.sync_genres()
    return {"created": created, "updated": updated}


@shared_task(bind=True, max_retries=3)
def full_content_sync(self, movie_pages: int = 5, drama_pages: int = 5):
    """
    전체 콘텐츠 동기화 (수동 실행용)

    Args:
        movie_pages: 영화 수집 페이지 수
        drama_pages: 드라마 수집 페이지 수
    """
    try:
        collector = ContentCollector()
        results = collector.collect_all(
            movie_pages=movie_pages,
            tv_pages=drama_pages
        )
        logger.info(f"전체 동기화 완료: {results}")
        return results
    except Exception as e:
        logger.error(f"전체 동기화 실패: {e}")
        raise self.retry(exc=e, countdown=60 * 10)
