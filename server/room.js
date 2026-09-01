import { randomBytes } from "node:crypto";
import { decideBotInput } from "../shared/bots.js";
import { GAME_MODES, ROOM_CAPACITY, TICK_RATE } from "../shared/constants.js";
import { createMatch, createSuddenDeathOrder, dropDeathBlock, snapshot, step } from "../shared/sim.js";

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const MATCH_COUNTDOWN_MS = 4420;
export const MATCH_DURATION_MS = 90_000;
export const SUPER_MATCH_DURATION_MS = 180_000;
export const SUDDEN_DEATH_REMAINING_MS = 45_000;
export const DEATH_BLOCK_INTERVAL_MS = 500;
const BOT_DIFFICULTIES = new Set(["easy", "normal", "hard"]);
const BOT_PROFILES = {
  easy: { minDelay: 240, maxDelay: 390, urgentDelay: 55 },
  normal: { minDelay: 90, maxDelay: 180, urgentDelay: 1000 / TICK_RATE },
  hard: { minDelay: 45, maxDelay: 85, urgentDelay: 1000 / TICK_RATE },
};

export function makeCode() {
  const bytes = randomBytes(6);
  return [...bytes].map((byte) => CODE_ALPHABET[byte % CODE_ALPHABET.length]).join("");
}

const send = (socket, message) => {
  if (socket?.readyState === 1) socket.send(JSON.stringify(message));
};

export class Room {
  constructor(code, hostToken) {
    this.code = code;
    this.hostToken = hostToken;
    this.hostId = null;
    this.phase = "lobby";
    this.slots = Array.from({ length: ROOM_CAPACITY }, (_, slot) => ({ slot, kind: "empty" }));
    this.inputs = {};
    this.botPlans = {};
    this.state = null;
    this.startsAt = 0;
    this.endsAt = 0;
    this.endAnnounced = false;
    this.endReason = null;
    this.trophies = new Map();
    this.botDifficulty = "normal";
    this.gameMode = GAME_MODES.CLASSIC;
    this.suddenDeathQueue = [];
    this.nextDeathBlockAt = 0;
    this.emptySince = null;
  }

  humanCount() {
    return this.slots.filter((slot) => slot.kind === "human" && slot.socket?.readyState === 1).length;
  }

  addHuman(socket, { name, hostToken }) {
    if (this.phase !== "lobby") return { error: { code: "MATCH_IN_PROGRESS", message: "Esta partida já começou." } };
    const open = this.slots.find((slot) => slot.kind === "empty");
    if (!open) return { error: { code: "ROOM_FULL", message: "Esta sala está cheia. Crie outra sala e convide sua equipe." } };

    const id = randomBytes(8).toString("hex");
    const cleanName = String(name || "Jogador").trim().slice(0, 16) || "Jogador";
    Object.assign(open, { id, name: cleanName, kind: "human", ready: false, socket });
    if (!this.hostId || hostToken === this.hostToken) this.hostId = id;
    this.emptySince = null;
    this.inputs[id] = { dx: 0, dy: 0, drop: false, detonate: false, special: false };
    this.trophies.set(id, 0);
    send(socket, { type: "joined", playerId: id, slot: open.slot, roomCode: this.code, isHost: id === this.hostId });
    this.broadcastLobby();
    return { id };
  }

  broadcast(message) {
    for (const slot of this.slots) if (slot.kind === "human") send(slot.socket, message);
  }

  lobbyPayload() {
    return {
      type: "lobby",
      hostId: this.hostId,
      botDifficulty: this.botDifficulty,
      gameMode: this.gameMode,
      slots: this.slots.map(({ slot, id, name, ready, kind }) => ({ slot, id, name, ready: Boolean(ready), kind, trophies: this.trophies.get(id) || 0 })),
    };
  }

  standingsPayload() {
    return this.slots
      .filter((slot) => slot.kind !== "empty")
      .map(({ slot, id, name, kind }) => ({ slot, id, name, kind, trophies: this.trophies.get(id) || 0 }));
  }

