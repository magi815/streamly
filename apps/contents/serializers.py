from rest_framework import serializers
from .models import Genre, Content, Drama, YouTubeReview


class GenreSerializer(serializers.ModelSerializer):
    """장르 시리얼라이저"""

    class Meta:
        model = Genre
        fields = ['id', 'name', 'tmdb_id']


class DramaSerializer(serializers.ModelSerializer):
    """드라마 추가 정보 시리얼라이저"""

    class Meta:
        model = Drama
        fields = ['broadcaster', 'air_day', 'air_time', 'episode_count', 'current_episode', 'status']


class YouTubeReviewSerializer(serializers.ModelSerializer):
    """유튜브 리뷰 시리얼라이저"""
    youtube_url = serializers.ReadOnlyField()

    class Meta:
        model = YouTubeReview
        fields = [
            'id', 'video_id', 'title', 'channel_name',
            'thumbnail_url', 'view_count', 'is_featured',
            'published_at', 'youtube_url'
        ]


class ContentListSerializer(serializers.ModelSerializer):
    """콘텐츠 목록용 시리얼라이저 (간략)"""
    genres = GenreSerializer(many=True, read_only=True)
    content_type_display = serializers.CharField(source='get_content_type_display', read_only=True)

    class Meta:
        model = Content
        fields = [
            'id', 'title', 'title_en', 'content_type', 'content_type_display',
            'poster_url', 'release_date', 'rating', 'popularity', 'genres'
        ]


class ContentDetailSerializer(serializers.ModelSerializer):
    """콘텐츠 상세용 시리얼라이저"""
    genres = GenreSerializer(many=True, read_only=True)
    content_type_display = serializers.CharField(source='get_content_type_display', read_only=True)
    drama_info = DramaSerializer(read_only=True)
    youtube_reviews = YouTubeReviewSerializer(many=True, read_only=True)
    platforms = serializers.SerializerMethodField()

    class Meta:
        model = Content
        fields = [
            'id', 'title', 'title_en', 'content_type', 'content_type_display',
            'tmdb_id', 'poster_url', 'backdrop_url', 'overview',
            'release_date', 'rating', 'vote_count', 'popularity',
            'runtime', 'director', 'cast', 'is_adult',
            'genres', 'drama_info', 'youtube_reviews', 'platforms',
            'created_at', 'updated_at'
        ]

    def get_platforms(self, obj):
        """시청 가능한 플랫폼 정보"""
        from apps.platforms.serializers import AvailabilitySerializer
        availabilities = obj.availabilities.filter(is_available=True).select_related('platform')
        return AvailabilitySerializer(availabilities, many=True).data


class ContentSearchSerializer(serializers.ModelSerializer):
    """검색 결과용 시리얼라이저"""
    content_type_display = serializers.CharField(source='get_content_type_display', read_only=True)

    class Meta:
        model = Content
        fields = [
            'id', 'title', 'content_type', 'content_type_display',
            'poster_url', 'release_date', 'rating'
        ]
