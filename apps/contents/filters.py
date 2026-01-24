"""
콘텐츠 필터링을 위한 django-filter 클래스
"""
import django_filters
from .models import Content


class ContentFilter(django_filters.FilterSet):
    """콘텐츠 필터"""

    # 콘텐츠 유형 필터
    content_type = django_filters.ChoiceFilter(choices=Content.CONTENT_TYPES)

    # 장르 필터 (다중 선택 가능)
    genre = django_filters.NumberFilter(field_name='genres__id')
    genres = django_filters.BaseInFilter(field_name='genres__id')

    # 평점 필터
    rating_min = django_filters.NumberFilter(field_name='rating', lookup_expr='gte')
    rating_max = django_filters.NumberFilter(field_name='rating', lookup_expr='lte')

    # 개봉/방영년도 필터
    year = django_filters.NumberFilter(field_name='release_date', lookup_expr='year')
    year_min = django_filters.NumberFilter(field_name='release_date', lookup_expr='year__gte')
    year_max = django_filters.NumberFilter(field_name='release_date', lookup_expr='year__lte')

    # 제목 검색
    title = django_filters.CharFilter(field_name='title', lookup_expr='icontains')

    # OTT 플랫폼 필터
    platform = django_filters.NumberFilter(field_name='availabilities__platform__id')
    platform_code = django_filters.CharFilter(field_name='availabilities__platform__code')

    class Meta:
        model = Content
        fields = [
            'content_type',
            'genre',
            'genres',
            'rating_min',
            'rating_max',
            'year',
            'year_min',
            'year_max',
            'title',
            'platform',
            'platform_code',
        ]
