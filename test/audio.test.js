import test from "node:test";
import assert from "node:assert/strict";
import {
  AUDIO_MUTED_STORAGE_KEY,
  isAudioMuted,
  setAudioMuted,
  subscribeAudioMuted,
} from "../client/audio-preference.js";

function memoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    values,
  };
}

test("audio preference persists and notifies every consumer", () => {
  const storage = memoryStorage();
  const states = [];
  const unsubscribe = subscribeAudioMuted((muted) => states.push(muted));

  setAudioMuted(true, { storage });
  assert.equal(isAudioMuted(), true);
  assert.equal(storage.values.get(AUDIO_MUTED_STORAGE_KEY), "1");
  assert.equal(states.at(-1), true);

  setAudioMuted(false, { storage });
  assert.equal(storage.values.get(AUDIO_MUTED_STORAGE_KEY), "0");
  assert.equal(states.at(-1), false);
  unsubscribe();
});

test("blocked storage does not prevent muting the current session", () => {
  const blocked = {
    getItem() { throw new Error("blocked"); },
    setItem() { throw new Error("blocked"); },
  };
  assert.equal(setAudioMuted(true, { storage: blocked }), true);
  assert.equal(isAudioMuted(), true);
  setAudioMuted(false, { storage: blocked });
});

test("all game audio channels follow the centralized mute state", async () => {
  const previousAudio = Object.getOwnPropertyDescriptor(globalThis, "Audio");
  const instances = [];
  class FakeAudio {
    constructor(source) {
      this.source = source;
      this.muted = false;
      this.paused = true;
      this.currentTime = 0;
      instances.push(this);
    }
    play() { this.paused = false; return Promise.resolve(); }
    pause() { this.paused = true; }
  }
  Object.defineProperty(globalThis, "Audio", { configurable: true, value: FakeAudio });

  try {
    setAudioMuted(true);
    await import("../client/audio.js?mute-test");
    assert.equal(instances.length, 13);
    assert.ok(instances.every((audio) => audio.muted));

    setAudioMuted(false);
    assert.ok(instances.every((audio) => !audio.muted));
  } finally {
    if (previousAudio) Object.defineProperty(globalThis, "Audio", previousAudio);
    else delete globalThis.Audio;
    setAudioMuted(false);
  }
});
