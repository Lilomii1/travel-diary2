// =========================================================
// storage.js — работа с localStorage
// =========================================================

const Storage = (() => {
    const KEY = 'travel_diary_trips';

    function allTrips() {
        try { return JSON.parse(localStorage.getItem(KEY)) || []; }
        catch { return []; }
    }

    function saveAll(trips) {
        try {
            localStorage.setItem(KEY, JSON.stringify(trips));
        } catch (e) {
            if (e.name === 'QuotaExceededError') {
                throw new StorageError('Хранилище заполнено. Удалите старые поездки.');
            }
            throw new StorageError('Ошибка сохранения: ' + e.message);
        }
    }

    function getAll() {
        const u = Auth.currentUser();
        if (!u) return [];
        return allTrips().filter(t => t.userId === u.id);
    }

    function add(trip) {
        const u = Auth.currentUser();
        if (!u) throw new AuthError('Вы не авторизованы');
        if (!trip.title || !trip.country) throw new ValidationError('Заполните обязательные поля');

        const trips = allTrips();
        trip.id = Date.now().toString() + '_' + Math.random().toString(36).slice(2, 6);
        trip.userId = u.id;
        trip.createdAt = new Date().toISOString();
        trips.push(trip);
        saveAll(trips);
        return trip;
    }

    function update(id, updated) {
        const u = Auth.currentUser();
        if (!u) throw new AuthError('Не авторизован');
        const trips = allTrips();
        const i = trips.findIndex(t => t.id === id && t.userId === u.id);
        if (i === -1) throw new DataError('Поездка не найдена');
        trips[i] = { ...trips[i], ...updated, id, userId: u.id };
        saveAll(trips);
        return trips[i];
    }

    function remove(id) {
        const u = Auth.currentUser();
        if (!u) throw new AuthError('Не авторизован');
        saveAll(allTrips().filter(t => !(t.id === id && t.userId === u.id)));
    }

    function getById(id) {
        return getAll().find(t => t.id === id) || null;
    }

    function replaceMine(newTrips) {
        const u = Auth.currentUser();
        if (!u) throw new AuthError('Не авторизован');
        const others = allTrips().filter(t => t.userId !== u.id);
        const mine = newTrips.map(t => ({ ...t, userId: u.id }));
        saveAll(others.concat(mine));
    }

    return { getAll, add, update, remove, getById, replaceMine };
})();