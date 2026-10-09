// =========================================================
// main.js — точка входа приложения
// =========================================================

(function () {
    'use strict';

    function initApp() {
        console.log('🌍 Инициализация приложения «Дневник Путешественника»...');

        if (localStorage.getItem('travel_theme') === 'dark') {
            document.body.classList.add('dark');
        }

        window.__onMapClick = function (lat, lng) {
            const latInput = document.getElementById('tripLat');
            const lngInput = document.getElementById('tripLng');
            if (!latInput || !lngInput) return;
            latInput.value = lat.toFixed(6);
            lngInput.value = lng.toFixed(6);
            [latInput, lngInput].forEach(inp => {
                inp.style.transition = 'box-shadow 0.2s';
                inp.style.boxShadow = '0 0 0 3px rgba(79, 70, 229, 0.35)';
                setTimeout(() => { inp.style.boxShadow = ''; }, 500);
            });
        };

        // ✅ ИСПРАВЛЕНО: проверяем через typeof, а не window[name]
        // Модули объявлены через const и НЕ становятся свойствами window
        if (typeof Auth === 'undefined' ||
            typeof Storage === 'undefined' ||
            typeof PhotoUtils === 'undefined' ||
            typeof TravelMap === 'undefined') {
            console.error('❌ Не загружены модули. Проверьте порядок <script> в index.html');
            return;
        }

        if (!window.__mapInited) {
            window.__mapInited = true;
            TravelMap.init({
                onEdit: function (id) {
                    const trip = Storage.getById(id);
                    if (trip && typeof window.__openModal === 'function') {
                        window.__openModal(trip);
                    }
                },
                onDelete: function (id) {
                    const trip = Storage.getById(id);
                    if (!trip) return;
                    if (confirm('Удалить поездку «' + trip.title + '»?')) {
                        Storage.remove(id);
                        if (typeof window.__renderAll === 'function') {
                            window.__renderAll();
                        }
                    }
                }
            });
        }

        if (typeof window.__appInit === 'function') {
            window.__appInit();
        } else {
            console.error('❌ app.js не загружен или не определил __appInit');
            return;
        }

        console.log('✅ Приложение готово к работе.');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initApp);
    } else {
        initApp();
    }
})();