from django.db import models


class Genre(models.Model):
    """장르 모델"""
    name = models.CharField('장르명', max_length=50)
    tmdb_id = models.IntegerField('TMDb ID', unique=True)

    class Meta:
        verbose_name = '장르'
        verbose_name_plural = '장르'
        ordering = ['name']

    def __str__(self):
        return self.name


class Content(models.Model):
    """콘텐츠 (영화/드라마) 모델"""
    CONTENT_TYPES = [
        ('movie', '영화'),
        ('drama', '드라마'),
    ]

    title = models.CharField('제목 (한글)', max_length=200)
    title_en = models.CharField('제목 (영문)', max_length=200, blank=True)
    content_type = models.CharField('콘텐츠 유형', max_length=20, choices=CONTENT_TYPES)
    tmdb_id = models.IntegerField('TMDb ID', unique=True)
    poster_url = models.URLField('포스터 URL', blank=True)
    backdrop_url = models.URLField('배경 이미지 URL', blank=True)
    overview = models.TextField('줄거리', blank=True)
    release_date = models.DateField('개봉/방영일', null=True, blank=True)
    rating = models.FloatField('TMDb 평점', default=0)
    vote_count = models.IntegerField('평점 참여수', default=0)
    popularity = models.FloatField('인기도', default=0)
    runtime = models.IntegerField('러닝타임 (분)', null=True, blank=True)
    director = models.CharField('감독', max_length=100, blank=True)
    cast = models.JSONField('출연진', default=list, blank=True)
    is_adult = models.BooleanField('성인물 여부', default=False)
    genres = models.ManyToManyField(Genre, verbose_name='장르', blank=True)
    created_at = models.DateTimeField('생성일', auto_now_add=True)
    updated_at = models.DateTimeField('수정일', auto_now=True)

    class Meta:
        verbose_name = '콘텐츠'
        verbose_name_plural = '콘텐츠'
        ordering = ['-popularity']
        indexes = [
            models.Index(fields=['-popularity']),
            models.Index(fields=['-release_date']),
            models.Index(fields=['content_type', '-popularity']),
            models.Index(fields=['tmdb_id']),
        ]

    def __str__(self):
        return f"[{self.get_content_type_display()}] {self.title}"


class Drama(models.Model):
    """드라마 추가 정보 모델"""
    STATUS_CHOICES = [
        ('airing', '방영중'),
        ('ended', '완결'),
        ('upcoming', '방영예정'),
    ]

    content = models.OneToOneField(
        Content,
        on_delete=models.CASCADE,
        related_name='drama_info',
        verbose_name='콘텐츠'
    )
    broadcaster = models.CharField('방송사', max_length=50, blank=True)
    air_day = models.CharField('방영 요일', max_length=20, blank=True)
    air_time = models.TimeField('방영 시간', null=True, blank=True)
    episode_count = models.IntegerField('총 회차', default=0)
    current_episode = models.IntegerField('현재 회차', default=0)
    status = models.CharField('상태', max_length=20, choices=STATUS_CHOICES, default='airing')

    class Meta:
        verbose_name = '드라마 정보'
        verbose_name_plural = '드라마 정보'

    def __str__(self):
        return f"{self.content.title} - {self.broadcaster}"


class YouTubeReview(models.Model):
    """유튜브 리뷰 모델"""
    content = models.ForeignKey(
        Content,
        on_delete=models.CASCADE,
        related_name='youtube_reviews',
        verbose_name='콘텐츠'
    )
    video_id = models.CharField('YouTube 영상 ID', max_length=20)
    title = models.CharField('영상 제목', max_length=200)
    channel_name = models.CharField('채널명', max_length=100)
    thumbnail_url = models.URLField('썸네일 URL', blank=True)
    view_count = models.IntegerField('조회수', default=0)
    is_featured = models.BooleanField('추천 리뷰', default=False)
    published_at = models.DateTimeField('게시일', null=True, blank=True)
    created_at = models.DateTimeField('수집일', auto_now_add=True)

    class Meta:
        verbose_name = '유튜브 리뷰'
        verbose_name_plural = '유튜브 리뷰'
        ordering = ['-is_featured', '-view_count']
        unique_together = ['content', 'video_id']

    def __str__(self):
        return f"{self.content.title} - {self.title}"

    @property
    def youtube_url(self):
        return f"https://www.youtube.com/watch?v={self.video_id}"
