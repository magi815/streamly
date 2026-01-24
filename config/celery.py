"""
Celery 앱 설정
"""
import os
from celery import Celery
from celery.schedules import crontab

# Django 설정 모듈 지정
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.local')

app = Celery('streamly')

# Django 설정에서 Celery 관련 설정 로드
app.config_from_object('django.conf:settings', namespace='CELERY')

# 등록된 Django 앱에서 tasks.py 자동 탐색
app.autodiscover_tasks()

# Celery Beat 스케줄 (주기적 태스크)
app.conf.beat_schedule = {
    # 매일 새벽 3시에 인기 콘텐츠 수집
    'collect-popular-contents-daily': {
        'task': 'apps.contents.tasks.collect_popular_contents',
        'schedule': crontab(hour=3, minute=0),
    },
    # 매일 새벽 4시에 신작 콘텐츠 수집
    'collect-new-releases-daily': {
        'task': 'apps.contents.tasks.collect_new_releases',
        'schedule': crontab(hour=4, minute=0),
    },
    # 매주 일요일 새벽 5시에 YouTube 리뷰 수집
    'collect-youtube-reviews-weekly': {
        'task': 'apps.contents.tasks.collect_youtube_reviews_for_popular',
        'schedule': crontab(hour=5, minute=0, day_of_week=0),
    },
    # 6시간마다 인기 콘텐츠 업데이트
    'update-trending-contents': {
        'task': 'apps.contents.tasks.update_trending_contents',
        'schedule': crontab(minute=0, hour='*/6'),
    },
}


@app.task(bind=True, ignore_result=True)
def debug_task(self):
    """디버그 태스크"""
    print(f'Request: {self.request!r}')