  broadcastLobby() {
    this.broadcast(this.lobbyPayload());
  }

  setReady(playerId, ready) {
    const slot = this.slots.find((candidate) => candidate.id === playerId && candidate.kind === "human");
    if (!slot) return;
    slot.ready = Boolean(ready);
    this.broadcastLobby();
  }

  setBotDifficulty(playerId, difficulty) {
    if (playerId !== this.hostId || this.phase !== "lobby" || this.humanCount() !== 1) return;
    if (!BOT_DIFFICULTIES.has(difficulty)) return;
    this.botDifficulty = difficulty;
    this.broadcastLobby();
  }

  setGameMode(playerId, mode) {
    if (playerId !== this.hostId || this.phase !== "lobby") return;
    if (!Object.values(GAME_MODES).includes(mode)) return;
    this.gameMode = mode;
    this.broadcastLobby();
  }

  updateInput(playerId, input) {
    if (!this.inputs[playerId]) return;
    this.inputs[playerId] = {
      dx: [-1, 0, 1].includes(input.dx) ? input.dx : 0,
      dy: [-1, 0, 1].includes(input.dy) ? input.dy : 0,
      drop: Boolean(input.drop),
      detonate: Boolean(input.detonate),
      special: Boolean(input.special),
    };
  }

  start(playerId) {
    if (playerId !== this.hostId || this.phase !== "lobby") return;
    for (const slot of this.slots) {
      if (slot.kind === "empty") Object.assign(slot, { id: `bot-${this.code}-${slot.slot}`, name: `BOT ${slot.slot + 1}`, kind: "bot", ready: true });
      if (!this.trophies.has(slot.id)) this.trophies.set(slot.id, 0);
    }
    const seed = randomBytes(4).readUInt32LE(0);
    this.state = createMatch(seed, this.slots.map(({ id, slot, name, kind }) => ({ id, slot, name, kind })), { mode: this.gameMode });
    this.inputs = Object.fromEntries(this.slots.map(({ id }) => [id, { dx: 0, dy: 0, drop: false, detonate: false, special: false }]));
    this.botPlans = {};
    this.phase = "playing";
    this.startsAt = Date.now() + MATCH_COUNTDOWN_MS;
    const durationMs = this.gameMode === GAME_MODES.SUPER ? SUPER_MATCH_DURATION_MS : MATCH_DURATION_MS;
    this.endsAt = this.startsAt + durationMs;
    this.suddenDeathQueue = this.gameMode === GAME_MODES.SUPER ? createSuddenDeathOrder(this.state.grid) : [];
    this.nextDeathBlockAt = this.gameMode === GAME_MODES.SUPER ? this.endsAt - SUDDEN_DEATH_REMAINING_MS : 0;
    this.endAnnounced = false;
    this.endReason = null;

    this.broadcast({ type: "matchStart", seed, ...snapshot(this.state), countdownMs: MATCH_COUNTDOWN_MS, durationMs, mode: this.gameMode });
  }

  rematch(playerId) {
    if (playerId !== this.hostId || this.phase !== "ended") return;
    for (let slotIndex = 0; slotIndex < this.slots.length; slotIndex += 1) {
      const slot = this.slots[slotIndex];
      if (slot.kind === "bot" && !slot.socket) {
        this.slots[slotIndex] = { slot: slotIndex, kind: "empty" };
      }
    }
    this.phase = "lobby";
    this.startsAt = 0;
    this.endsAt = 0;
    this.endReason = null;
    this.suddenDeathQueue = [];
    this.nextDeathBlockAt = 0;
    this.broadcast({ type: "lobbyReturn", transitionMs: 1320 });
    this.broadcastLobby();
  }

