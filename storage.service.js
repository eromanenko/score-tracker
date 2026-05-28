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

// LocalStorage Helper
export function getValue(name) {
    let value = localStorage.getItem(name);
    try {
        return JSON.parse(value);
    } catch(error) {
        return value;
    }
}

export function saveValue(name, value) {
    localStorage.setItem(name, JSON.stringify(value));
}

// Games Config Loading
export async function loadGames() {
    try {
        const response = await fetch('./assets/games.json');
        const data = await response.json();
        
        const localVersion = getValue('games_version');
        if (localVersion !== data.version) {
            console.log(`Games updated to version ${data.version}`);
            saveValue('games_version', data.version);
        }
        
        return data.games;
    } catch (err) {
        console.error("Failed to load games index", err);
        return [];
    }
}

// ZIP Bundle Loader
export async function loadGameBundle(game) {
    let arrayBuffer = await getDbValue(`bundle_${game.id}`);
    
    if (!arrayBuffer) {
        try {
            const response = await fetch(game.bundleUrl);
            arrayBuffer = await response.arrayBuffer();
            await saveDbValue(`bundle_${game.id}`, arrayBuffer);
        } catch (e) {
            console.error("Failed to fetch game bundle", e);
            return null;
        }
    }

    try {
        const zip = await JSZip.loadAsync(arrayBuffer);
        const configStr = await zip.file("config.json").async("string");
        const config = JSON.parse(configStr);

        // Process images if any
        if (config.categories) {
            for (let cat of config.categories) {
                if (cat.iconFile) {
                    const file = zip.file(cat.iconFile);
                    if (file) {
                        const blob = await file.async("blob");
                        // Create ephemeral blob URL
                        cat.iconBlobUrl = URL.createObjectURL(blob);
                    }
                }
            }
        }
        return config;
    } catch (e) {
        console.error("Failed to parse game bundle", e);
        return null;
    }
}

// Player Names Typeahead
export function getSavedPlayerNames() {
    return getValue('saved_player_names') || [];
}

export function savePlayerName(name) {
    let names = getSavedPlayerNames();
    if (!names.includes(name)) {
        names.push(name);
        saveValue('saved_player_names', names);
    }
}

// Settings
export function getFilterMode() {
    return getValue('games_filter_mode') || 'all'; // 'all' or 'selected'
}

export function setFilterMode(mode) {
    saveValue('games_filter_mode', mode);
}

export function getDisabledGames() {
    return getValue('disabled_games') || [];
}

export function toggleGameDisabled(gameId) {
    let disabled = getDisabledGames();
    if (disabled.includes(gameId)) {
        disabled = disabled.filter(id => id !== gameId);
    } else {
        disabled.push(gameId);
    }
    saveValue('disabled_games', disabled);
}
