import test from "node:test";
import assert from "node:assert/strict";
import { dangerDeadlines, decideBotInput, hasEscapeRoute } from "../shared/bots.js";
import { BOARD_HEIGHT, BOARD_WIDTH, CRATE, EMPTY, GAME_MODES, MAX_FIRE_RANGE, MOVE_SPEED, SPEED_UP_AMOUNT, TILE_SIZE, WALL } from "../shared/constants.js";
import { createGrid, createMatch, dropDeathBlock, forceDetonate, indexOf, snapshot, step } from "../shared/sim.js";

function openGrid() {
  const grid = Array(BOARD_WIDTH * BOARD_HEIGHT).fill(EMPTY);
  for (let y = 0; y < BOARD_HEIGHT; y += 1) {
    for (let x = 0; x < BOARD_WIDTH; x += 1) {
      if (x === 0 || y === 0 || x === BOARD_WIDTH - 1 || y === BOARD_HEIGHT - 1) grid[indexOf(x, y)] = WALL;
    }
  }
  return grid;
}

function baseState() {
  const state = createMatch(123, [
    { id: "p1", slot: 0, name: "One", kind: "human" },
    { id: "p2", slot: 1, name: "Two", kind: "human" },
  ]);
  state.grid = openGrid().join("");
  state.bombs = [];
  state.blasts = [];
  return state;
}

function bomb(id, x, y, range = 2) {
  return { id, x, y, ownerId: "p1", range, fuse: 2.2, passThroughIds: [] };
}

test("a blast stops at and destroys exactly the first destructible block", () => {
  const state = baseState();
  const grid = state.grid.split("");
  grid[indexOf(3, 3)] = CRATE;
  grid[indexOf(4, 3)] = CRATE;
  state.grid = grid.join("");
  state.bombs = [bomb(1, 2, 3)];

  forceDetonate(state, [1]);

  assert.equal(state.grid[indexOf(3, 3)], EMPTY);
  assert.equal(state.grid[indexOf(4, 3)], CRATE);
  assert(state.blasts.some((blast) => blast.x === 3 && blast.y === 3));
  assert(!state.blasts.some((blast) => blast.x === 4 && blast.y === 3));
});

test("a blast crosses empty tiles only up to its range", () => {
  const state = baseState();
  state.bombs = [bomb(1, 5, 5, 2)];
  forceDetonate(state, [1]);
  assert(state.blasts.some((blast) => blast.x === 7 && blast.y === 5));
  assert(!state.blasts.some((blast) => blast.x === 8 && blast.y === 5));
});

test("a bomb caught in a blast detonates on the same tick", () => {
  const state = baseState();
  state.bombs = [bomb(1, 3, 5, 2), bomb(2, 5, 5, 2)];
  forceDetonate(state, [1]);
  assert.equal(state.bombs.length, 0);
  assert(state.blasts.some((blast) => blast.x === 7 && blast.y === 5));
});

test("a player walks off their bomb but cannot walk back onto it", () => {
  const state = baseState();
  const player = state.players[0];
  player.x = 3.5 * TILE_SIZE;
  player.y = 3.5 * TILE_SIZE;
  step(state, { p1: { dx: 0, dy: 0, drop: true } });
  assert.equal(state.bombs.length, 1);
  let movementTicks = 0;
  do {
    step(state, { p1: { dx: 1, dy: 0, drop: false } });
    movementTicks += 1;
    assert(movementTicks < 100, "player should reach the adjacent tile");
  } while (player.moveTarget);
  const escapedX = player.x;
  assert.equal(state.bombs[0].passThroughIds.includes("p1"), false);
  for (let count = 0; count < 5; count += 1) step(state, { p1: { dx: -1, dy: 0, drop: false } });
  assert.equal(player.x, escapedX);
});

