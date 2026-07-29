import csv
import io
import re
import xml.etree.ElementTree as ET

from .models import MapPoint


def _ns_strip(tag):
    return tag.split('}')[-1] if '}' in tag else tag


def _find_child(element, *tags):
    for child in element:
        local = _ns_strip(child.tag)
        if local in tags:
            return child
    return None


def _find_children(element, tag):
    local_tag = tag.split('}')[-1] if '}' in tag else tag
    return [ch for ch in element if _ns_strip(ch.tag) == local_tag]


def _find_all_descendants(root, tag_name):
    results = []
    for elem in root.iter():
        if _ns_strip(elem.tag) == tag_name:
            results.append(elem)
    return results


def _get_text(element):
    if element is not None and element.text:
        return element.text.strip()
    return ''


def parse_csv(uploaded_file_obj, file_content):
    decoded = file_content.decode('utf-8-sig')
    
    lines = decoded.splitlines()
    header_idx = 0
    for i, line in enumerate(lines):
        line_lower = line.lower()
        if ('lat' in line_lower or 'latitude' in line_lower or 'start_lat' in line_lower) and line.count(',') >= 3:
            header_idx = i
            break
            
    if header_idx > 0:
        decoded = '\n'.join(lines[header_idx:])
        
    reader = csv.DictReader(io.StringIO(decoded))
    points = []

    lat_col = _find_column(reader.fieldnames, ['latitude', 'lat', 'y', 'latitud', 'start_lat'])
    lng_col = _find_column(reader.fieldnames, ['longitude', 'lon', 'lng', 'x', 'longitud', 'start_lng'])
    name_col = _find_column(reader.fieldnames, ['name', 'title', 'label', 'nombre', 'point_name'])
    desc_col = _find_column(reader.fieldnames, ['description', 'desc', 'descripcion'])
    alt_col = _find_column(reader.fieldnames, ['altitude', 'alt', 'elevation', 'elev', 'elevacion'])

    if not lat_col or not lng_col:
        raise ValueError(
            "CSV must contain latitude and longitude columns. "
            f"Found columns: {', '.join(reader.fieldnames)}"
        )

    for row in reader:
        try:
            lat = float(row[lat_col].strip())
            lng = float(row[lng_col].strip())
        except (ValueError, KeyError):
            continue

        name = row.get(name_col, '').strip() if name_col else ''
        description = row.get(desc_col, '').strip() if desc_col else ''
        altitude = float(row[alt_col]) if alt_col and row.get(alt_col, '').strip() else None

        points.append(MapPoint(
            name=name or f"Point ({lat:.4f}, {lng:.4f})",
            description=description,
            latitude=lat,
            longitude=lng,
            altitude=altitude,
            source_file=uploaded_file_obj,
            source_type='csv',
            metadata=row,
        ))

    return points


def parse_kml(uploaded_file_obj, file_content):
    points = []
    root = ET.fromstring(file_content)

    placemarks = _find_all_descendants(root, 'Placemark')

    for placemark in placemarks:
        name_el = _find_child(placemark, 'name')
        desc_el = _find_child(placemark, 'description')
        point_el = _find_child(placemark, 'Point')

        if point_el is None:
            continue

        coord_el = _find_child(point_el, 'coordinates')
        if coord_el is None or not coord_el.text:
            continue

        coords = coord_el.text.strip().split(',')
        if len(coords) < 2:
            continue

        try:
            lng, lat = float(coords[0]), float(coords[1])
            altitude = float(coords[2]) if len(coords) > 2 and coords[2].strip() else None
        except ValueError:
            continue

        name = _get_text(name_el)
        description = _get_text(desc_el)

        points.append(MapPoint(
            name=name or f"Point ({lat:.4f}, {lng:.4f})",
            description=description,
            latitude=lat,
            longitude=lng,
            altitude=altitude,
            source_file=uploaded_file_obj,
            source_type='kml',
            metadata={'kml_type': 'Point'},
        ))

    return points


def parse_gpx(uploaded_file_obj, file_content):
    points = []
    root = ET.fromstring(file_content)

    wpt_elements = _find_all_descendants(root, 'wpt')

    for wpt in wpt_elements:
        try:
            lat = float(wpt.attrib.get('lat', 0))
            lon = float(wpt.attrib.get('lon', 0))
        except (ValueError, TypeError):
            continue

        name_el = _find_child(wpt, 'name')
        desc_el = _find_child(wpt, 'desc', 'cmt')
        ele_el = _find_child(wpt, 'ele')

        name = _get_text(name_el)
        description = _get_text(desc_el)
        altitude = float(_get_text(ele_el)) if ele_el is not None and ele_el.text else None

        points.append(MapPoint(
            name=name or f"Waypoint ({lat:.4f}, {lon:.4f})",
            description=description,
            latitude=lat,
            longitude=lon,
            altitude=altitude,
            source_file=uploaded_file_obj,
            source_type='gpx',
            metadata={'gpx_type': 'wpt'},
        ))

    trk_points = [e for e in root.iter() if _ns_strip(e.tag) == 'trkpt']

    for i, trkpt in enumerate(trk_points):
        try:
            lat = float(trkpt.attrib.get('lat', 0))
            lon = float(trkpt.attrib.get('lon', 0))
        except (ValueError, TypeError):
            continue

        ele_el = _find_child(trkpt, 'ele')
        time_el = _find_child(trkpt, 'time')

        altitude = float(_get_text(ele_el)) if ele_el is not None and ele_el.text else None
        time_str = _get_text(time_el)

        ext_el = _find_child(trkpt, 'extensions')
        iri_val = None
        if ext_el is not None:
            iri_el = _find_child(ext_el, 'iri')
            if iri_el is not None and iri_el.text:
                try:
                    iri_val = float(iri_el.text.strip())
                except ValueError:
                    pass

        metadata = {
            'gpx_type': 'trkpt',
            'time': time_str,
            'track_index': i,
        }
        if iri_val is not None:
            metadata['iri'] = iri_val

        points.append(MapPoint(
            name=f"Track Point {i + 1}",
            description=f"Time: {time_str}" if time_str else '',
            latitude=lat,
            longitude=lon,
            altitude=altitude,
            source_file=uploaded_file_obj,
            source_type='gpx',
            metadata=metadata,
        ))

    return points


PARSERS = {
    'csv': parse_csv,
    'kml': parse_kml,
    'gpx': parse_gpx,
}


def _find_column(fieldnames, candidates):
    if not fieldnames:
        return None
    lowered = [f.lower().strip() for f in fieldnames]
    for candidate in candidates:
        if candidate in lowered:
            return fieldnames[lowered.index(candidate)]
    return None
