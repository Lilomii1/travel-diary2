/* =========================================================
   🌍 Дневник Путешественника — единый JS-файл
   ========================================================= */

/* ---------------------- STORAGE ---------------------- */
const Storage = (() => {
    const KEY = 'travel_diary_trips';

    function getAll() {
        try {
            const data = localStorage.getItem(KEY);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            console.error('Ошибка чтения данных:', e);
            return [];
        }
    }

    function saveAll(trips) {
        localStorage.setItem(KEY, JSON.stringify(trips));
    }

    function add(trip) {
        const trips = getAll();
        trip.id = Date.now().toString();
        trip.createdAt = new Date().toISOString();
        trips.push(trip);
        saveAll(trips);
        return trip;
    }

    function update(id, updatedTrip) {
        const trips = getAll();
        const idx = trips.findIndex(t => t.id === id);
        if (idx !== -1) {
            trips[idx] = { ...trips[idx], ...updatedTrip, id };
            saveAll(trips);
            return trips[idx];
        }
        return null;
    }

    function remove(id) {
        saveAll(getAll().filter(t => t.id !== id));
    }

    function getById(id) {
        return getAll().find(t => t.id === id) || null;
    }

    function replaceAll(newTrips) {
        saveAll(newTrips);
    }

    return { getAll, saveAll, add, update, remove, getById, replaceAll };
})();


/* ---------------------- MAP (Leaflet) ---------------------- */
const TravelMap = (() => {
    let map = null;
    let markersLayer = null;
    let routeLine = null;
    let routeVisible = true;
    let onEditRequest = null;
    let onDeleteRequest = null;

    function init(handlers = {}) {
        onEditRequest = handlers.onEdit;
        onDeleteRequest = handlers.onDelete;

        map = L.map('map', {
            worldCopyJump: true
        }).setView([48.3794, 31.1656], 5);

        // ✅ Рабочий провайдер тайлов — CartoDB Voyager (разрешён для свободного использования)
        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
            attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors © <a href="https://carto.com/attributions">CARTO</a>',
            subdomains: 'abcd',
            maxZoom: 20
        }).addTo(map);

        markersLayer = L.layerGroup().addTo(map);
        routeLine = L.polyline([], {
            color: '#4f46e5',
            weight: 3,
            opacity: 0.65,
            dashArray: '8, 8'
        }).addTo(map);
    }

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

    function totalDistance(trips) {
        if (trips.length < 2) return 0;
        const sorted = [...trips].sort((a, b) =>
            new Date(a.startDate) - new Date(b.startDate)
        );
        let total = 0;
        for (let i = 1; i < sorted.length; i++) {
            total += haversine(
                sorted[i - 1].lat, sorted[i - 1].lng,
                sorted[i].lat, sorted[i].lng
            );
        }
        return Math.round(total);
    }

    // Разные цвета для маркеров по рейтингу
    function markerColor(rating) {
        if (rating >= 5) return '#10b981';   // зелёный
        if (rating >= 4) return '#3b82f6';   // синий
        if (rating >= 3) return '#f59e0b';   // оранжевый
        if (rating >= 1) return '#ef4444';   // красный
        return '#64748b';                    // серый
    }

    function render(trips) {
        markersLayer.clearLayers();

        if (!trips.length) {
            routeLine.setLatLngs([]);
            map.setView([48.3794, 31.1656], 5);
            return;
        }

        const sorted = [...trips].sort((a, b) =>
            new Date(a.startDate) - new Date(b.startDate)
        );
        const coords = [];

        sorted.forEach(trip => {
            const rating = '★'.repeat(trip.rating || 0);
            const color = markerColor(trip.rating || 0);

            const markerIcon = L.divIcon({
                className: 'custom-marker',
                html: `<div style="
                    background:${color};
                    width:28px;height:28px;
                    border-radius:50% 50% 50% 0;
                    transform:rotate(-45deg);
                    border:3px solid #fff;
                    box-shadow:0 2px 6px rgba(0,0,0,.35);
                "></div>`,
                iconSize: [28, 28],
                iconAnchor: [14, 28],
                popupAnchor: [0, -28]
            });

            const marker = L.marker([trip.lat, trip.lng], { icon: markerIcon });
            marker.bindPopup(`
                <strong>${escapeHtml(trip.title)}</strong><br>
                📍 ${escapeHtml(trip.city)}, ${escapeHtml(trip.country)}<br>
                📅 ${formatDate(trip.startDate)} — ${formatDate(trip.endDate)}<br>
                ${rating ? `<span style="color:#f59e0b">${rating}</span><br>` : ''}
                <div class="popup-actions">
                    <button class="popup-edit" onclick="TravelMap.__edit('${trip.id}')">✏️ Изменить</button>
                    <button class="popup-delete" onclick="TravelMap.__delete('${trip.id}')">🗑 Удалить</button>
                </div>
            `);

            markersLayer.addLayer(marker);
            coords.push([trip.lat, trip.lng]);
        });

        routeLine.setLatLngs(coords);
        routeLine.setStyle({ opacity: routeVisible ? 0.65 : 0 });

        fitAll();
    }

    function fitAll() {
        const points = [];
        markersLayer.eachLayer(l => {
            const ll = l.getLatLng();
            points.push([ll.lat, ll.lng]);
        });
        if (!points.length) return;
        if (points.length === 1) {
            map.setView(points[0], 8);
        } else {
            map.fitBounds(L.latLngBounds(points), { padding: [40, 40], maxZoom: 10 });
        }
    }

    function toggleRoute() {
        routeVisible = !routeVisible;
        routeLine.setStyle({ opacity: routeVisible ? 0.65 : 0 });
        return routeVisible;
    }

    function resetView() {
        if (!markersLayer.getLayers().length) {
            map.setView([48.3794, 31.1656], 5);
        } else {
            fitAll();
        }
    }

    function invalidate() {
        if (map) setTimeout(() => map.invalidateSize(), 100);
    }

    // Обёртки для popup-кнопок
    function __edit(id) { if (onEditRequest) onEditRequest(id); }
    function __delete(id) { if (onDeleteRequest) onDeleteRequest(id); }

    // Утилиты
    function escapeHtml(s) {
        return String(s).replace(/[&<>"']/g, c => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;',
            '"': '&quot;', "'": '&#39;'
        }[c]));
    }

    function formatDate(iso) {
        if (!iso) return '';
        const d = new Date(iso);
        return d.toLocaleDateString('ru-RU', {
            day: 'numeric', month: 'short', year: 'numeric'
        });
    }

    return {
        init, render, totalDistance, haversine, invalidate,
        fitAll, toggleRoute, resetView,
        __edit, __delete
    };
})();


