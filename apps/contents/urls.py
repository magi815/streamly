from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import GenreViewSet, ContentViewSet

router = DefaultRouter()
router.register(r'genres', GenreViewSet, basename='genre')
router.register(r'contents', ContentViewSet, basename='content')

urlpatterns = [
    path('', include(router.urls)),
]
