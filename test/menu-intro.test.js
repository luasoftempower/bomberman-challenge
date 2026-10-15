import test from "node:test";
import assert from "node:assert/strict";
import {
  INTRO_SEEN_STORAGE_KEY,
  hasSeenMenuIntro,
  initializeMenuIntro,
  markMenuIntroSeen,
  menuIntro,
} from "../client/components/menu-intro.js";
import { settingsMenu } from "../client/settings-menu.js";

function memoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    values,
  };
}

test("intro markup keeps the skip action available from the first frame", () => {
  const markup = menuIntro();
  assert.match(markup, /id="intro-skip"/);
  assert.match(markup, /data-i18n="intro\.skip"/);
  assert.match(markup, /data-i18n-aria-label="intro\.skipLabel"/);
});

test("seen preference is persisted and storage failures remain non-blocking", () => {
  const storage = memoryStorage();
  assert.equal(hasSeenMenuIntro(storage), false);
  assert.equal(markMenuIntroSeen(storage), true);
  assert.equal(storage.values.get(INTRO_SEEN_STORAGE_KEY), "1");
  assert.equal(hasSeenMenuIntro(storage), true);

  const blocked = {
    getItem() { throw new Error("blocked"); },
    setItem() { throw new Error("blocked"); },
  };
  assert.equal(hasSeenMenuIntro(blocked), false);
  assert.equal(markMenuIntroSeen(blocked), false);
});

test("skip removes the intro immediately, reveals the menu and remembers the choice", () => {
  const storage = memoryStorage();
  const listeners = {};
  const introClasses = new Set();
  const homeClasses = new Set();
  let removed = false;
  let focused = false;

  const intro = {
    classList: { add: (name) => introClasses.add(name) },
    remove: () => { removed = true; },
  };
  const home = { classList: { add: (name) => homeClasses.add(name) } };
  const start = {
    disabled: true,
    addEventListener: (type, listener) => { listeners[`start:${type}`] = listener; },
  };
  const skip = {
    addEventListener: (type, listener) => { listeners[`skip:${type}`] = listener; },
  };
  const primary = { focus: () => { focused = true; } };
  const root = {
    querySelector(selector) {
      return {
        "#menu-intro": intro,
        ".menu-home": home,
        "#intro-start": start,
        "#intro-skip": skip,
        ".create-room-action": primary,
      }[selector] ?? null;
    },
  };

  initializeMenuIntro(root, () => assert.fail("skip must cancel the scheduled audio"), { storage });
  listeners["skip:click"]();

  assert.equal(removed, true);
  assert.equal(homeClasses.has("intro-complete"), true);
  assert.equal(introClasses.has("leaving"), false);
  assert.equal(focused, true);
  assert.equal(hasSeenMenuIntro(storage), true);
});

test("replay control is only included when a screen opts into it", () => {
  assert.doesNotMatch(settingsMenu(), /data-replay-intro/);
  assert.match(settingsMenu({ showReplayIntro: true }), /data-replay-intro/);
});
