(function () {
    'use strict';

    const state = {
        map: null,
        layers: {},
        layerControl: {},
        fileVisibility: {},
        currentBounds: null,
        heatmapLayer: null,
        heatmapVisible: false,
        heatmapData: [],
        iriLineLayer: null,
        iriLineBuilt: false,
        iriLineVisible: true,
        pointsVisible: false,
        allPointsData: [],
        compareMode: false,
        map2: null,
        layers2: {},
        iriLines: {},
        iriLines2: {},
        chartVisible: false,
        charts: [],
    };

    const COLORS = {
        csv: '#22c55e',
        kml: '#3b82f6',
        gpx: '#f59e0b',
    };

    const ICONS = {
        csv: L.divIcon({
            className: 'custom-marker',
            html: '<div style="background:#22c55e;width:12px;height:12px;border-radius:50%;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.4)"></div>',
            iconSize: [12, 12],
            iconAnchor: [6, 6],
        }),
        kml: L.divIcon({
            className: 'custom-marker',
            html: '<div style="background:#3b82f6;width:12px;height:12px;border-radius:2px;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.4)"></div>',
            iconSize: [12, 12],
            iconAnchor: [6, 6],
        }),
        gpx: L.divIcon({
            className: 'custom-marker',
            html: '<div style="background:#f59e0b;width:12px;height:12px;border-radius:50%;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.4)"></div>',
            iconSize: [12, 12],
            iconAnchor: [6, 6],
        }),
    };

    function init() {
        initMap();
        initDropZone();
        initForm();
        initMapTools();
        initNotifications();
        loadFiles();
        setupAutoRefresh();
    }

    // ===== Map =====
    function initMap() {
        state.map = L.map('map', {
            center: [20, 0],
            zoom: 2,
            zoomControl: false,
            attributionControl: true,
            fadeAnimation: true,
            zoomAnimation: true,
        });

        const voyager = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
            subdomains: 'abcd',
            maxZoom: 20,
            minZoom: 1,
        });

        const satellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
            maxZoom: 20,
            minZoom: 1,
        });

        const terrain = L.tileLayer('https://stamen-tiles-{s}.a.ssl.fastly.net/terrain/{z}/{x}/{y}{r}.png', {
            attribution: 'Map tiles by <a href="http://stamen.com">Stamen Design</a>, <a href="http://creativecommons.org/licenses/by/3.0">CC BY 3.0</a> &mdash; Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
            subdomains: 'abcd',
            maxZoom: 18,
            minZoom: 1,
        });

        const light = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
            subdomains: 'abcd',
            maxZoom: 20,
            minZoom: 1,
        });

        const dark = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
            subdomains: 'abcd',
            maxZoom: 20,
            minZoom: 1,
        });

        const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
            maxZoom: 19,
            minZoom: 1,
        });

        voyager.addTo(state.map);

        state.map2 = L.map('map2', {
            center: [20, 0],
            zoom: 2,
            zoomControl: false,
            attributionControl: false,
            fadeAnimation: true,
            zoomAnimation: true,
        });
        
        const voyager2 = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
            subdomains: 'abcd',
            maxZoom: 20,
            minZoom: 1,
        });
        voyager2.addTo(state.map2);

        state.map.on('move', function() {
            if (!state.map2._isSyncing && state.compareMode) {
                state.map._isSyncing = true;
                state.map2.setView(state.map.getCenter(), state.map.getZoom(), {animate: false});
                state.map._isSyncing = false;
            }
        });
        state.map2.on('move', function() {
            if (!state.map._isSyncing && state.compareMode) {
                state.map2._isSyncing = true;
                state.map.setView(state.map2.getCenter(), state.map2.getZoom(), {animate: false});
                state.map2._isSyncing = false;
            }
        });
    }

    // ===== Drop Zone =====
    function initDropZone() {
        const dropZone = document.getElementById('drop-zone');
        const fileInput = document.getElementById('file-upload');
        const fileInfo = document.getElementById('file-info');
        const fileName = document.getElementById('file-name');
        const removeBtn = document.getElementById('remove-file');

        dropZone.addEventListener('click', function () {
            fileInput.click();
        });

        dropZone.addEventListener('dragover', function (e) {
            e.preventDefault();
            dropZone.classList.add('dragover');
        });

        dropZone.addEventListener('dragleave', function () {
            dropZone.classList.remove('dragover');
        });

        dropZone.addEventListener('drop', function (e) {
            e.preventDefault();
            dropZone.classList.remove('dragover');
            if (e.dataTransfer.files.length) {
                fileInput.files = e.dataTransfer.files;
                handleFileSelect(e.dataTransfer.files[0]);
            }
        });

        fileInput.addEventListener('change', function () {
            if (this.files.length) {
                handleFileSelect(this.files[0]);
            }
        });

        removeBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            fileInput.value = '';
            fileInfo.style.display = 'none';
            document.querySelector('.drop-zone-content').style.display = '';
            document.getElementById('submit-btn').disabled = true;
        });
    }

    function handleFileSelect(file) {
        const ext = file.name.split('.').pop().toLowerCase();
        const valid = ['csv', 'gpx'];
        if (valid.indexOf(ext) === -1) {
            showNotification('error', `Unsupported file type ".${ext}". Please upload CSV or GPX.`);
            return;
        }

        document.getElementById('file-name').textContent = file.name;
        document.getElementById('file-info').style.display = 'flex';
        document.querySelector('.drop-zone-content').style.display = 'none';
        document.getElementById('submit-btn').disabled = false;
    }

    // ===== Form Submit =====
    function initForm() {
        document.getElementById('upload-form').addEventListener('submit', function (e) {
            const btn = document.getElementById('submit-btn');
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
        });
    }

    // ===== Map Tools =====
    function initMapTools() {
        document.getElementById('btn-fit-all').addEventListener('click', function () {
            fitAllLayers();
        });
        
        if (document.getElementById('btn-compare')) {
            document.getElementById('btn-compare').addEventListener('click', function () {
                toggleCompareMode();
            });
        }
        
        if (document.getElementById('btn-chart')) {
            document.getElementById('btn-chart').addEventListener('click', function () {
                toggleChart();
            });
        }
        
        if (document.getElementById('btn-close-chart')) {
            document.getElementById('btn-close-chart').addEventListener('click', function () {
                if (state.chartVisible) toggleChart();
            });
        }

        if (document.getElementById('btn-close-sidebar')) {
            document.getElementById('btn-close-sidebar').addEventListener('click', function () {
                document.getElementById('sidebar').classList.add('collapsed');
                document.getElementById('btn-open-sidebar').style.display = 'flex';
                setTimeout(() => {
                    if (state.map) state.map.invalidateSize();
                    if (state.map2) state.map2.invalidateSize();
                }, 300);
            });
        }
        
        if (document.getElementById('btn-open-sidebar')) {
            document.getElementById('btn-open-sidebar').addEventListener('click', function () {
                document.getElementById('sidebar').classList.remove('collapsed');
                document.getElementById('btn-open-sidebar').style.display = 'none';
                setTimeout(() => {
                    if (state.map) state.map.invalidateSize();
                    if (state.map2) state.map2.invalidateSize();
                }, 300);
            });
        }
    }

    function fitAllLayers() {
        if (!state.allPointsData || state.allPointsData.length === 0) return;

        let bounds = L.latLngBounds();
        
        // Find visible files
        let visibleIds = new Set();
        if (state.compareMode) {
            const leftId = document.getElementById('left-map-select').value;
            const rightId = document.getElementById('right-map-select').value;
            if (leftId) visibleIds.add(leftId);
            if (rightId) visibleIds.add(rightId);
        } else {
            Object.keys(state.fileVisibility).forEach(function(fid) {
                if (state.fileVisibility[fid] !== false) visibleIds.add(fid);
            });
        }

        if (visibleIds.size === 0) return;

        state.allPointsData.forEach(function(pt) {
            if (visibleIds.has(pt.source_file_id)) {
                bounds.extend([pt.latitude, pt.longitude]);
            }
        });

        if (bounds.isValid()) {
            state.map.fitBounds(bounds.pad(0.1), { maxZoom: 16 });
            if (state.compareMode && state.map2) {
                state.map2.fitBounds(bounds.pad(0.1), { maxZoom: 16 });
            }
        }
    }

    function toggleCompareMode() {
        state.compareMode = !state.compareMode;
        const btn = document.getElementById('btn-compare');
        
        if (state.compareMode) {
            btn.classList.add('active');
            document.getElementById('map2').style.display = 'block';
            document.getElementById('compare-controls').style.display = 'block';
            document.getElementById('files-list').style.display = 'none';
            
            updateCompareDropdowns();
            
            state.map.invalidateSize();
            if (state.map2) {
                state.map2.invalidateSize();
                state.map2.setView(state.map.getCenter(), state.map.getZoom());
            }
            
            updateVisibility();
        } else {
            btn.classList.remove('active');
            document.getElementById('map2').style.display = 'none';
            document.getElementById('compare-controls').style.display = 'none';
            document.getElementById('files-list').style.display = 'flex';
            
            state.map.invalidateSize();
            updateVisibility();
        }
    }

    function updateCompareDropdowns() {
        const leftSelect = document.getElementById('left-map-select');
        const rightSelect = document.getElementById('right-map-select');
        
        const files = Array.from(document.querySelectorAll('.file-item')).map(el => {
            return {
                id: el.dataset.fileId,
                name: el.querySelector('.file-name').textContent
            };
        });
        
        let leftHtml = '<option value="">-- Select File --</option>';
        let rightHtml = '<option value="">-- Select File --</option>';
        
        files.forEach((f, idx) => {
            leftHtml += `<option value="${f.id}" ${idx === 0 ? 'selected' : ''}>${f.name}</option>`;
            rightHtml += `<option value="${f.id}" ${idx === 1 ? 'selected' : ''}>${f.name}</option>`;
        });
        
        leftSelect.innerHTML = leftHtml;
        rightSelect.innerHTML = rightHtml;
        
        leftSelect.onchange = applyCompareLayers;
        rightSelect.onchange = applyCompareLayers;
    }

    function applyCompareLayers() {
        if (!state.compareMode) return;
        
        const leftId = document.getElementById('left-map-select').value;
        const rightId = document.getElementById('right-map-select').value;
        
        Object.values(state.layers).forEach(l => state.map.removeLayer(l));
        Object.values(state.iriLines).forEach(l => state.map.removeLayer(l));
        
        Object.values(state.layers2).forEach(l => state.map2.removeLayer(l));
        Object.values(state.iriLines2).forEach(l => state.map2.removeLayer(l));
        
        if (leftId) {
            if (state.pointsVisible && state.layers[leftId]) state.layers[leftId].addTo(state.map);
            if (state.iriLineVisible && state.iriLines[leftId]) state.iriLines[leftId].addTo(state.map);
        }
        
        if (rightId) {
            if (state.pointsVisible && state.layers2[rightId]) state.layers2[rightId].addTo(state.map2);
            if (state.iriLineVisible && state.iriLines2[rightId]) state.iriLines2[rightId].addTo(state.map2);
        }
    }

    // ===== Chart =====
    function toggleChart() {
        state.chartVisible = !state.chartVisible;
        const btn = document.getElementById('btn-chart');
        
        if (state.chartVisible) {
            btn.classList.add('active');
            document.getElementById('chart-panel').style.display = 'flex';
            renderChart();
        } else {
            btn.classList.remove('active');
            document.getElementById('chart-panel').style.display = 'none';
        }
        
        // Trigger map resize since container height changed
        setTimeout(() => {
            state.map.invalidateSize();
            if (state.map2) state.map2.invalidateSize();
        }, 100);
    }
    
    function createChartInstance(canvasId, points) {
        const labels = points.map((p, i) => 'Pt ' + (i + 1));
        const data = points.map(p => p.iri);
        const bgColors = points.map(p => getIriColor(p.iri));
        
        const ctx = document.getElementById(canvasId).getContext('2d');
        return new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'IRI',
                    data: data,
                    backgroundColor: bgColors,
                    borderWidth: 0,
                    barPercentage: 1.0,
                    categoryPercentage: 1.0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return 'IRI: ' + context.parsed.y.toFixed(2);
                            }
                        }
                    }
                },
                scales: {
                    x: { display: false },
                    y: {
                        beginAtZero: true,
                        title: { display: true, text: 'IRI Value' }
                    }
                }
            }
        });
    }

    function getFileName(fileId) {
        const el = document.querySelector(`.file-item[data-file-id="${fileId}"] .file-name`);
        return el ? el.textContent : 'Unknown File';
    }

    function renderChart() {
        if (!state.chartVisible || !state.allPointsData || state.allPointsData.length === 0) return;
        
        if (state.charts) {
            state.charts.forEach(c => c.destroy());
        }
        state.charts = [];
        
        const container = document.getElementById('chart-dynamic-container');
        if (!container) return;
        container.innerHTML = '';
        
        let visibleFiles = [];
        
        if (state.compareMode) {
            const leftId = document.getElementById('left-map-select').value;
            const rightId = document.getElementById('right-map-select').value;
            
            const selLeft = document.getElementById('left-map-select');
            const selRight = document.getElementById('right-map-select');
            
            if (leftId) visibleFiles.push({ id: leftId, title: 'Left: ' + (selLeft.options[selLeft.selectedIndex]?.text || 'Layer') });
            if (rightId) visibleFiles.push({ id: rightId, title: 'Right: ' + (selRight.options[selRight.selectedIndex]?.text || 'Layer') });
        } else {
            Object.keys(state.fileVisibility).forEach(fid => {
                if (state.fileVisibility[fid]) {
                    visibleFiles.push({ id: fid, title: getFileName(fid) });
                }
            });
        }
        
        if (visibleFiles.length === 0) {
            document.getElementById('chart-panel').style.display = 'none';
            return;
        }

        document.getElementById('chart-panel').style.display = 'flex';
        
        visibleFiles.forEach((f, idx) => {
            let pts = state.allPointsData.filter(p => p.source_file_id === f.id && p.iri !== null && p.iri !== undefined);
            if (pts.length > 0) {
                const wrapper = document.createElement('div');
                wrapper.style.cssText = 'flex: 1; min-width: 300px; display: flex; flex-direction: column; padding-right: 15px;';
                
                if (idx < visibleFiles.length - 1) {
                    wrapper.style.borderRight = '1px solid #cbd5e1';
                } else {
                    wrapper.style.paddingRight = '0';
                }
                
                const title = document.createElement('div');
                title.style.cssText = 'font-size: 11px; font-weight: 600; color: #475569; text-align: center; margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;';
                title.textContent = f.title + ' (IRI)';
                
                const canvasWrapper = document.createElement('div');
                canvasWrapper.style.cssText = 'flex: 1; position: relative; width: 100%;';
                
                const canvas = document.createElement('canvas');
                canvas.id = 'chart_' + f.id + '_' + idx;
                
                canvasWrapper.appendChild(canvas);
                wrapper.appendChild(title);
                wrapper.appendChild(canvasWrapper);
                container.appendChild(wrapper);
                
                state.charts.push(createChartInstance(canvas.id, pts));
            }
        });
    }

    // ===== Heatmap =====
    function toggleHeatmap() {
        state.heatmapVisible = !state.heatmapVisible;
        const btn = document.getElementById('btn-heatmap');

        if (state.heatmapVisible) {
            btn.classList.add('active');
            state.iriLineVisible = false;
            state.pointsVisible = false;
            document.getElementById('btn-toggle-points').classList.remove('active');
            removeIriLine();
            hidePointLayers();
            document.getElementById('iri-legend').style.display = 'none';
            showHeatmap();
        } else {
            btn.classList.remove('active');
            hideHeatmap();
            state.iriLineVisible = true;
            updateVisibility();
        }
    }

    function showHeatmap() {
        removeIriLine();
        hidePointLayers();
        if (!state.heatmapLayer && state.heatmapData.length > 0) {
            const gradient = {
                0.0: '#0000ff',
                0.2: '#00ffff',
                0.4: '#00ff00',
                0.6: '#ffff00',
                0.8: '#ff8800',
                1.0: '#ff0000',
            };
            state.heatmapLayer = L.heatLayer(state.heatmapData, {
                radius: 25,
                blur: 15,
                maxZoom: 17,
                max: 1.0,
                gradient: gradient,
            });
        }
        if (state.heatmapLayer) {
            state.heatmapLayer.addTo(state.map);
        }
    }

    function hideHeatmap() {
        if (state.heatmapLayer) {
            state.map.removeLayer(state.heatmapLayer);
        }
        showPointLayers();
    }

    function hidePointLayers() {
        Object.values(state.layers).forEach(function (layer) {
            if (state.map.hasLayer(layer)) {
                state.map.removeLayer(layer);
            }
        });
    }

    function showPointLayers() {
        Object.keys(state.layers).forEach(function (fileId) {
            if (state.fileVisibility[fileId] !== false) {
                state.layers[fileId].addTo(state.map);
            }
        });
    }

    function updateVisibility() {
        if (state.compareMode) {
            if (state.iriLineVisible && !state.iriLineBuilt) {
                buildAndShowIriLine();
            } else {
                applyCompareLayers();
            }
            if (state.heatmapVisible && state.heatmapLayer) {
                state.map.removeLayer(state.heatmapLayer);
            }
            if (state.chartVisible) renderChart();
            return;
        }

        if (state.iriLineVisible) {
            buildAndShowIriLine();
            hidePointLayers();
        } else {
            removeIriLine();
        }
        if (state.pointsVisible) {
            if (state.iriLineVisible) removeIriLine();
            showPointLayers();
        }
        if (!state.pointsVisible && !state.iriLineVisible) {
            hidePointLayers();
            removeIriLine();
        }
        
        if (state.chartVisible) renderChart();
    }

    // ===== Points Toggle =====
    function togglePoints() {
        state.pointsVisible = !state.pointsVisible;
        const btn = document.getElementById('btn-toggle-points');

        if (state.pointsVisible) {
            btn.classList.add('active');
            state.iriLineVisible = false;
            document.getElementById('btn-heatmap').classList.remove('active');
        } else {
            btn.classList.remove('active');
            state.iriLineVisible = true;
        }
        state.heatmapVisible = false;
        if (state.heatmapLayer) state.map.removeLayer(state.heatmapLayer);
        updateVisibility();
    }

    function getIriColor(iri) {
        if (iri === null || iri === undefined) return '#3b82f6';
        const val = parseFloat(iri);
        if (isNaN(val)) return '#3b82f6';
        if (val <= 2) return '#22c55e';
        if (val <= 4) return '#90EE90';
        if (val <= 6) return '#eab308';
        if (val <= 8) return '#f97316';
        return '#ef4444';
    }

    function buildAndShowIriLine() {
        if (state.iriLineBuilt) {
            if (!state.compareMode) {
                Object.keys(state.fileVisibility).forEach(function(fid) {
                    if (state.fileVisibility[fid] && state.iriLines[fid]) {
                        state.iriLines[fid].addTo(state.map);
                    } else if (state.iriLines[fid]) {
                        state.map.removeLayer(state.iriLines[fid]);
                    }
                });
            } else {
                applyCompareLayers();
            }
            return;
        }

        if (state.allPointsData.length === 0) return;

        var files = {};
        state.allPointsData.forEach(function (pt) {
            var fid = pt.source_file_id;
            if (!files[fid]) files[fid] = [];
            files[fid].push(pt);
        });

        state.iriLines = {};
        state.iriLines2 = {};

        Object.entries(files).forEach(function ([fid, pts]) {
            var fileLayer1 = L.layerGroup();
            var fileLayer2 = L.layerGroup();

            if (pts.length < 2) {
                pts.forEach(function (pt) {
                    var circle1 = L.circleMarker([pt.latitude, pt.longitude], {
                        radius: 5, color: getIriColor(pt.iri), fillColor: getIriColor(pt.iri), fillOpacity: 0.8, weight: 2
                    });
                    var circle2 = L.circleMarker([pt.latitude, pt.longitude], {
                        radius: 5, color: getIriColor(pt.iri), fillColor: getIriColor(pt.iri), fillOpacity: 0.8, weight: 2
                    });
                    fileLayer1.addLayer(circle1);
                    fileLayer2.addLayer(circle2);
                });
            } else {
                var latlngs = [];
                var iriValues = [];

                pts.forEach(function (pt) {
                    latlngs.push([pt.latitude, pt.longitude]);
                    iriValues.push(pt.iri);
                });

                for (var i = 0; i < latlngs.length - 1; i++) {
                    var color = getIriColor(iriValues[i] !== undefined ? iriValues[i] : iriValues[i + 1]);
                    var segment1 = L.polyline([latlngs[i], latlngs[i + 1]], {
                        color: color, weight: 4, opacity: 0.9, smoothFactor: 1
                    });
                    var segment2 = L.polyline([latlngs[i], latlngs[i + 1]], {
                        color: color, weight: 4, opacity: 0.9, smoothFactor: 1
                    });
                    fileLayer1.addLayer(segment1);
                    fileLayer2.addLayer(segment2);
                }
            }
            
            state.iriLines[fid] = fileLayer1;
            state.iriLines2[fid] = fileLayer2;
        });

        state.iriLineBuilt = true;
        
        if (!state.compareMode) {
            Object.keys(state.fileVisibility).forEach(function(fid) {
                if (state.fileVisibility[fid] && state.iriLines[fid]) {
                    state.iriLines[fid].addTo(state.map);
                }
            });
        } else {
            applyCompareLayers();
        }
    }

    function removeIriLine() {
        Object.values(state.iriLines || {}).forEach(function(l) { state.map.removeLayer(l); });
        Object.values(state.iriLines2 || {}).forEach(function(l) { if(state.map2) state.map2.removeLayer(l); });
    }

    // ===== Notifications =====
    function initNotifications() {
        if (typeof MESSAGES !== 'undefined') {
            Object.entries(MESSAGES).forEach(function ([type, msg]) {
                if (msg) showNotification(type, msg);
            });
        }
    }

    function showNotification(type, message) {
        const container = document.getElementById('notification-container');
        const icons = {
            success: 'fa-check-circle',
            error: 'fa-exclamation-circle',
            warning: 'fa-exclamation-triangle',
        };

        const notif = document.createElement('div');
        notif.className = 'notification ' + type;
        notif.innerHTML =
            '<i class="fas ' + (icons[type] || 'fa-info-circle') + '"></i>' +
            '<span>' + message + '</span>' +
            '<button class="notif-close"><i class="fas fa-times"></i></button>';

        notif.querySelector('.notif-close').addEventListener('click', function () {
            notif.remove();
        });

        container.appendChild(notif);
        setTimeout(function () { notif.remove(); }, 6000);
    }

    function loadFiles() {
        fetch('/map/api/files/')
            .then(function (r) { return r.json(); })
            .then(function (data) {
                renderFilesList(data.files);
                loadPoints();
            })
            .catch(function () {
                console.warn('Could not load files list');
            });
    }

    function renderFilesList(files) {
        const container = document.getElementById('files-list');

        if (!files.length) {
            container.innerHTML =
                '<div class="empty-state"><i class="fas fa-inbox"></i><p>No files uploaded yet</p></div>';
            return;
        }

        container.innerHTML = '';
        files.forEach(function (f) {
            if (state.fileVisibility[f.id] === undefined) {
                state.fileVisibility[f.id] = true;
            }
            
            const isVisible = state.fileVisibility[f.id];
            const el = document.createElement('div');
            el.className = 'file-item' + (isVisible ? ' active' : '');
            el.dataset.fileId = f.id;
            el.innerHTML =
                '<div class="file-icon ' + f.type + '"><i class="fas fa-' + getFileIcon(f.type) + '"></i></div>' +
                '<div class="file-details">' +
                    '<div class="file-name">' + escapeHtml(f.name) + '</div>' +
                    '<div class="file-meta">' +
                        '<span>' + f.type_display + '</span>' +
                        '<span>' + f.point_count + ' pts</span>' +
                    '</div>' +
                '</div>' +
                '<div class="file-actions">' +
                    '<button class="file-download-kml-btn" title="Download as KML" style="color: #3b82f6;"><i class="fas fa-download"></i></button>' +
                    '<button class="file-vis-toggle' + (isVisible ? ' visible' : '') + '" title="Toggle visibility"><i class="fas fa-' + (isVisible ? 'eye' : 'eye-slash') + '"></i></button>' +
                    '<button class="file-delete-btn" title="Delete"><i class="fas fa-trash-alt"></i></button>' +
                '</div>';

            el.querySelector('.file-download-kml-btn').addEventListener('click', function (e) {
                e.stopPropagation();
                exportToKML(f.id);
            });

            el.querySelector('.file-vis-toggle').addEventListener('click', function (e) {
                e.stopPropagation();
                toggleLayer(f.id, this);
            });

            el.querySelector('.file-delete-btn').addEventListener('click', function (e) {
                e.stopPropagation();
                deleteFile(f.id);
            });

            el.addEventListener('click', function () {
                flyToLayer(f.id);
            });

            container.appendChild(el);
        });
    }

    function getFileIcon(type) {
        return { csv: 'table', kml: 'draw-polygon', gpx: 'route' }[type] || 'file';
    }

    // ===== Load Points =====
    function loadPoints() {
        fetch('/map/api/points/')
            .then(function (r) { return r.json(); })
            .then(function (data) {
                renderPoints(data.points);
            })
            .catch(function () {
                showNotification('error', 'Failed to load map points.');
            });
    }

    function clearAllMapLayers() {
        if (state.layers) Object.values(state.layers).forEach(l => state.map.hasLayer(l) && state.map.removeLayer(l));
        if (state.layers2 && state.map2) Object.values(state.layers2).forEach(l => state.map2.hasLayer(l) && state.map2.removeLayer(l));
        if (state.iriLines) Object.values(state.iriLines).forEach(l => state.map.hasLayer(l) && state.map.removeLayer(l));
        if (state.iriLines2 && state.map2) Object.values(state.iriLines2).forEach(l => state.map2.hasLayer(l) && state.map2.removeLayer(l));
        if (state.heatmapLayer && state.map.hasLayer(state.heatmapLayer)) state.map.removeLayer(state.heatmapLayer);
    }

    function renderPoints(points) {
        clearAllMapLayers();
        
        var groups = {};

        state.iriLineBuilt = false;
        state.iriLineLayer = null;
        state.layers = {};
        state.allPointsData = points;
        state.heatmapData = [];
        points.forEach(function (pt) {
            state.heatmapData.push([pt.latitude, pt.longitude, 0.5]);
            var key = pt.source_file_id;
            if (!groups[key]) {
                groups[key] = [];
            }
            groups[key].push(pt);
        });

        Object.entries(groups).forEach(function ([fileId, pts]) {
            var layerGroup1 = L.layerGroup();
            var layerGroup2 = L.layerGroup();
            var sourceColor = COLORS[pts[0].source_type] || '#3b82f6';
            var icon = ICONS[pts[0].source_type] || ICONS.csv;

            pts.forEach(function (pt) {
                var marker1 = L.marker([pt.latitude, pt.longitude], { icon: icon });
                var marker2 = L.marker([pt.latitude, pt.longitude], { icon: icon });

                var popupContent =
                    '<div class="custom-popup">' +
                        '<h4 class="popup-title">' + escapeHtml(pt.name) + '</h4>' +
                        '<div class="popup-body">' +
                            (pt.description ? '<p>' + escapeHtml(pt.description) + '</p>' : '') +
                        '</div>' +
                        '<div class="popup-meta">' +
                            '<span><i class="fas fa-map-pin"></i> ' + pt.latitude.toFixed(5) + ', ' + pt.longitude.toFixed(5) + '</span>' +
                            (pt.altitude ? '<span><i class="fas fa-arrow-up"></i> ' + pt.altitude.toFixed(1) + 'm</span>' : '') +
                            '<span><i class="fas fa-file"></i> ' + escapeHtml(pt.source_file) + '</span>' +
                        '</div>' +
                    '</div>';

                marker1.bindPopup(popupContent, { maxWidth: 350, className: 'custom-popup-wrapper' });
                marker2.bindPopup(popupContent, { maxWidth: 350, className: 'custom-popup-wrapper' });

                layerGroup1.addLayer(marker1);
                layerGroup2.addLayer(marker2);
            });

            state.layers[fileId] = layerGroup1;
            state.layers2[fileId] = layerGroup2;
        });

        state.iriLineVisible = true;
        state.pointsVisible = false;
        updateVisibility();

        if (Object.keys(state.layers).length > 0 && !state.currentBounds) {
            setTimeout(fitAllLayers, 400);
        }
    }

    // ===== Layer Visibility =====
    function toggleLayer(fileId, btn) {
        const isVisible = state.fileVisibility[fileId];
        state.fileVisibility[fileId] = !isVisible;
        
        if (state.fileVisibility[fileId]) {
            btn.classList.add('visible');
            btn.querySelector('i').className = 'fas fa-eye';
            btn.closest('.file-item').classList.add('active');
        } else {
            btn.classList.remove('visible');
            btn.querySelector('i').className = 'fas fa-eye-slash';
            btn.closest('.file-item').classList.remove('active');
        }
        
        updateVisibility();
    }

    function exportToKML(fileId) {
        const fileItem = document.querySelector(`.file-item[data-file-id="${fileId}"] .file-name`);
        const fileName = (fileItem ? fileItem.textContent : 'export').replace(/\.[^/.]+$/, "") + ".kml";
        
        let pts = state.allPointsData.filter(p => p.source_file_id === fileId);
        if (!pts || pts.length < 2) {
            showNotification('error', 'Not enough points to generate a KML line.');
            return;
        }

        let kml = `<?xml version="1.0" encoding="UTF-8"?>\n<kml xmlns="http://www.opengis.net/kml/2.2">\n<Document>\n<name>${escapeHtml(fileName)}</name>\n`;
        
        function hexToKmlColor(hex) {
            if (!hex || hex.length < 7) return 'ff0000ff';
            const r = hex.substring(1, 3);
            const g = hex.substring(3, 5);
            const b = hex.substring(5, 7);
            return `ff${b}${g}${r}`;
        }

        const styles = {};
        for (let i = 0; i < pts.length - 1; i++) {
            const color = getIriColor(pts[i].iri);
            const kmlColor = hexToKmlColor(color);
            if (!styles[kmlColor]) {
                kml += `<Style id="style_${kmlColor}">\n  <LineStyle>\n    <color>${kmlColor}</color>\n    <width>4</width>\n  </LineStyle>\n</Style>\n`;
                styles[kmlColor] = true;
            }
        }

        for (let i = 0; i < pts.length - 1; i++) {
            const pt1 = pts[i];
            const pt2 = pts[i+1];
            const color = getIriColor(pt1.iri);
            const kmlColor = hexToKmlColor(color);
            
            kml += `<Placemark>\n`;
            kml += `  <name>Segment ${i+1}</name>\n`;
            kml += `  <description>IRI: ${pt1.iri !== null ? pt1.iri : 'N/A'}</description>\n`;
            kml += `  <styleUrl>#style_${kmlColor}</styleUrl>\n`;
            kml += `  <LineString>\n`;
            kml += `    <tessellate>1</tessellate>\n`;
            kml += `    <coordinates>\n`;
            kml += `      ${pt1.longitude},${pt1.latitude},${pt1.altitude || 0}\n`;
            kml += `      ${pt2.longitude},${pt2.latitude},${pt2.altitude || 0}\n`;
            kml += `    </coordinates>\n`;
            kml += `  </LineString>\n`;
            kml += `</Placemark>\n`;
        }
        
        kml += `</Document>\n</kml>`;
        
        const blob = new Blob([kml], { type: 'application/vnd.google-earth.kml+xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    function flyToLayer(fileId) {
        var layer = state.layers[fileId];
        if (!layer) return;

        var group = L.featureGroup();
        layer.eachLayer(function (l) {
            if (l instanceof L.Marker || l instanceof L.CircleMarker) {
                group.addLayer(l);
            }
        });

        if (group.getLayers().length > 0) {
            state.map.fitBounds(group.getBounds().pad(0.15), { maxZoom: 16 });
        }
    }

    // ===== Delete File =====
    function deleteFile(fileId) {
        if (!confirm('Delete this file and all its points from the map?')) return;

        fetch('/map/delete/' + fileId + '/', {
            method: 'DELETE',
            headers: {
                'X-CSRFToken': CSRF_TOKEN,
            },
        })
        .then(function (r) { return r.json(); })
        .then(function (data) {
            if (data.status === 'ok') {
                delete state.fileVisibility[fileId];
                state.allPointsData = state.allPointsData.filter(p => p.source_file_id !== fileId);
                showNotification('success', data.message);
                loadFiles();
            } else {
                showNotification('error', data.message);
            }
        })
        .catch(function () {
            showNotification('error', 'Failed to delete file.');
        });
    }

    // ===== Auto Refresh =====
    function setupAutoRefresh() {
        var lastUrl = window.location.href;
        setInterval(function () {
            if (window.location.href !== lastUrl) {
                lastUrl = window.location.href;
                return;
            }
        }, 1000);
    }

    // ===== Utilities =====
    function escapeHtml(str) {
        if (!str) return '';
        var div = document.createElement('div');
        div.appendChild(document.createTextNode(str));
        return div.innerHTML;
    }

    // ===== Init on DOM Ready =====
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