test("movement is locked to one tile at a time with no diagonals", () => {
  const state = baseState();
  const player = state.players[0];
  player.x = 3.5 * TILE_SIZE;
  player.y = 3.5 * TILE_SIZE;

  step(state, { p1: { dx: 1, dy: 1, drop: false } });
  assert(player.x > 3.5 * TILE_SIZE);
  assert.equal(player.y, 3.5 * TILE_SIZE);
  assert.equal(player.moveTarget.tileX, 4);
  assert.equal(player.moveTarget.tileY, 3);

  for (let count = 0; count < 10; count += 1) step(state, { p1: { dx: -1, dy: 0, drop: false } });
  assert.equal(player.moveTarget.tileX, 4);
  for (let count = 0; count < 10; count += 1) step(state, { p1: { dx: 0, dy: 0, drop: false } });
  assert.equal(player.y, 3.5 * TILE_SIZE);
  assert.equal(player.x, 4.5 * TILE_SIZE);
  assert.equal((player.x - TILE_SIZE / 2) % TILE_SIZE, 0);
});

test("a quick turn press is buffered until the player reaches the next tile", () => {
  const state = baseState();
  const player = state.players[0];
  player.x = 3.5 * TILE_SIZE;
  player.y = 3.5 * TILE_SIZE;

  step(state, { p1: { dx: 1, dy: 0 } });
  for (let count = 0; count < 5; count += 1) step(state, { p1: { dx: 1, dy: 0 } });
  step(state, { p1: { dx: 1, dy: 0, intent: { dx: 0, dy: 1 } } });
  while (player.moveTarget?.tileX === 4) step(state, { p1: { dx: 1, dy: 0 } });

  step(state, { p1: { dx: 1, dy: 0 } });
  assert.equal(player.moveTarget?.tileX, 4);
  assert.equal(player.moveTarget?.tileY, 4);
});

test("snapshots expose the accepted movement target for local prediction", () => {
  const state = baseState();
  const player = state.players[0];
  player.x = 3.5 * TILE_SIZE;
  player.y = 3.5 * TILE_SIZE;
  step(state, { p1: { dx: 1, dy: 0, drop: false } });
  const playerSnapshot = snapshot(state).players.find((candidate) => candidate.id === "p1");
  assert.equal(playerSnapshot.moveTarget.tileX, 4);
  assert.equal(playerSnapshot.moveTarget.tileY, 3);
  assert.equal("dropLatch" in playerSnapshot, false);
});

test("players cannot reserve the same destination when leaving an overlapped tile", () => {
  const state = baseState();
  for (const player of state.players) {
    player.kind = "bot";
    player.x = 5.5 * TILE_SIZE;
    player.y = 5.5 * TILE_SIZE;
    player.moveTarget = null;
  }

  step(state, {
    p1: { dx: 1, dy: 0, drop: false },
    p2: { dx: 1, dy: 0, drop: false },
  });

  assert(state.players[0].moveTarget, "first bot should leave the shared tile");
  assert.equal(state.players[1].moveTarget, null, "second bot should wait instead of stacking on the destination");
  assert.notEqual(state.players[0].x, state.players[1].x, "the bots should immediately begin separating");
});

test("overlapped bots choose different reserved routes", () => {
  const state = baseState();
  for (const player of state.players) {
    player.kind = "bot";
    player.x = 5.5 * TILE_SIZE;
    player.y = 5.5 * TILE_SIZE;
    player.moveTarget = null;
  }

  const first = decideBotInput(state, "p1");
  assert(first.path.length, "first bot should find a route");
  const firstDestination = `${first.path[0].x},${first.path[0].y}`;
  const second = decideBotInput(state, "p2", new Set([firstDestination]));
  assert(second.path.length, "second bot should find an alternative route");
  assert.notEqual(`${second.path[0].x},${second.path[0].y}`, firstDestination);
});

test("two players dying on the same tick is a draw", () => {
  const state = baseState();
  state.players[0].x = 3.5 * TILE_SIZE;
  state.players[0].y = 3.5 * TILE_SIZE;
  state.players[1].x = 4.5 * TILE_SIZE;
  state.players[1].y = 3.5 * TILE_SIZE;
  state.blasts = [{ x: 3, y: 3, ttl: 0.45 }, { x: 4, y: 3, ttl: 0.45 }];
  step(state, {});
  assert.equal(state.players.filter((player) => player.alive).length, 0);
  assert.equal(state.status, "ended");
  assert.equal(state.winnerSlot, null);
});

