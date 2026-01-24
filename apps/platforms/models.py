from django.db import models


class Platform(models.Model):
    """OTT 플랫폼 모델"""
    name = models.CharField('플랫폼명', max_length=50)
    code = models.CharField('코드', max_length=20, unique=True)
    logo_url = models.URLField('로고 URL', blank=True)
    website_url = models.URLField('공식 웹사이트', blank=True)
    is_active = models.BooleanField('활성화', default=True)
    display_order = models.IntegerField('표시 순서', default=0)
    created_at = models.DateTimeField('생성일', auto_now_add=True)

    class Meta:
        verbose_name = '플랫폼'
        verbose_name_plural = '플랫폼'
        ordering = ['display_order', 'name']

    def __str__(self):
        return self.name


class Availability(models.Model):
    """콘텐츠 시청 가능 정보 모델"""
    content = models.ForeignKey(
        'contents.Content',
        on_delete=models.CASCADE,
        related_name='availabilities',
        verbose_name='콘텐츠'
    )
    platform = models.ForeignKey(
        Platform,
        on_delete=models.CASCADE,
        related_name='availabilities',
        verbose_name='플랫폼'
    )
    is_available = models.BooleanField('시청 가능', default=True)
    link_url = models.URLField('시청 링크', blank=True)
    updated_at = models.DateTimeField('업데이트일', auto_now=True)

    class Meta:
        verbose_name = '시청 가능 정보'
        verbose_name_plural = '시청 가능 정보'
        unique_together = ['content', 'platform']

    def __str__(self):
        status = '가능' if self.is_available else '불가'
        return f"{self.content.title} - {self.platform.name} ({status})"
