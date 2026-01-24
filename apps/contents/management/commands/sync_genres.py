"""
TMDb에서 장르 데이터 동기화
사용법: python manage.py sync_genres
"""
from django.core.management.base import BaseCommand
from apps.contents.services.collector import content_collector


class Command(BaseCommand):
    help = 'TMDb에서 장르 데이터를 동기화합니다.'

    def handle(self, *args, **options):
        self.stdout.write('장르 동기화 시작...')

        try:
            created, updated = content_collector.sync_genres()
            self.stdout.write(
                self.style.SUCCESS(f'장르 동기화 완료: 생성 {created}개, 업데이트 {updated}개')
            )
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'장르 동기화 실패: {e}')
            )