test("a bot in a dead-end refuses to place a suicidal bomb", () => {
  const state = baseState();
  const grid = Array(BOARD_WIDTH * BOARD_HEIGHT).fill(WALL);
  grid[indexOf(1, 1)] = EMPTY;
  grid[indexOf(2, 1)] = CRATE;
  state.grid = grid.join("");
  state.players[0].kind = "bot";
  state.players[0].x = 1.5 * TILE_SIZE;
  state.players[0].y = 1.5 * TILE_SIZE;
  state.players[1].x = 9.5 * TILE_SIZE;
  state.players[1].y = 9.5 * TILE_SIZE;
  assert.equal(hasEscapeRoute(state, state.players[0]), false);
  assert.equal(decideBotInput(state, "p1").input.drop, false);
});

test("a bot only attacks when it has an escape route and survives its bomb", () => {
  const state = baseState();
  const grid = openGrid();
  grid[indexOf(4, 3)] = CRATE;
  state.grid = grid.join("");
  state.players[0].kind = "bot";
  state.players[0].x = 3.5 * TILE_SIZE;
  state.players[0].y = 3.5 * TILE_SIZE;
  state.players[1].x = 9.5 * TILE_SIZE;
  state.players[1].y = 9.5 * TILE_SIZE;

  const attack = decideBotInput(state, "p1");
  assert.equal(attack.input.drop, true);
  assert.equal(attack.urgent, true);
  assert(attack.path.length >= 2);

  const startX = state.players[0].x;
  const startY = state.players[0].y;
  for (let count = 0; count < 110 && state.status === "playing"; count += 1) {
    const decision = decideBotInput(state, "p1");
    step(state, { p1: decision.input });
    if (count === 8) assert(state.players[0].x !== startX || state.players[0].y !== startY, "bot should leave the bomb tile immediately");
  }
  assert.equal(state.players[0].alive, true);
});

test("a bot leaves the corner, reaches a safe attack tile, and places a bomb", () => {
  const state = baseState();
  const grid = Array(BOARD_WIDTH * BOARD_HEIGHT).fill(WALL);
  grid[indexOf(1, 1)] = EMPTY;
  grid[indexOf(2, 1)] = EMPTY;
  grid[indexOf(1, 2)] = EMPTY;
  grid[indexOf(3, 1)] = CRATE;
  grid[indexOf(1, 3)] = CRATE;
  state.grid = grid.join("");
  state.players[0].kind = "bot";
  state.players[0].x = 1.5 * TILE_SIZE;
  state.players[0].y = 1.5 * TILE_SIZE;
  state.players[1].x = 9.5 * TILE_SIZE;
  state.players[1].y = 9.5 * TILE_SIZE;

  let placedBomb = false;
  for (let count = 0; count < 180 && state.status === "playing"; count += 1) {
    const decision = decideBotInput(state, "p1");
    step(state, { p1: decision.input });
    if (state.bombs.some((candidate) => candidate.ownerId === "p1")) placedBomb = true;
  }

  assert.equal(placedBomb, true);
  assert.equal(state.players[0].alive, true);
});

test("four bots navigate the arena and actively use bombs", () => {
  const slots = Array.from({ length: 4 }, (_, slot) => ({ id: `bot-${slot}`, slot, name: `Bot ${slot + 1}`, kind: "bot" }));
  const state = createMatch(94821, slots);
  const inputs = Object.fromEntries(slots.map(({ id }) => [id, { dx: 0, dy: 0, drop: false }]));
  const visited = Object.fromEntries(slots.map(({ id }) => [id, new Set()]));

  for (let count = 0; count < 800 && state.status === "playing"; count += 1) {
    for (const player of state.players) {
      if (!player.alive) continue;
      visited[player.id].add(`${Math.floor(player.x / TILE_SIZE)},${Math.floor(player.y / TILE_SIZE)}`);
      if (!player.moveTarget) inputs[player.id] = decideBotInput(state, player.id).input;
    }
    step(state, inputs);
  }

  assert(state.nextBombId > 5, "bots should place several bombs during a match");
  assert(state.players.some((player) => visited[player.id].size >= 3), "bots should explore more than two tiles");
});

