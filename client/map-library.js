import { validateCustomMap } from '../shared/maps.js';
const KEY = 'raivolt-custom-maps-v1';
export const MAX_SAVED_MAPS = 12;

export function loadMapLibrary(storage = globalThis.localStorage) {
  try {
    const values = JSON.parse(storage.getItem(KEY) || '[]');
    if (!Array.isArray(values)) return [];
    return values.slice(0, MAX_SAVED_MAPS).filter((entry) => typeof entry?.localId === 'string' && /^[\w-]{1,80}$/.test(entry.localId) && !validateCustomMap(entry).error);
  } catch { return []; }
}

export function saveMapLibrary(maps, storage = globalThis.localStorage) {
  if (maps.length > MAX_SAVED_MAPS) throw new Error('maps.limit');
  storage.setItem(KEY, JSON.stringify(maps));
}
