"""
OTT 플랫폼 초기 데이터 입력
사용법: python manage.py init_platforms
"""
from django.core.management.base import BaseCommand
from apps.platforms.models import Platform


PLATFORMS = [
    {
        "name": "넷플릭스",
        "code": "netflix",
        "website_url": "https://www.netflix.com/kr/",
        "logo_url": "https://upload.wikimedia.org/wikipedia/commons/0/08/Netflix_2015_logo.svg",
        "display_order": 1,
    },
    {
        "name": "티빙",
        "code": "tving",
        "website_url": "https://www.tving.com/",
        "logo_url": "https://upload.wikimedia.org/wikipedia/commons/5/5d/TVING_logo.svg",
        "display_order": 2,
    },
    {
        "name": "웨이브",
        "code": "wavve",
        "website_url": "https://www.wavve.com/",
        "logo_url": "https://upload.wikimedia.org/wikipedia/commons/2/22/Wavve_Logo.svg",
        "display_order": 3,
    },
    {
        "name": "쿠팡플레이",
        "code": "coupangplay",
        "website_url": "https://www.coupangplay.com/",
        "logo_url": "",
        "display_order": 4,
    },
    {
        "name": "디즈니+",
        "code": "disneyplus",
        "website_url": "https://www.disneyplus.com/ko-kr",
        "logo_url": "https://upload.wikimedia.org/wikipedia/commons/3/3e/Disney%2B_logo.svg",
        "display_order": 5,
    },
    {
        "name": "왓챠",
        "code": "watcha",
        "website_url": "https://watcha.com/",
        "logo_url": "",
        "display_order": 6,
    },
    {
        "name": "시즌",
        "code": "seezn",
        "website_url": "https://www.seezn.com/",
        "logo_url": "",
        "display_order": 7,
    },
    {
        "name": "애플TV+",
        "code": "appletv",
        "website_url": "https://tv.apple.com/kr",
        "logo_url": "",
        "display_order": 8,
    },
]


class Command(BaseCommand):
    help = 'OTT 플랫폼 초기 데이터를 입력합니다.'

    def handle(self, *args, **options):
        self.stdout.write('OTT 플랫폼 초기화 시작...')

        created_count = 0
        updated_count = 0

        for platform_data in PLATFORMS:
            platform, created = Platform.objects.update_or_create(
                code=platform_data["code"],
                defaults={
                    "name": platform_data["name"],
                    "website_url": platform_data["website_url"],
                    "logo_url": platform_data["logo_url"],
                    "display_order": platform_data["display_order"],
                    "is_active": True,
                }
            )

            if created:
                created_count += 1
                self.stdout.write(f'  + {platform.name} 생성')
            else:
                updated_count += 1
                self.stdout.write(f'  * {platform.name} 업데이트')

        self.stdout.write(
            self.style.SUCCESS(
                f'플랫폼 초기화 완료: 생성 {created_count}개, 업데이트 {updated_count}개'
            )
        )
