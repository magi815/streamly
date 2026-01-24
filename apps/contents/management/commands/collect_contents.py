"""
TMDb에서 콘텐츠 데이터 수집
사용법: python manage.py collect_contents [옵션]
"""
from django.core.management.base import BaseCommand
from apps.contents.services.collector import content_collector


class Command(BaseCommand):
    help = 'TMDb에서 영화/드라마 데이터를 수집합니다.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--type',
            type=str,
            choices=['all', 'movies', 'dramas', 'korean'],
            default='all',
            help='수집할 콘텐츠 유형 (기본값: all)'
        )
        parser.add_argument(
            '--pages',
            type=int,
            default=3,
            help='수집할 페이지 수 (기본값: 3, 페이지당 20개)'
        )
        parser.add_argument(
            '--sync-genres',
            action='store_true',
            help='장르 동기화도 함께 실행'
        )

    def handle(self, *args, **options):
        content_type = options['type']
        pages = options['pages']
        sync_genres = options['sync_genres']

        self.stdout.write(f'콘텐츠 수집 시작 (유형: {content_type}, 페이지: {pages})')

        try:
            # 장르 동기화
            if sync_genres or content_type == 'all':
                self.stdout.write('장르 동기화 중...')
                created, _ = content_collector.sync_genres()
                self.stdout.write(f'  - 장르 {created}개 동기화')

            total = 0

            if content_type == 'all':
                results = content_collector.collect_all(movie_pages=pages, tv_pages=pages)
                total = results['movies'] + results['dramas']
                self.stdout.write(f'  - 영화 {results["movies"]}개 수집')
                self.stdout.write(f'  - 드라마 {results["dramas"]}개 수집')

            elif content_type == 'movies':
                total += content_collector.collect_popular_movies(pages=pages)
                total += content_collector.collect_top_rated_movies(pages=2)
                self.stdout.write(f'  - 영화 {total}개 수집')

            elif content_type == 'dramas':
                total += content_collector.collect_popular_tv(pages=pages)
                self.stdout.write(f'  - 드라마 {total}개 수집')

            elif content_type == 'korean':
                total += content_collector.collect_korean_dramas(pages=pages)
                self.stdout.write(f'  - 한국 드라마 {total}개 수집')

            self.stdout.write(
                self.style.SUCCESS(f'콘텐츠 수집 완료: 총 {total}개')
            )

        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'콘텐츠 수집 실패: {e}')
            )
            raise