test("bots predict an early chain reaction across multiple bombs", () => {
  const state = baseState();
  state.bombs = [
    { ...bomb(1, 3, 5), fuse: 0.2 },
    { ...bomb(2, 5, 5), fuse: 2.0, ownerId: "p2" },
  ];
  const deadlines = dangerDeadlines(state);
  assert.equal(deadlines.get("5,5"), 0.2);
  assert.equal(deadlines.get("7,5"), 0.2);
});

test("a bot never places a second bomb while its first is active", () => {
  const state = baseState();
  const grid = openGrid();
  grid[indexOf(4, 3)] = CRATE;
  state.grid = grid.join("");
  state.players[0].kind = "bot";
  state.players[0].x = 3.5 * TILE_SIZE;
  state.players[0].y = 3.5 * TILE_SIZE;
  state.bombs = [{ ...bomb(1, 8, 7), ownerId: "p1" }];
  assert.equal(decideBotInput(state, "p1").input.drop, false);
});

test("crate placement and density vary between matches", () => {
  const grids = [11, 22, 33, 44, 55].map(createGrid);
  const layouts = new Set(grids);
  const crateCounts = new Set(grids.map((grid) => [...grid].filter((tile) => tile === CRATE).length));
  assert.equal(layouts.size, grids.length);
  assert(crateCounts.size > 1);
});

test("a lone bot clears random arenas without killing itself", () => {
  for (const seed of [12031, 58742, 90117]) {
    const state = createMatch(seed, [
      { id: "bot", slot: 0, name: "Bot", kind: "bot" },
      { id: "dummy", slot: 1, name: "Dummy", kind: "human" },
    ]);
    state.players[1].x = -100;
    state.players[1].y = -100;
    let input = { dx: 0, dy: 0, drop: false };
    let placedBomb = false;

    for (let count = 0; count < 600 && state.status === "playing"; count += 1) {
      const bot = state.players[0];
      if (!bot.moveTarget) input = decideBotInput(state, "bot").input;
      step(state, { bot: input });
      if (state.bombs.some((bomb) => bomb.ownerId === "bot")) placedBomb = true;
    }

    assert.equal(placedBomb, true, `bot should use bombs on seed ${seed}`);
    assert.equal(state.players[0].alive, true, `bot should survive its own bombs on seed ${seed}`);
  }
});

test("only Super Bomberlan reveals powerups from destroyed crates", () => {
  for (const mode of [GAME_MODES.CLASSIC, GAME_MODES.SUPER]) {
    const state = baseState();
    state.mode = mode;
    state.random = () => 0;
    const grid = state.grid.split("");
    grid[indexOf(3, 3)] = CRATE;
    state.grid = grid.join("");
    state.bombs = [bomb(1, 2, 3)];
    forceDetonate(state, [1]);
    assert.equal(state.powerups.length, mode === GAME_MODES.SUPER ? 1 : 0);
  }
});

test("the ten Super Bomberlan powerups apply their stats and abilities", () => {
  const state = baseState();
  state.mode = GAME_MODES.SUPER;
  const player = state.players[0];
  const x = Math.floor(player.x / TILE_SIZE);
  const y = Math.floor(player.y / TILE_SIZE);
  const types = ["fire", "bomb", "speed", "remote", "glove", "kick", "bombPass", "blockPass", "suit", "fullFire"];
  state.powerups = types.map((type, index) => ({ id: index + 1, type, x, y }));

  step(state, {});

  assert.equal(player.fireRange, MAX_FIRE_RANGE);
  assert.equal(player.maxBombs, 3);
  assert.equal(player.moveSpeed, MOVE_SPEED + SPEED_UP_AMOUNT);
  assert.equal(player.remote && player.glove && player.kick && player.bombPass && player.blockPass, true);
  assert.equal(snapshot(state).players[0].protected, true);
  assert.equal(state.powerups.length, 0);
});