/* ---------------------- UI / APP ---------------------- */
(() => {
    let trips = [];
    let editingId = null;
    let currentRating = 0;

    // === DOM ===
    const els = {
        tripsList: document.getElementById('tripsList'),
        emptyState: document.getElementById('emptyState'),
        searchInput: document.getElementById('searchInput'),
        sortSelect: document.getElementById('sortSelect'),
        modal: document.getElementById('tripModal'),
        modalTitle: document.getElementById('modalTitle'),
        form: document.getElementById('tripForm'),
        addBtn: document.getElementById('addTripBtn'),
        closeBtn: document.getElementById('closeModal'),
        cancelBtn: document.getElementById('cancelBtn'),
        ratingStars: document.getElementById('ratingStars'),
        tripId: document.getElementById('tripId'),
        tripTitle: document.getElementById('tripTitle'),
        tripCountry: document.getElementById('tripCountry'),
        tripCity: document.getElementById('tripCity'),
        tripStart: document.getElementById('tripStart'),
        tripEnd: document.getElementById('tripEnd'),
        tripLat: document.getElementById('tripLat'),
        tripLng: document.getElementById('tripLng'),
        tripNotes: document.getElementById('tripNotes'),
        tripRating: document.getElementById('tripRating'),
        statTrips: document.getElementById('statTrips'),
        statCities: document.getElementById('statCities'),
        statCountries: document.getElementById('statCountries'),
        statDistance: document.getElementById('statDistance'),
        statDays: document.getElementById('statDays'),
        statPlaces: document.getElementById('statPlaces'),
        // toolbar
        fitAllBtn: document.getElementById('fitAllBtn'),
        toggleRouteBtn: document.getElementById('toggleRouteBtn'),
        resetViewBtn: document.getElementById('resetViewBtn'),
        // import / export
        exportBtn: document.getElementById('exportBtn'),
        importInput: document.getElementById('importInput')
    };

    // === Утилиты ===
    function escapeHtml(s) {
        return String(s).replace(/[&<>"']/g, c => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;',
            '"': '&quot;', "'": '&#39;'
        }[c]));
    }

    function formatDate(iso) {
        if (!iso) return '';
        const d = new Date(iso);
        return d.toLocaleDateString('ru-RU', {
            day: 'numeric', month: 'short', year: 'numeric'
        });
    }

    function daysBetween(start, end) {
        const ms = new Date(end) - new Date(start);
        return Math.max(1, Math.round(ms / (1000 * 60 * 60 * 24)) + 1);
    }

    function pluralDays(n) {
        const mod10 = n % 10, mod100 = n % 100;
        if (mod10 === 1 && mod100 !== 11) return 'день';
        if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'дня';
        return 'дней';
    }

    // === Инициализация ===
    function init() {
        TravelMap.init({
            onEdit: id => {
                const t = Storage.getById(id);
                if (t) openModal(t);
            },
            onDelete: id => {
                const t = Storage.getById(id);
                if (!t) return;
                if (confirm(`Удалить поездку «${t.title}»?`)) {
                    Storage.remove(id);
                    trips = Storage.getAll();
                    renderAll();
                }
            }
        });

        trips = Storage.getAll();
        renderAll();
        bindEvents();
    }

    function bindEvents() {
        els.addBtn.addEventListener('click', () => openModal());
        els.closeBtn.addEventListener('click', closeModal);
        els.cancelBtn.addEventListener('click', closeModal);
        els.form.addEventListener('submit', handleSubmit);
        els.searchInput.addEventListener('input', renderTrips);
        els.sortSelect.addEventListener('change', renderTrips);

        els.modal.addEventListener('click', e => {
            if (e.target === els.modal) closeModal();
        });

        // Звёзды рейтинга
        els.ratingStars.querySelectorAll('span').forEach(star => {
            star.addEventListener('click', () => {
                currentRating = parseInt(star.dataset.value);
                els.tripRating.value = currentRating;
                updateStars(currentRating);
            });
            star.addEventListener('mouseenter', () => {
                updateStars(parseInt(star.dataset.value));
            });
        });
        els.ratingStars.addEventListener('mouseleave', () => updateStars(currentRating));

        document.addEventListener('keydown', e => {
            if (e.key === 'Escape' && els.modal.classList.contains('active')) closeModal();
        });

        window.addEventListener('resize', () => TravelMap.invalidate());

        // Панель над картой
        els.fitAllBtn.addEventListener('click', () => TravelMap.fitAll());
        els.toggleRouteBtn.addEventListener('click', () => {
            const visible = TravelMap.toggleRoute();
            els.toggleRouteBtn.textContent = visible ? '🛣 Скрыть маршрут' : '🛣 Показать маршрут';
        });
        els.resetViewBtn.addEventListener('click', () => TravelMap.resetView());

        // Экспорт / импорт
        els.exportBtn.addEventListener('click', exportData);
        els.importInput.addEventListener('change', importData);
    }

    function updateStars(n) {
        els.ratingStars.querySelectorAll('span').forEach(s => {
            s.classList.toggle('active', parseInt(s.dataset.value) <= n);
        });
    }

    // === Модальное окно ===
    function openModal(trip = null) {
        els.form.reset();
        editingId = null;

        if (trip) {
            editingId = trip.id;
            els.modalTitle.textContent = 'Редактировать поездку';
            els.tripId.value = trip.id;
            els.tripTitle.value = trip.title;
            els.tripCountry.value = trip.country;
            els.tripCity.value = trip.city;
            els.tripStart.value = trip.startDate;
            els.tripEnd.value = trip.endDate;
            els.tripLat.value = trip.lat;
            els.tripLng.value = trip.lng;
            els.tripNotes.value = trip.notes || '';
            currentRating = trip.rating || 0;
            els.tripRating.value = currentRating;
            updateStars(currentRating);
        } else {
            els.modalTitle.textContent = 'Новая поездка';
            currentRating = 0;
            els.tripRating.value = 0;
            updateStars(0);
        }

        els.modal.classList.add('active');
        setTimeout(() => els.tripTitle.focus(), 100);
    }

    function closeModal() {
        els.modal.classList.remove('active');
        els.form.reset();
        editingId = null;
    }

    // === Сохранение ===
    function handleSubmit(e) {
        e.preventDefault();

        const trip = {
            title: els.tripTitle.value.trim(),
            country: els.tripCountry.value.trim(),
            city: els.tripCity.value.trim(),
            startDate: els.tripStart.value,
            endDate: els.tripEnd.value,
            lat: parseFloat(els.tripLat.value),
            lng: parseFloat(els.tripLng.value),
            notes: els.tripNotes.value.trim(),
            rating: parseInt(els.tripRating.value) || 0
        };

        if (!trip.title || !trip.country || !trip.city || !trip.startDate || !trip.endDate) {
            alert('Заполните все обязательные поля');
            return;
        }
        if (new Date(trip.endDate) < new Date(trip.startDate)) {
            alert('Дата окончания не может быть раньше даты начала');
            return;
        }
        if (isNaN(trip.lat) || isNaN(trip.lng) ||
            trip.lat < -90 || trip.lat > 90 ||
            trip.lng < -180 || trip.lng > 180) {
            alert('Некорректные координаты. Широта: -90..90, долгота: -180..180');
            return;
        }

        if (editingId) {
            Storage.update(editingId, trip);
        } else {
            Storage.add(trip);
        }

        trips = Storage.getAll();
        renderAll();
        closeModal();
    }

    // === Рендер ===
    function renderAll() {
        renderTrips();
        renderStats();
        TravelMap.render(trips);
    }

    function renderTrips() {
        const query = els.searchInput.value.trim().toLowerCase();
        const filtered = query
            ? trips.filter(t =>
                t.title.toLowerCase().includes(query) ||
                t.country.toLowerCase().includes(query) ||
                t.city.toLowerCase().includes(query))
            : [...trips];

        // Сортировка
        const mode = els.sortSelect.value;
        filtered.sort((a, b) => {
            switch (mode) {
                case 'date-asc':     return new Date(a.startDate) - new Date(b.startDate);
                case 'rating-desc':  return (b.rating || 0) - (a.rating || 0);
                case 'title-asc':    return a.title.localeCompare(b.title, 'ru');
                case 'country-asc':  return a.country.localeCompare(b.country, 'ru');
                case 'date-desc':
                default:             return new Date(b.startDate) - new Date(a.startDate);
            }
        });

        els.tripsList.innerHTML = '';

        if (!filtered.length) {
            els.emptyState.classList.remove('hidden');
            els.emptyState.querySelector('p').textContent = trips.length
                ? '🔍 Ничего не найдено по вашему запросу.'
                : 'Пока нет ни одной поездки. Нажмите «+ Добавить поездку», чтобы начать! 🚀';
            return;
        }

        els.emptyState.classList.add('hidden');
        filtered.forEach(trip => els.tripsList.appendChild(createTripCard(trip)));
    }

    function createTripCard(trip) {
        const card = document.createElement('div');
        card.className = 'trip-card';

        const days = daysBetween(trip.startDate, trip.endDate);
        const stars = '★'.repeat(trip.rating || 0) +
                      '☆'.repeat(5 - (trip.rating || 0));

        card.innerHTML = `
            <h3>${escapeHtml(trip.title)}</h3>
            <div class="trip-location">📍 ${escapeHtml(trip.city)}, ${escapeHtml(trip.country)}</div>
            <div class="trip-dates">
                📅 ${formatDate(trip.startDate)} — ${formatDate(trip.endDate)}
                <span class="trip-duration">${days} ${pluralDays(days)}</span>
            </div>
            ${trip.rating ? `<div class="trip-rating">${stars}</div>` : ''}
            ${trip.notes ? `<div class="trip-notes">${escapeHtml(trip.notes)}</div>` : ''}
            <div class="trip-actions">
                <button class="btn btn-edit"   data-action="edit"   data-id="${trip.id}">✏️ Изменить</button>
                <button class="btn btn-danger" data-action="delete" data-id="${trip.id}">🗑 Удалить</button>
            </div>
        `;

        card.querySelector('[data-action="edit"]').addEventListener('click', () => {
            const t = Storage.getById(trip.id);
            if (t) openModal(t);
        });

        card.querySelector('[data-action="delete"]').addEventListener('click', () => {
            if (confirm(`Удалить поездку «${trip.title}»?`)) {
                Storage.remove(trip.id);
                trips = Storage.getAll();
                renderAll();
            }
        });

        return card;
    }

    function renderStats() {
        els.statTrips.textContent = trips.length;
        els.statCities.textContent = new Set(trips.map(t => t.city.toLowerCase())).size;
        els.statCountries.textContent = new Set(trips.map(t => t.country.toLowerCase())).size;
        els.statPlaces.textContent = trips.length;
        els.statDistance.textContent = TravelMap.totalDistance(trips).toLocaleString('ru-RU');

        const totalDays = trips.reduce((sum, t) => sum + daysBetween(t.startDate, t.endDate), 0);
        els.statDays.textContent = totalDays;
    }

    // === Экспорт / импорт ===
    function exportData() {
        if (!trips.length) {
            alert('Нет данных для экспорта');
            return;
        }
        const blob = new Blob([JSON.stringify(trips, null, 2)], {
            type: 'application/json'
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `travel-diary-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    function importData(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = ev => {
            try {
                const data = JSON.parse(ev.target.result);
                if (!Array.isArray(data)) throw new Error('Не массив');

                const mode = confirm(
                    'Импорт: ОК — добавить к текущим, Отмена — заменить все поездки.'
                );

                if (mode) {
                    // Добавить к текущим (с новыми id, чтобы не конфликтовали)
                    const existing = Storage.getAll();
                    const merged = existing.concat(
                        data.map(t => ({ ...t, id: Date.now() + '_' + Math.random().toString(36).slice(2, 8) }))
                    );
                    Storage.replaceAll(merged);
                } else {
                    Storage.replaceAll(data);
                }

                trips = Storage.getAll();
                renderAll();
                alert(`Импортировано поездок: ${data.length}`);
            } catch (err) {
                console.error(err);
                alert('Ошибка чтения файла: ' + err.message);
            } finally {
                e.target.value = '';
            }
        };
        reader.readAsText(file);
    }

    // === Старт ===
    document.addEventListener('DOMContentLoaded', init);
})();