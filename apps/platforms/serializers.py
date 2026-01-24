from rest_framework import serializers
from .models import Platform, Availability


class PlatformSerializer(serializers.ModelSerializer):
    """플랫폼 시리얼라이저"""

    class Meta:
        model = Platform
        fields = ['id', 'name', 'code', 'logo_url', 'website_url', 'is_active']


class PlatformSimpleSerializer(serializers.ModelSerializer):
    """플랫폼 간략 시리얼라이저"""

    class Meta:
        model = Platform
        fields = ['id', 'name', 'code', 'logo_url']


class AvailabilitySerializer(serializers.ModelSerializer):
    """시청 가능 정보 시리얼라이저"""
    platform = PlatformSimpleSerializer(read_only=True)

    class Meta:
        model = Availability
        fields = ['platform', 'is_available', 'link_url', 'updated_at']


class AvailabilityCreateSerializer(serializers.ModelSerializer):
    """시청 가능 정보 생성용 시리얼라이저"""

    class Meta:
        model = Availability
        fields = ['content', 'platform', 'is_available', 'link_url']
