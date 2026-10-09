// Модуль работы с LocalStorage
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
        const trips = getAll().filter(t => t.id !== id);
        saveAll(trips);
    }

    function getById(id) {
        return getAll().find(t => t.id === id) || null;
    }

    return { getAll, saveAll, add, update, remove, getById };
})();