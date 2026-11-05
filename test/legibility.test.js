import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const styles = await readFile(new URL("../client/styles.css", import.meta.url), "utf8");

test("ST-03 defines a documented minimum scale for readable UI text", () => {
  assert.match(styles, /--font-readable-min:\s*12px/);
  assert.match(styles, /--font-readable-meta:\s*11px/);
  assert.match(styles, /--text-muted-readable:\s*#[0-9a-f]{6}/i);
});

test("critical menu, lobby, transition and HUD copy use the readable scale", () => {
  const requiredSelectors = [
    ".intro-skip",
    ".arcade-action small",
    ".transition-kicker",
    ".transition-tip",
    ".lobby-player-name > span",
    ".mode-card small",
    ".player-slot small",
    ".ready-button",
    ".hud-player small",
    ".controls-card p",
    ".battle-result-header p",
  ];

  for (const selector of requiredSelectors) {
    assert.ok(styles.includes(selector), `missing legibility coverage for ${selector}`);
  }
});

test("keyboard focus remains visible against the pixel-art interface", () => {
  assert.match(
    styles,
    /:where\(button, input, summary, a\):focus-visible\s*\{[^}]*outline:\s*3px solid var\(--lime\)/s,
  );
});
