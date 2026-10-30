export const AUDIO_MUTED_STORAGE_KEY = "raivolt-audio-muted";

const listeners = new Set();
let storageSyncInitialized = false;

function defaultStorage() {
  try {
    return globalThis.localStorage;
  } catch {
    return null;
  }
}

function readMuted(storage = defaultStorage()) {
  try {
    return storage?.getItem(AUDIO_MUTED_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

let muted = readMuted();

export const isAudioMuted = () => muted;

export function subscribeAudioMuted(listener, { emitCurrent = true } = {}) {
  listeners.add(listener);
  if (emitCurrent) listener(muted);
  return () => listeners.delete(listener);
}

export function setAudioMuted(nextMuted, { persist = true, storage = defaultStorage() } = {}) {
  const next = Boolean(nextMuted);
  const changed = next !== muted;
  muted = next;

  if (persist) {
    try {
      storage?.setItem(AUDIO_MUTED_STORAGE_KEY, muted ? "1" : "0");
    } catch {
      // O estado da sessão continua funcionando quando o armazenamento é bloqueado.
    }
  }

  if (changed) {
    for (const listener of listeners) listener(muted);
  }

  return muted;
}

export const toggleAudioMuted = () => setAudioMuted(!muted);

export function initializeAudioPreferenceSync(windowTarget = globalThis.window) {
  if (storageSyncInitialized || !windowTarget?.addEventListener) return;
  storageSyncInitialized = true;
  windowTarget.addEventListener("storage", (event) => {
    if (event.key !== AUDIO_MUTED_STORAGE_KEY) return;
    setAudioMuted(event.newValue === "1", { persist: false });
  });
}
