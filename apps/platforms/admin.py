from django.contrib import admin
from .models import Platform, Availability


@admin.register(Platform)
class PlatformAdmin(admin.ModelAdmin):
    list_display = ['name', 'code', 'is_active', 'display_order']
    list_filter = ['is_active']
    search_fields = ['name', 'code']
    list_editable = ['is_active', 'display_order']


@admin.register(Availability)
class AvailabilityAdmin(admin.ModelAdmin):
    list_display = ['content', 'platform', 'is_available', 'updated_at']
    list_filter = ['platform', 'is_available']
    search_fields = ['content__title']
    autocomplete_fields = ['content', 'platform']
