from django.urls import path
from . import views

app_name = 'map_app'

urlpatterns = [
    path('', views.upload_map_view, name='upload_map'),
    path('upload/', views.upload_file_view, name='upload_file'),
    path('delete/<uuid:file_id>/', views.delete_file_view, name='delete_file'),
    path('api/points/', views.get_points_data, name='get_points'),
    path('api/files/', views.get_files_list, name='get_files'),
]
