import test from "node:test";
import assert from "node:assert/strict";
import { createLatestSnapshotBuffer } from "../client/snapshot-buffer.js";

function scheduler() {
  let nextToken = 0;
  const callbacks = new Map();
  return {
    schedule(callback) {
      const token = ++nextToken;
      callbacks.set(token, callback);
      return token;
    },
    cancel(token) { callbacks.delete(token); },
    run() {
      const pending = [...callbacks.values()];
      callbacks.clear();
      for (const callback of pending) callback();
    },
    get size() { return callbacks.size; },
  };
}

test("a Render-like snapshot burst delivers only its newest state", () => {
  const frames = scheduler();
  const delivered = [];
  const buffer = createLatestSnapshotBuffer(
    (snapshot) => delivered.push(snapshot.tick),
    { schedule: frames.schedule, cancel: frames.cancel },
  );

  buffer.push({ tick: 10 });
  buffer.push({ tick: 11 });
  buffer.push({ tick: 12 });
  assert.equal(frames.size, 1);
  assert.deepEqual(delivered, []);

  frames.run();
  assert.deepEqual(delivered, [12]);
});

test("a reliable event can flush the latest snapshot first", () => {
  const frames = scheduler();
  const delivered = [];
  const buffer = createLatestSnapshotBuffer(
    (snapshot) => delivered.push(snapshot.tick),
    { schedule: frames.schedule, cancel: frames.cancel },
  );

  buffer.push({ tick: 20 });
  buffer.push({ tick: 21 });
  assert.equal(buffer.flush(), true);
  assert.deepEqual(delivered, [21]);
  assert.equal(frames.size, 0);
  assert.equal(buffer.flush(), false);
});

test("clearing a connection discards its queued snapshot", () => {
  const frames = scheduler();
  const delivered = [];
  const buffer = createLatestSnapshotBuffer(
    (snapshot) => delivered.push(snapshot.tick),
    { schedule: frames.schedule, cancel: frames.cancel },
  );

  buffer.push({ tick: 30 });
  buffer.clear();
  frames.run();
  assert.deepEqual(delivered, []);
});
