import uuid
import os

from django.db import models
from django.utils import timezone


def upload_path(instance, filename):
    ext = filename.rsplit('.', 1)[-1].lower()
    name = f"{uuid.uuid4().hex}_{timezone.now().strftime('%Y%m%d_%H%M%S')}"
    return f"uploads/{name}.{ext}"


class UploadedFile(models.Model):
    FILE_TYPES = [
        ('csv', 'CSV'),
        ('kml', 'KML'),
        ('gpx', 'GPX'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    file = models.FileField(upload_to=upload_path)
    file_type = models.CharField(max_length=4, choices=FILE_TYPES)
    original_name = models.CharField(max_length=255)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-uploaded_at']

    def __str__(self):
        return f"{self.original_name} ({self.get_file_type_display()})"

    @property
    def filename(self):
        return os.path.basename(self.file.name)


class MapPoint(models.Model):
    SOURCE_CHOICES = [
        ('csv', 'CSV'),
        ('kml', 'KML'),
        ('gpx', 'GPX'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255, blank=True, default='')
    description = models.TextField(blank=True, default='')
    latitude = models.FloatField()
    longitude = models.FloatField()
    altitude = models.FloatField(null=True, blank=True)
    source_file = models.ForeignKey(
        UploadedFile, on_delete=models.CASCADE, related_name='points'
    )
    source_type = models.CharField(max_length=4, choices=SOURCE_CHOICES)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name or f"Point ({self.latitude:.4f}, {self.longitude:.4f})"
