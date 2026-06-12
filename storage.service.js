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
            console.log(`Games updated to version ${data.version}. Clearing cache...`);
            const db = await dbPromise;
            // Only clear system games cache, not custom games!
            const keys = await db.getAllKeys('store');
            for (let key of keys) {
                const customGames = getCustomGames();
                const isCustom = customGames.some(cg => `bundle_${cg.id}` === key);
                if (!isCustom) {
                    await db.delete('store', key);
                }
            }
            saveValue('games_version', data.version);
        }
        
        window.dispatchEvent(new CustomEvent('version-loaded', { detail: data.version }));
        
        return data.games.concat(getCustomGames());
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
        let config = { categories: [] };
        
        const configFile = zip.file("config.json");
        if (configFile) {
            const configStr = await configFile.async("string");
            config = JSON.parse(configStr);
        } else if (game.scoringType === 'category') {
            const iconFiles = [];
            zip.forEach((relativePath, zipEntry) => {
                if (!zipEntry.dir && /\.(png|jpg|jpeg|svg|webp|gif)$/i.test(relativePath)) {
                    // Only process files in the root folder (no slashes in path)
                    if (!relativePath.includes('/')) {
                        iconFiles.push(relativePath);
                    }
                }
            });
            
            iconFiles.sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
            
            config.categories = iconFiles.map((iconFile, index) => ({
                id: `cat_${index}`,
                nameEN: "",
                iconFile: iconFile
            }));
        }

        // Helper to load image to blob
        const loadBlobUrl = async (fileName) => {
            const file = zip.file(fileName);
            if (!file) return null;
            const uint8 = await file.async("uint8array");
            let mimeType = "image/png";
            const lowerName = fileName.toLowerCase();
            if (lowerName.endsWith(".svg")) mimeType = "image/svg+xml";
            else if (lowerName.endsWith(".jpg") || lowerName.endsWith(".jpeg")) mimeType = "image/jpeg";
            else if (lowerName.endsWith(".webp")) mimeType = "image/webp";
            else if (lowerName.endsWith(".gif")) mimeType = "image/gif";
            const blob = new Blob([uint8], { type: mimeType });
            return URL.createObjectURL(blob);
        };

        if (config.headerIconFile) {
            config.headerIconBlobUrl = await loadBlobUrl(config.headerIconFile);
        }
        if (config.totalIconFile) {
            config.totalIconBlobUrl = await loadBlobUrl(config.totalIconFile);
        }

        // Process images if any
        if (config.categories) {
            for (let cat of config.categories) {
                if (cat.iconFile) {
                    cat.iconBlobUrl = await loadBlobUrl(cat.iconFile);
                }
            }
        }

        if (config.trackerImages && Array.isArray(config.trackerImages)) {
            config.trackerImageBlobUrls = [];
            for (let imgFile of config.trackerImages) {
                const blobUrl = await loadBlobUrl(imgFile);
                if (blobUrl) config.trackerImageBlobUrls.push(blobUrl);
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

// Custom Games
export function getCustomGames() {
    return getValue('custom_games') || [];
}

export async function saveCustomGame(gameMeta, bundleArrayBuffer) {
    let customGames = getCustomGames();
    gameMeta.isCustom = true;
    const existingIndex = customGames.findIndex(g => g.id === gameMeta.id);
    if (existingIndex >= 0) {
        customGames[existingIndex] = gameMeta;
    } else {
        customGames.push(gameMeta);
    }
    saveValue('custom_games', customGames);
    await saveDbValue(`bundle_${gameMeta.id}`, bundleArrayBuffer);
}

export async function deleteCustomGame(gameId) {
    let customGames = getCustomGames();
    customGames = customGames.filter(g => g.id !== gameId);
    saveValue('custom_games', customGames);
    const db = await dbPromise;
    await db.delete('store', `bundle_${gameId}`);
}

export function savePlayerName(name) {
    let names = getSavedPlayerNames();
    if (!names.includes(name)) {
        names.push(name);
        saveValue('saved_player_names', names);
    }
}

// Settings
export function getTheme() {
    const stored = getValue('theme');
    if (stored) return stored;
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
    }
    return 'light';
}

export function setTheme(theme) {
    saveValue('theme', theme);
}

export function getFilterMode() {
    return getValue('games_filter_mode') || 'selected'; // 'all' or 'selected'
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
