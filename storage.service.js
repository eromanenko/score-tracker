import { openDB } from 'https://cdn.jsdelivr.net/npm/idb@7/+esm';

const dbPromise = openDB('score-tracker-db', 1, {
    upgrade(db) {
            if (!db.objectStoreNames.contains('store')) {
            db.createObjectStore('store');
        }
    }
});

// IndexedDB
export async function getDbValue(name) {
    const db = await dbPromise;
    return db.get('store', name);
}

export async function saveDbValue(name, value) {
    const db = await dbPromise;
    return db.put('store', value, name);
}

// LocalStorage
export function getValue(name) {
    let value = localStorage.getItem(name);
    try {
        return JSON.parse(value);
    } catch(error) {
        return value;
    }
};

export function saveValue(name, value) {
    localStorage.setItem(name, JSON.stringify(value));
}

