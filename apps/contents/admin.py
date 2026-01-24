from django.contrib import admin
from .models import Genre, Content, Drama, YouTubeReview


@admin.register(Genre)
class GenreAdmin(admin.ModelAdmin):
    list_display = ['name', 'tmdb_id']
    search_fields = ['name']


@admin.register(Content)
class ContentAdmin(admin.ModelAdmin):
    list_display = ['title', 'content_type', 'release_date', 'rating', 'popularity']
    list_filter = ['content_type', 'is_adult', 'genres']
    search_fields = ['title', 'title_en', 'director']
    date_hierarchy = 'release_date'
    filter_horizontal = ['genres']
    readonly_fields = ['created_at', 'updated_at']


@admin.register(Drama)
class DramaAdmin(admin.ModelAdmin):
    list_display = ['content', 'broadcaster', 'air_day', 'status', 'episode_count']
    list_filter = ['status', 'broadcaster']
    search_fields = ['content__title']


@admin.register(YouTubeReview)
class YouTubeReviewAdmin(admin.ModelAdmin):
    list_display = ['content', 'title', 'channel_name', 'view_count', 'is_featured']
    list_filter = ['is_featured', 'channel_name']
    search_fields = ['title', 'content__title', 'channel_name']
