// Модуль карты на базе Leaflet
const TravelMap = (() => {
    let map = null;
    let markersLayer = null;
    let routeLine = null;

    function init() {
        map = L.map('map').setView([48.3794, 31.1656], 5); // Центр — Украина

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 19
        }).addTo(map);

        markersLayer = L.layerGroup().addTo(map);
        routeLine = L.polyline([], {
            color: '#4f46e5',
            weight: 3,
            opacity: 0.6,
            dashArray: '8, 8'
        }).addTo(map);
    }

    // Хэверсайн — расстояние между двумя точками в км
    function haversine(lat1, lng1, lat2, lng2) {
        const R = 6371;
        const toRad = d => d * Math.PI / 180;
        const dLat = toRad(lat2 - lat1);
        const dLng = toRad(lng2 - lng1);
        const a = Math.sin(dLat / 2) ** 2 +
                  Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
                  Math.sin(dLng / 2) ** 2;
        return 2 * R * Math.asin(Math.sqrt(a));
    }

    // Общая длина маршрута (по порядку следования)
    function totalDistance(trips) {
        if (trips.length < 2) return 0;
        let total = 0;
        for (let i = 1; i < trips.length; i++) {
            total += haversine(
                trips[i - 1].lat, trips[i - 1].lng,
                trips[i].lat, trips[i].lng
            );
        }
        return Math.round(total);
    }

    function render(trips) {
        markersLayer.clearLayers();

        if (!trips.length) {
            routeLine.setLatLngs([]);
            map.setView([48.3794, 31.1656], 5);
            return;
        }

        const coords = [];

        // Сортируем по дате начала для корректного маршрута
        const sorted = [...trips].sort((a, b) =>
            new Date(a.startDate) - new Date(b.startDate)
        );

        sorted.forEach(trip => {
            const rating = '★'.repeat(trip.rating || 0);
            const marker = L.marker([trip.lat, trip.lng]);
            marker.bindPopup(`
                <strong>${escapeHtml(trip.title)}</strong><br>
                📍 ${escapeHtml(trip.city)}, ${escapeHtml(trip.country)}<br>
                📅 ${formatDate(trip.startDate)} — ${formatDate(trip.endDate)}<br>
                ${rating ? `<span style="color:#f59e0b">${rating}</span>` : ''}
            `);
            markersLayer.addLayer(marker);
            coords.push([trip.lat, trip.lng]);
        });

        routeLine.setLatLngs(coords);

        // Авто-масштаб под все маркеры
        const bounds = L.latLngBounds(coords);
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 10 });
    }

    function escapeHtml(s) {
        return String(s).replace(/[&<>"']/g, c => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;',
            '"': '&quot;', "'": '&#39;'
        }[c]));
    }

    function formatDate(iso) {
        if (!iso) return '';
        const d = new Date(iso);
        return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' });
    }

    function invalidate() {
        if (map) setTimeout(() => map.invalidateSize(), 100);
    }

    return { init, render, totalDistance, haversine, invalidate };
})();