test("remote control bombs wait and detonate on command", () => {
  const state = baseState();
  const player = state.players[0];
  player.remote = true;
  player.x = 3.5 * TILE_SIZE;
  player.y = 3.5 * TILE_SIZE;
  step(state, { p1: { drop: true } });
  const remoteBomb = state.bombs[0];
  for (let tick = 0; tick < 100; tick += 1) step(state, {});
  assert(state.bombs.some((candidate) => candidate.id === remoteBomb.id));
  step(state, { p1: { detonate: true } });
  assert.equal(state.bombs.some((candidate) => candidate.id === remoteBomb.id), false);
});

test("the glove throws an adjacent bomb over obstacles", () => {
  const state = baseState();
  const player = state.players[0];
  player.glove = true;
  player.facing = "right";
  player.x = 3.5 * TILE_SIZE;
  player.y = 3.5 * TILE_SIZE;
  const grid = state.grid.split("");
  grid[indexOf(5, 3)] = WALL;
  state.grid = grid.join("");
  state.bombs = [bomb(1, 4, 3)];

  step(state, { p1: { special: true } });

  assert.equal(state.bombs[0].x, 7);
  assert.equal(state.bombs[0].y, 3);
  assert(state.bombs[0].airborneTtl > 0);
});

test("kick slides bombs while bomb pass and block pass open their tiles", () => {
  const kicked = baseState();
  const kicker = kicked.players[0];
  kicker.kick = true;
  kicker.x = 3.5 * TILE_SIZE;
  kicker.y = 3.5 * TILE_SIZE;
  kicked.bombs = [bomb(1, 4, 3)];
  step(kicked, { p1: { dx: 1 } });
  assert.equal(kicked.bombs[0].x, 5);
  assert.equal(kicker.moveTarget.tileX, 4);

  const pass = baseState();
  const passer = pass.players[0];
  passer.bombPass = true;
  passer.blockPass = true;
  passer.x = 3.5 * TILE_SIZE;
  passer.y = 3.5 * TILE_SIZE;
  pass.bombs = [bomb(1, 4, 3)];
  const grid = pass.grid.split("");
  grid[indexOf(3, 4)] = CRATE;
  pass.grid = grid.join("");
  step(pass, { p1: { dx: 1 } });
  assert.equal(passer.moveTarget.tileX, 4);
  passer.moveTarget = null;
  passer.x = 3.5 * TILE_SIZE;
  passer.y = 3.5 * TILE_SIZE;
  step(pass, { p1: { dy: 1 } });
  assert.equal(passer.moveTarget.tileY, 4);
});

test("the protection suit blocks blasts and falling death blocks crush the arena", () => {
  const protectedState = baseState();
  const protectedPlayer = protectedState.players[0];
  protectedPlayer.x = 3.5 * TILE_SIZE;
  protectedPlayer.y = 3.5 * TILE_SIZE;
  protectedPlayer.invincibleUntilTick = 100;
  protectedState.blasts = [{ x: 3, y: 3, ttl: 1 }];
  step(protectedState, {});
  assert.equal(protectedPlayer.alive, true);

  const deathState = baseState();
  const crushed = deathState.players[0];
  crushed.x = 3.5 * TILE_SIZE;
  crushed.y = 3.5 * TILE_SIZE;
  assert.equal(dropDeathBlock(deathState, 3, 3), true);
  for (let tick = 0; tick < 30 && deathState.status === "playing"; tick += 1) step(deathState, {});
  assert.equal(deathState.grid[indexOf(3, 3)], WALL);
  assert.equal(crushed.alive, false);
});
