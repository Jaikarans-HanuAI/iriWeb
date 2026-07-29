import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'iri_web.settings')
django.setup()

from map_app.parsers import PARSERS

with open('csvformat.csv', 'rb') as f:
    csv_content = f.read()

with open('format.gpx', 'rb') as f:
    gpx_content = f.read()

csv_points = PARSERS['csv'](None, csv_content)
print(f"CSV points: {len(csv_points)}")
print(f"CSV point 10: {csv_points[10].metadata}")

gpx_points = PARSERS['gpx'](None, gpx_content)
print(f"GPX points: {len(gpx_points)}")
print(f"GPX point 10: {gpx_points[10].metadata}")
