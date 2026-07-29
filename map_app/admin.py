from django.contrib import admin
from .models import UploadedFile, MapPoint


@admin.register(UploadedFile)
class UploadedFileAdmin(admin.ModelAdmin):
    list_display = ['original_name', 'file_type', 'uploaded_at', 'point_count']
    list_filter = ['file_type', 'uploaded_at']
    search_fields = ['original_name']

    def point_count(self, obj):
        return obj.points.count()
    point_count.short_description = 'Points'


@admin.register(MapPoint)
class MapPointAdmin(admin.ModelAdmin):
    list_display = ['name', 'latitude', 'longitude', 'source_type', 'source_file', 'created_at']
    list_filter = ['source_type', 'created_at']
    search_fields = ['name', 'description']