  tick(now = Date.now()) {
    if (this.phase !== "playing" || !this.state) return;
    if (this.startsAt && now < this.startsAt) return;
    this.startsAt = 0;
    const alivePlayers = this.state.players.filter((player) => player.alive).length;
    const timeoutReached = this.endsAt > 0 && now >= this.endsAt && alivePlayers >= 2;

    if (timeoutReached) {
      this.state.status = "ended";
      this.state.winnerSlot = null;
      this.endReason = "timeout";
    } else {
      if (this.gameMode === GAME_MODES.SUPER && now >= this.nextDeathBlockAt && this.suddenDeathQueue.length) {
        let scheduledThisTick = 0;
        while (now >= this.nextDeathBlockAt && this.suddenDeathQueue.length && scheduledThisTick < 4) {
          const tile = this.suddenDeathQueue.shift();
          dropDeathBlock(this.state, tile.x, tile.y);
          this.nextDeathBlockAt += DEATH_BLOCK_INTERVAL_MS;
          scheduledThisTick += 1;
        }
      }
      const reservedBotDestinations = new Set();
      for (const slot of this.slots) {
        if (slot.kind !== "bot") continue;
        const currentPlan = this.botPlans[slot.id];
        const botPlayer = this.state.players.find((player) => player.id === slot.id);
        const reachedTileCenter = !botPlayer?.moveTarget;
        if (!currentPlan || (reachedTileCenter && now >= currentPlan.nextAt)) {
          const decision = decideBotInput(this.state, slot.id, reservedBotDestinations);
          const profile = BOT_PROFILES[this.botDifficulty] || BOT_PROFILES.normal;
          const canDrop = this.botDifficulty !== "easy" || (this.state.tick + slot.slot) % 3 === 0;
          this.inputs[slot.id] = decision.input.drop && !canDrop ? { ...decision.input, drop: false } : decision.input;
          const delay = decision.urgent ? profile.urgentDelay : profile.minDelay + Math.random() * (profile.maxDelay - profile.minDelay);
          this.botPlans[slot.id] = { path: decision.path, nextAt: now + delay };
        }
        const nextTile = this.botPlans[slot.id]?.path?.[0];
        if (nextTile) reservedBotDestinations.add(`${nextTile.x},${nextTile.y}`);
      }

      step(this.state, this.inputs);
      if (this.state.status === "ended") this.endReason = "elimination";
    }

    const remainingMs = Math.max(0, this.endsAt - now);
    this.broadcast({ type: "snapshot", ...snapshot(this.state), remainingMs });
    if (this.state.status === "ended" && !this.endAnnounced) {
      this.phase = "ended";
      this.endAnnounced = true;
      const winner = this.state.players.find((player) => player.slot === this.state.winnerSlot);
      if (winner) this.trophies.set(winner.id, (this.trophies.get(winner.id) || 0) + 1);
      this.broadcast({ type: "matchEnd", winnerSlot: this.state.winnerSlot, reason: this.endReason, standings: this.standingsPayload() });
    }
  }

  disconnect(playerId) {
    const slot = this.slots.find((candidate) => candidate.id === playerId);
    if (!slot) return;
    if (this.phase === "playing" || this.phase === "ended") {
      slot.kind = "bot";
      slot.socket = undefined;
      const player = this.state?.players.find((candidate) => candidate.id === playerId);
      if (player) player.kind = "bot";
      this.botPlans[playerId] = { path: [], nextAt: 0 };
    } else {
      const slotNumber = slot.slot;
      this.slots[slotNumber] = { slot: slotNumber, kind: "empty" };
      delete this.inputs[playerId];
    }

    if (this.hostId === playerId) {
      this.hostId = this.slots.find((candidate) => candidate.kind === "human" && candidate.socket?.readyState === 1)?.id || null;
      this.broadcast({ type: "host", hostId: this.hostId });
    }
    if (this.phase === "lobby") this.broadcastLobby();
    if (this.humanCount() === 0) this.emptySince = Date.now();
  }
}

export function startRoomLoop(rooms) {
  const timer = setInterval(() => {
    const now = Date.now();
    for (const [code, room] of rooms) {
      room.tick(now);
      if (room.emptySince && now - room.emptySince >= 60_000) rooms.delete(code);
    }
  }, 1000 / TICK_RATE);
  timer.unref();
  return timer;
}
