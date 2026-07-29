import json

from django.shortcuts import render, redirect
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.contrib import messages

from .forms import FileUploadForm
from .models import UploadedFile, MapPoint
from .parsers import PARSERS


def upload_map_view(request):
    form = FileUploadForm()
    recent_files = UploadedFile.objects.all()[:10]
    context = {
        'form': form,
        'recent_files': recent_files,
    }
    return render(request, 'map_app/upload_map.html', context)


@require_http_methods(['POST'])
def upload_file_view(request):
    form = FileUploadForm(request.POST, request.FILES)

    if not form.is_valid():
        for field, errors in form.errors.items():
            for error in errors:
                messages.error(request, f"{error}")
        return redirect('map_app:upload_map')

    uploaded_file = form.save(commit=False)
    uploaded_file.original_name = request.FILES['file'].name
    ext = request.FILES['file'].name.rsplit('.', 1)[-1].lower()
    uploaded_file.file_type = ext

    uploaded_file.save()

    uploaded_file.refresh_from_db()
    uploaded_file.file.open()
    file_content = uploaded_file.file.read()
    uploaded_file.file.close()

    try:
        parser = PARSERS.get(ext)
        if not parser:
            messages.error(request, f"No parser available for '{ext}' files.")
            uploaded_file.delete()
            return redirect('map_app:upload_map')

        points = parser(uploaded_file, file_content)

        if not points:
            messages.warning(
                request,
                f"No valid geographic points found in '{uploaded_file.original_name}'."
            )
            uploaded_file.delete()
            return redirect('map_app:upload_map')

        MapPoint.objects.bulk_create(points)

        messages.success(
            request,
            f"Uploaded '{uploaded_file.original_name}' — {len(points)} point(s) imported."
        )

    except (ValueError, Exception) as e:
        messages.error(request, f"Error parsing file: {e}")
        uploaded_file.delete()
        return redirect('map_app:upload_map')

    return redirect('map_app:upload_map')


@require_http_methods(['DELETE'])
def delete_file_view(request, file_id):
    try:
        uploaded_file = UploadedFile.objects.get(id=file_id)
        uploaded_file.delete()
        return JsonResponse({'status': 'ok', 'message': 'File deleted.'})
    except UploadedFile.DoesNotExist:
        return JsonResponse(
            {'status': 'error', 'message': 'File not found.'}, status=404
        )


def get_points_data(request):
    source_type = request.GET.get('source_type')
    file_id = request.GET.get('file_id')

    points = MapPoint.objects.all()

    if source_type:
        points = points.filter(source_type=source_type)
    if file_id:
        points = points.filter(source_file_id=file_id)

    data = []
    for pt in points:
        iri = None
        if pt.metadata:
            for key in pt.metadata:
                if key.lower() in ['iri', 'iri_value']:
                    try:
                        iri = float(pt.metadata[key])
                    except (ValueError, TypeError):
                        iri = pt.metadata[key]
                    break
        data.append({
            'id': str(pt.id),
            'name': pt.name or '',
            'description': pt.description or '',
            'latitude': pt.latitude,
            'longitude': pt.longitude,
            'altitude': pt.altitude,
            'iri': iri,
            'source_type': pt.source_type,
            'source_file': pt.source_file.original_name,
            'source_file_id': str(pt.source_file_id),
            'metadata': pt.metadata,
        })

    def get_sort_key(pt_dict):
        meta = pt_dict['metadata']
        idx = 0
        for key in ['point_index', 'segment_index', 'track_index']:
            if key in meta:
                try:
                    idx = int(meta[key])
                    break
                except (ValueError, TypeError):
                    pass
        return (pt_dict['source_file_id'], idx)

    data.sort(key=get_sort_key)

    return JsonResponse({'points': data, 'count': len(data)})


def get_files_list(request):
    files = UploadedFile.objects.all().order_by('-uploaded_at')
    data = []
    for f in files:
        data.append({
            'id': str(f.id),
            'name': f.original_name,
            'type': f.file_type,
            'type_display': f.get_file_type_display(),
            'uploaded_at': f.uploaded_at.isoformat(),
            'point_count': f.points.count(),
        })
    return JsonResponse({'files': data})
