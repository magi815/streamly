from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticatedOrReadOnly
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q
from drf_spectacular.utils import extend_schema, extend_schema_view, OpenApiParameter

from .models import Genre, Content, YouTubeReview
from .serializers import (
    GenreSerializer,
    ContentListSerializer,
    ContentDetailSerializer,
    ContentSearchSerializer,
    YouTubeReviewSerializer,
)
from .filters import ContentFilter


@extend_schema_view(
    list=extend_schema(summary="장르 목록", tags=["장르"]),
    retrieve=extend_schema(summary="장르 상세", tags=["장르"]),
)
class GenreViewSet(viewsets.ReadOnlyModelViewSet):
    """장르 API"""
    queryset = Genre.objects.all()
    serializer_class = GenreSerializer
    pagination_class = None  # 장르는 페이지네이션 불필요


@extend_schema_view(
    list=extend_schema(summary="콘텐츠 목록", tags=["콘텐츠"]),
    retrieve=extend_schema(summary="콘텐츠 상세", tags=["콘텐츠"]),
)
class ContentViewSet(viewsets.ReadOnlyModelViewSet):
    """콘텐츠 (영화/드라마) API"""
    queryset = Content.objects.prefetch_related('genres').all()
    permission_classes = [IsAuthenticatedOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = ContentFilter
    search_fields = ['title', 'title_en', 'director']
    ordering_fields = ['popularity', 'rating', 'release_date', 'created_at']
    ordering = ['-popularity']

    def get_serializer_class(self):
        if self.action == 'list':
            return ContentListSerializer
        if self.action == 'search':
            return ContentSearchSerializer
        return ContentDetailSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        if self.action == 'retrieve':
            queryset = queryset.prefetch_related(
                'youtube_reviews',
                'availabilities__platform'
            )
        return queryset

    @extend_schema(
        summary="콘텐츠 검색",
        tags=["콘텐츠"],
        parameters=[
            OpenApiParameter(name='q', description='검색어 (제목, 배우, 감독)', required=True, type=str),
        ]
    )
    @action(detail=False, methods=['get'])
    def search(self, request):
        """통합 검색"""
        query = request.query_params.get('q', '').strip()
        if not query:
            return Response({'results': []})

        queryset = Content.objects.filter(
            Q(title__icontains=query) |
            Q(title_en__icontains=query) |
            Q(director__icontains=query) |
            Q(cast__icontains=query)
        ).order_by('-popularity')[:20]

        serializer = self.get_serializer(queryset, many=True)
        return Response({'results': serializer.data})

    @extend_schema(summary="영화 목록", tags=["콘텐츠"])
    @action(detail=False, methods=['get'])
    def movies(self, request):
        """영화만 조회"""
        queryset = self.filter_queryset(
            self.get_queryset().filter(content_type='movie')
        )
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = ContentListSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = ContentListSerializer(queryset, many=True)
        return Response(serializer.data)

    @extend_schema(summary="드라마 목록", tags=["콘텐츠"])
    @action(detail=False, methods=['get'])
    def dramas(self, request):
        """드라마만 조회"""
        queryset = self.filter_queryset(
            self.get_queryset().filter(content_type='drama')
        )
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = ContentListSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = ContentListSerializer(queryset, many=True)
        return Response(serializer.data)

    @extend_schema(summary="인기 콘텐츠", tags=["콘텐츠"])
    @action(detail=False, methods=['get'])
    def trending(self, request):
        """인기 콘텐츠 (상위 20개)"""
        queryset = self.get_queryset().order_by('-popularity')[:20]
        serializer = ContentListSerializer(queryset, many=True)
        return Response(serializer.data)

    @extend_schema(summary="신작 콘텐츠", tags=["콘텐츠"])
    @action(detail=False, methods=['get'], url_path='new-releases')
    def new_releases(self, request):
        """신작 콘텐츠 (최신 개봉/방영순)"""
        queryset = self.get_queryset().exclude(
            release_date__isnull=True
        ).order_by('-release_date')[:20]
        serializer = ContentListSerializer(queryset, many=True)
        return Response(serializer.data)

    @extend_schema(summary="콘텐츠 유튜브 리뷰", tags=["콘텐츠"])
    @action(detail=True, methods=['get'])
    def reviews(self, request, pk=None):
        """해당 콘텐츠의 유튜브 리뷰 목록"""
        content = self.get_object()
        reviews = content.youtube_reviews.all()
        serializer = YouTubeReviewSerializer(reviews, many=True)
        return Response(serializer.data)

    @extend_schema(
        summary="유튜브 리뷰 수집 요청",
        tags=["콘텐츠"],
        responses={202: {"description": "리뷰 수집 태스크가 큐에 추가됨"}}
    )
    @action(detail=True, methods=['post'], url_path='collect-reviews')
    def collect_reviews(self, request, pk=None):
        """
        해당 콘텐츠의 유튜브 리뷰를 수집 (비동기)
        Celery 태스크로 백그라운드 실행
        """
        content = self.get_object()

        # Celery 태스크 실행
        from apps.contents.tasks import collect_youtube_reviews
        task = collect_youtube_reviews.delay(content.id, max_reviews=5)

        return Response(
            {
                "message": f"'{content.title}' 리뷰 수집 태스크가 시작되었습니다.",
                "task_id": task.id,
                "content_id": content.id,
            },
            status=status.HTTP_202_ACCEPTED
        )
