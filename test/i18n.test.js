import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dictionaries, setLanguage, getLanguage, t, text, attr, STORAGE_KEY } from "../client/i18n/index.js";

test("PT and EN cover the same messages and interpolation parameters", () => {
  assert.deepEqual(Object.keys(dictionaries.pt).sort(), Object.keys(dictionaries.en).sort());
  for (const key of Object.keys(dictionaries.pt)) {
    assert.ok(dictionaries.pt[key].trim(), key);
    assert.ok(dictionaries.en[key].trim(), key);
    const params = (message) => [...message.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();
    assert.deepEqual(params(dictionaries.pt[key]), params(dictionaries.en[key]), key);
  }
});

test("all translation keys referenced by the main screens exist", async () => {
  const source = await readFile(new URL("../client/main.js", import.meta.url), "utf8");
  const namespaces = [...new Set(Object.keys(dictionaries.pt).map((key) => key.split(".")[0]))];
  const pattern = new RegExp(`"((?:${namespaces.join("|")})\\.[\\w]+)"`, "g");
  for (const [, key] of source.matchAll(pattern)) assert.ok(Object.hasOwn(dictionaries.pt, key), key);
});

test("changing language translates sentences but preserves player names and room codes", () => {
  const name = "Jogador VIVO {count}";
  setLanguage("pt");
  assert.equal(t("common.room", { code: "ABC234" }), "SALA ABC234");
  setLanguage("en");
  assert.equal(t("menu.create"), "CREATE A ROOM");
  assert.equal(t("common.room", { code: "ABC234" }), "ROOM ABC234");
  assert.equal(t("result.winnerDescription", { name }), `${name} dominated the arena and won another trophy.`);
  setLanguage("pt");
  assert.equal(t("menu.create"), "CRIAR UMA SALA");
});

test("translated HTML and accessibility attributes escape dynamic content", () => {
  const name = '<img src=x onerror="alert(1)"> & \'player\'';
  const markup = text("result.winnerDescription", { name });
  const label = attr("aria-label", "result.celebrating", { name });
  assert.ok(!markup.includes("<img"));
  assert.ok(!label.includes('"alert(1)"'));
  assert.ok(markup.includes("&lt;img"));
  assert.ok(label.includes("&quot;"));
});

test("language preference is restored by a fresh module and invalid preferences use PT", async () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  const saved = new Map();
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: {
    getItem: (key) => saved.get(key) ?? null,
    setItem: (key, value) => saved.set(key, value),
  } });
  try {
    setLanguage("en");
    assert.equal(saved.get(STORAGE_KEY), "en");
    const restored = await import("../client/i18n/index.js?restored");
    assert.equal(restored.getLanguage(), "en");
    saved.set(STORAGE_KEY, "fr");
    const invalid = await import("../client/i18n/index.js?invalid");
    assert.equal(invalid.getLanguage(), "pt");
    saved.set(STORAGE_KEY, "__proto__");
    const inherited = await import("../client/i18n/index.js?inherited");
    assert.equal(inherited.getLanguage(), "pt");
  } finally {
    if (previous) Object.defineProperty(globalThis, "localStorage", previous);
    else delete globalThis.localStorage;
    setLanguage("pt");
  }
});

test("blocked localStorage does not prevent switching language", async () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  Object.defineProperty(globalThis, "localStorage", { configurable: true, get() { throw new Error("Blocked"); } });
  try {
    const isolated = await import("../client/i18n/index.js?blocked");
    assert.equal(isolated.getLanguage(), "pt");
    assert.equal(isolated.setLanguage("en"), true);
    assert.equal(isolated.t("menu.create"), "CREATE A ROOM");
  } finally {
    if (previous) Object.defineProperty(globalThis, "localStorage", previous);
    else delete globalThis.localStorage;
  }
});

test("unsupported languages are rejected without changing the current choice", () => {
  setLanguage("en");
  assert.equal(setLanguage("fr"), false);
  assert.equal(setLanguage("__proto__"), false);
  assert.equal(getLanguage(), "en");
  setLanguage("pt");
});
