from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema, extend_schema_view

from .models import Platform, Availability
from .serializers import PlatformSerializer


@extend_schema_view(
    list=extend_schema(summary="OTT 플랫폼 목록", tags=["플랫폼"]),
    retrieve=extend_schema(summary="OTT 플랫폼 상세", tags=["플랫폼"]),
)
class PlatformViewSet(viewsets.ReadOnlyModelViewSet):
    """OTT 플랫폼 API"""
    queryset = Platform.objects.filter(is_active=True).order_by('display_order')
    serializer_class = PlatformSerializer
    pagination_class = None  # 플랫폼은 페이지네이션 불필요

    @extend_schema(summary="플랫폼별 콘텐츠 목록", tags=["플랫폼"])
    @action(detail=True, methods=['get'])
    def contents(self, request, pk=None):
        """해당 플랫폼에서 시청 가능한 콘텐츠 목록"""
        from apps.contents.serializers import ContentListSerializer

        platform = self.get_object()
        availabilities = Availability.objects.filter(
            platform=platform,
            is_available=True
        ).select_related('content').prefetch_related('content__genres')

        contents = [av.content for av in availabilities]
        serializer = ContentListSerializer(contents, many=True)
        return Response(serializer.data)
