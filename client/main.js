import "./styles.css";
import "./i18n/language.css";
import "./settings-menu.css";
import { settingsMenu, initializeSettingsMenu } from "./settings-menu.js";
import { t, text, attr, setText, initializeLanguage } from "./i18n/index.js";
import { initializeAudio, playBombExplosionSound, playDeathSound, playDrawSound, playLuaSoftSound, playMatchCountdown, playWinSound, setMenuMusicActive, setWalkingSoundActive, startBattleTheme, stopMatchAudio } from "./audio.js";
import { createInputController } from "./input.js";
import { reconcileLocalPlayer } from "./netcode.js";
import { renderGame, startMenuMascotAnimation, startResultCharacterAnimation, startVictoryAnimation } from "./render.js";
import { GAME_MODES, MOVE_SPEED, PLAYER_COLORS } from "../shared/constants.js";

const root = document.querySelector("#app");
initializeAudio();
initializeLanguage();
initializeSettingsMenu();
const roomFromPath = () => location.pathname.match(/^\/r\/([A-Z2-9]{6})\/?$/i)?.[1]?.toUpperCase();
const escapeHtml = (value) => String(value ?? "").replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]);
const getName = () => localStorage.getItem("blast-name") || t("common.defaultName");

let socket;
let player = null;
let latestSnapshot = null;
let stopInput = null;
let errorShown = false;
let displaySnapshot = null;
let animationFrame = null;
let lastFrameAt = 0;
let lastHudSignature = "";
let stopVictoryLoop = null;
let resultTimers = [];
let stopMenuMascotLoop = null;
let introShown = false;
let roomTransitionStartedAt = 0;
let pendingLobby = null;
let lobbyRevealTimer = null;
let lobbyMounted = false;
let lastLobbyGameMode = null;
let matchIntroTimers = [];
let localInput = { dx: 0, dy: 0, drop: false, detonate: false, special: false };
let latestSnapshotReceivedAt = 0;
let estimatedRtt = 0;
let rttSamples = [];
let latencyTimer = null;

const MAX_PREDICTION_MS = 220;
const MATCH_TRANSITION_MS = 680;
const WIN_SOUND_MUSIC_CUE_MS = 4150;
const RESULT_BOARD_REVEAL_MS = 1250;
const DRAW_BOARD_REVEAL_MS = 2800;
const TROPHY_ANIMATION_DELAY_MS = 520;
const TROPHY_ANIMATION_DURATION_MS = WIN_SOUND_MUSIC_CUE_MS - RESULT_BOARD_REVEAL_MS - TROPHY_ANIMATION_DELAY_MS;
const ABILITY_META = {
  remote: ["R", "ability.remote"],
  glove: ["G", "ability.glove"],
  kick: ["K", "ability.kick"],
  bombPass: ["BP", "ability.bombPass"],
  blockPass: ["CP", "ability.blockPass"],
};

function formatMatchTime(milliseconds) {
  const totalSeconds = Math.max(0, Math.ceil((Number(milliseconds) || 0) / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  return `${minutes}:${String(totalSeconds % 60).padStart(2, "0")}`;
}

function stopVictory() {
  stopVictoryLoop?.();
  stopVictoryLoop = null;
  for (const timer of resultTimers) clearTimeout(timer);
  resultTimers = [];
}

function stopMenuMascot() {
  stopMenuMascotLoop?.();
  stopMenuMascotLoop = null;
}

function clearRoomTransition() {
  clearTimeout(lobbyRevealTimer);
  lobbyRevealTimer = null;
  roomTransitionStartedAt = 0;
  pendingLobby = null;
}

function stopMatchIntro() {
  for (const timer of matchIntroTimers) clearTimeout(timer);
  matchIntroTimers = [];
}

function copySnapshot(state) {
  return state ? {
    ...state,
    players: state.players.map((candidate) => ({
      ...candidate,
      moveTarget: candidate.moveTarget ? { ...candidate.moveTarget } : null,
    })),
  } : null;
}

function updateLocalDisplay(current, target, state, elapsed, predictionMs) {
  Object.assign(current, reconcileLocalPlayer(current, target, state, localInput, elapsed, predictionMs));
}

function startRenderLoop() {
  cancelAnimationFrame(animationFrame);
  lastFrameAt = performance.now();
  const frame = (now) => {
    const elapsed = Math.min(50, now - lastFrameAt);
    lastFrameAt = now;
    const canvas = root.querySelector("canvas");
    if (canvas && latestSnapshot) {
      if (!displaySnapshot) displaySnapshot = copySnapshot(latestSnapshot);
      const smoothing = 1 - Math.exp(-elapsed * 0.028);
      const snapshotAge = latestSnapshotReceivedAt ? now - latestSnapshotReceivedAt : 0;
      const predictionMs = Math.min(MAX_PREDICTION_MS, Math.max(0, snapshotAge) + estimatedRtt / 2);
      const displayById = new Map(displaySnapshot.players.map((candidate) => [candidate.id, candidate]));
      const players = latestSnapshot.players.map((target) => {
        const current = displayById.get(target.id) || { ...target };
        if (target.id === player?.playerId) {
          updateLocalDisplay(current, target, latestSnapshot, elapsed, predictionMs);
          const displayX = current.x;
          const displayY = current.y;
          const displayFacing = current.facing;
          const displayMoveTarget = current.moveTarget ? { ...current.moveTarget } : null;
          Object.assign(current, target, { x: displayX, y: displayY, facing: displayFacing, moveTarget: displayMoveTarget });
        } else {
          current.x += (target.x - current.x) * smoothing;
          current.y += (target.y - current.y) * smoothing;
          const displayX = current.x;
          const displayY = current.y;
          const displayFacing = current.facing;
          Object.assign(current, target, { x: displayX, y: displayY, facing: displayFacing });
        }
        return current;
      });
      displaySnapshot = { ...latestSnapshot, players };
      renderGame(canvas, displaySnapshot);
    }
    animationFrame = requestAnimationFrame(frame);
  };
  animationFrame = requestAnimationFrame(frame);
}

function stopRenderLoop() {
  cancelAnimationFrame(animationFrame);
  animationFrame = null;
  displaySnapshot = null;
}

function brand() {
  return `<a class="brand" href="/" ${attr("aria-label", "common.home")}><img src="/bomberlan-logo-transparent.png" alt="Bomberlan" /></a>`;
}

function renderLanding() {
  setMenuMusicActive(true);
  stopVictory();
  stopMenuMascot();
  clearRoomTransition();
  stopMatchIntro();
  const showIntro = !introShown;
  lastLobbyGameMode = null;
  introShown = true;
  player = null;
  root.innerHTML = `
    <main class="menu-home ${showIntro ? "has-intro" : ""}">
      ${showIntro ? `<div class="menu-intro" id="menu-intro"><div class="settings-corner">${settingsMenu()}</div><div class="intro-logo-wrap"><i aria-hidden="true"></i><img src="/bomberlan-logo-transparent.png" alt="Bomberlan" /></div><div class="intro-loader"><div class="intro-track"><i></i></div><span><b>${text("intro.preparing")}</b><em>${text("intro.loading")}</em></span></div><button class="intro-start" id="intro-start" type="button" disabled><span><small>${text("intro.ready")}</small>${text("intro.start")}</span><b aria-hidden="true">▶</b></button><section class="intro-story" aria-live="polite"><span class="intro-story-kicker">${text("intro.presents")}</span><h1>${text("intro.welcome")} <strong>BOMBERLAN</strong></h1><p>${text("intro.story")}</p><div class="intro-studio"><i aria-hidden="true">★</i><span>${text("intro.project")}<strong>${text("intro.team")}</strong></span><i aria-hidden="true">★</i></div></section></div>` : ""}
      <header class="menu-header">
        ${brand()}
        <div class="player-preferences"><label class="player-profile" for="player-name"><span class="profile-avatar">B</span><span class="profile-copy"><small>${text("menu.nameLabel")}</small><input form="create-form" id="player-name" maxlength="16" autocomplete="nickname" ${attr("placeholder", "menu.namePlaceholder")} value="${escapeHtml(getName())}" required /></span></label>${settingsMenu()}</div>
        <div class="status-pill"><i></i> ${text("menu.online")}</div>
      </header>
      <section class="menu-stage">
        <div class="menu-options">
          <div class="menu-kicker"><span>●</span> ${text("menu.welcome")}</div>
          <div class="battle-logo" role="img" ${attr("aria-label", "menu.battleLabel")}><span>${text("menu.enterBattle")}</span><strong>${text("menu.battle")}</strong><em>${text("menu.multiplayer")}</em></div>
          <form class="arcade-menu-form" id="create-form">
            <button class="arcade-action create-room-action" type="submit"><span><small>${text("menu.onlineMatch")}</small>${text("menu.create")}</span><b>▶</b></button>
            <div class="join-room-action">
              <label for="room-code">${text("menu.friend")}</label>
              <div class="menu-code-row"><input id="room-code" maxlength="6" ${attr("aria-label", "common.roomCode")} ${attr("placeholder", "common.roomCodeLabel")} pattern="[A-Za-z2-9]{6}" /><button type="button" id="join-button"><span>${text("menu.join")}</span><b>▶</b></button></div>
            </div>
            <p class="form-error menu-error" id="form-error" role="alert"></p>
          </form>
        </div>
        <div class="menu-hero-art" aria-hidden="true">
          <div class="arena-rank"><span>★</span><small>${text("menu.mode")}</small><b>${text("mode.classic")}</b></div>
          <div class="hero-burst"></div>
          <canvas id="menu-mascot-canvas" width="360" height="432" ${attr("aria-label", "menu.mascot")}></canvas>
          <div class="player-count"><b>4</b><span>${text("menu.players")}<br><small>${text("menu.humansBots")}</small></span></div>
        </div>
      </section>
      <div class="menu-footer"><span><b>WASD</b> ${text("menu.move")}</span><i></i><span><b>${text("controls.space")}</b> ${text("menu.bomb")}</span><i></i><span>${text("menu.lastAlive")} <b>${text("menu.wins")}</b></span></div>
    </main>`;

  stopMenuMascotLoop = startMenuMascotAnimation(root.querySelector("#menu-mascot-canvas"));
  if (showIntro) {
    const intro = root.querySelector("#menu-intro");
    const home = root.querySelector(".menu-home");
    const startButton = root.querySelector("#intro-start");
    const readyTimer = setTimeout(() => {
      intro?.classList.add("ready");
      if (startButton) {
        startButton.disabled = false;
        startButton.focus({ preventScroll: true });
      }
    }, 1320);

    startButton?.addEventListener("click", () => {
      clearTimeout(readyTimer);
      startButton.disabled = true;
      intro?.classList.add("starting");
      setTimeout(() => intro?.classList.add("story-mode"), 1400);
      setTimeout(() => playLuaSoftSound(), 11000);
      setTimeout(() => {
        home?.classList.add("intro-complete");
        intro?.classList.add("leaving");

      }, 16100);
      setTimeout(() => intro?.remove(), 16600);
    }, { once: true });
  }

  root.querySelector("#create-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const button = event.submitter;
    button.disabled = true;
    button.innerHTML = text("menu.preparing");
    const name = saveName();
    try {
      const response = await fetch("/api/rooms", { method: "POST" });
      if (!response.ok) throw new Error(t("error.create"));
      const data = await response.json();
      sessionStorage.setItem(`blast-host-${data.roomCode}`, data.hostToken);
      history.pushState({}, "", data.path);
      connectToRoom(data.roomCode, name, data.hostToken);
    } catch {
      root.querySelector("#form-error").innerHTML = text("error.retry");
      button.disabled = false;
      button.innerHTML = `<span><small>${text("menu.onlineMatch")}</small>${text("menu.create")}</span><b>▶</b>`;
    }
  });
  root.querySelector("#join-button").addEventListener("click", joinFromLanding);
  root.querySelector("#room-code").addEventListener("keydown", (event) => { if (event.key === "Enter") { event.preventDefault(); joinFromLanding(); } });
}

function saveName() {
  const name = (root.querySelector("#player-name")?.value || getName()).trim().slice(0, 16) || t("common.defaultName");
  localStorage.setItem("blast-name", name);
  return name;
}

function joinFromLanding() {
  const code = root.querySelector("#room-code").value.trim().toUpperCase();
  if (!/^[A-Z2-9]{6}$/.test(code)) { root.querySelector("#form-error").innerHTML = text("error.code"); return; }
  const name = saveName();
  history.pushState({}, "", `/r/${code}`);
  connectToRoom(code, name);
}

function renderDirectJoin(code) {
  setMenuMusicActive(true);
  root.innerHTML = `<main class="center-shell"><nav>${brand()}${settingsMenu()}</nav><form class="compact-card" id="direct-join"><div class="card-kicker">${text("common.room", { code })}</div><h2>${text("join.invited")}</h2><p>${text("join.description")}</p><label for="player-name">${text("join.name")}</label><input id="player-name" maxlength="16" autocomplete="nickname" value="${escapeHtml(getName())}" required /><button class="primary" type="submit">${text("join.enter")} <span>→</span></button><a href="/" class="text-link">${text("common.back")}</a></form></main>`;
  root.querySelector("#direct-join").addEventListener("submit", (event) => { event.preventDefault(); connectToRoom(code, saveName(), sessionStorage.getItem(`blast-host-${code}`)); });
}

function renderConnecting(code) {
  setMenuMusicActive(true);
  root.innerHTML = `<main class="room-transition"><div class="settings-corner">${settingsMenu()}</div><div class="transition-grid" aria-hidden="true"></div><div class="transition-radar" aria-hidden="true"><i></i><i></i><i></i></div><section class="transition-content" role="status"><span class="transition-kicker">${text("common.room", { code })}</span><div class="transition-logo"><i aria-hidden="true"></i><img src="/bomberlan-logo-transparent.png" alt="Bomberlan" /></div><div class="transition-copy"><b>${text("transition.opening")}</b><span>${text("transition.sync")}</span></div><div class="transition-track"><i></i></div></section><div class="transition-tip"><span>●</span> ${text("transition.explosion")}</div></main>`;
}

function renderLobbyReturnTransition(message) {
  stopVictory();
  stopMatchAudio();
  setMenuMusicActive(true);
  stopVictory();
  stopMatchIntro();
  stopInput?.();
  stopInput = null;
  stopRenderLoop();
  clearRoomTransition();
  lobbyMounted = false;
  roomTransitionStartedAt = performance.now();
  const roster = (latestSnapshot?.players || []).map((candidate) => `<span style="--return-color:${PLAYER_COLORS[candidate.slot]}"><img src="/player-avatar-${candidate.slot + 1}.png" alt="${escapeHtml(candidate.name)}" /></span>`).join("");
  root.innerHTML = `<main class="room-transition return-transition"><div class="settings-corner">${settingsMenu()}</div><div class="transition-grid" aria-hidden="true"></div><div class="transition-radar" aria-hidden="true"><i></i><i></i><i></i></div><section class="transition-content" role="status"><span class="transition-kicker">${text("transition.finished")}</span><div class="transition-logo"><i aria-hidden="true"></i><img src="/bomberlan-logo-transparent.png" alt="Bomberlan" /></div><div class="transition-copy"><b>${text("transition.returning")}</b><span>${text("transition.regroup")}</span></div><div class="return-roster">${roster}</div><div class="transition-track"><i style="animation-duration:${Math.max(800, Number(message?.transitionMs) || 1320) - 170}ms"></i></div></section><div class="transition-tip"><span>●</span> ${text("transition.rematch")}</div></main>`;
}

function connectToRoom(code, name, hostToken = null) {
  clearInterval(latencyTimer);
  latencyTimer = null;
  estimatedRtt = 0;
  rttSamples = [];
  clearRoomTransition();
  lobbyMounted = false;
  roomTransitionStartedAt = performance.now();
  renderConnecting(code);
  errorShown = false;
  const protocol = location.protocol === "https:" ? "wss:" : "ws:";
  socket = new WebSocket(`${protocol}//${location.host}/ws`);
  socket.addEventListener("open", () => socket.send(JSON.stringify({ type: "join", roomCode: code, name, hostToken })));
  socket.addEventListener("message", (event) => handleMessage(JSON.parse(event.data)));
  socket.addEventListener("close", () => {
    clearInterval(latencyTimer);
    latencyTimer = null;
    if (!errorShown && player) showToast("error.connection", true);
  });
}

function send(message) { if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message)); }

function startLatencyMonitoring() {
  clearInterval(latencyTimer);
  const ping = () => send({ type: "ping", clientTime: Date.now() });
  ping();
  latencyTimer = setInterval(ping, 2000);
}

function queueLobbyReveal(lobby) {
  if (!roomTransitionStartedAt) {
    renderLobby(lobby);
    return;
  }
  pendingLobby = lobby;
  if (lobbyRevealTimer) return;
  const remaining = Math.max(0, 1320 - (performance.now() - roomTransitionStartedAt));
  lobbyRevealTimer = setTimeout(() => {
    lobbyRevealTimer = null;
    roomTransitionStartedAt = 0;
    const nextLobby = pendingLobby;
    pendingLobby = null;
    if (nextLobby) renderLobby(nextLobby);
  }, remaining);
}

function transitionToMatch(start) {
  const lobbyShell = root.querySelector(".lobby-shell");
  if (!lobbyShell) {
    renderMatch(start);
    return;
  }
  stopMatchIntro();
  const transitionStartedAt = performance.now();
  lobbyShell.classList.add("match-starting");
  root.insertAdjacentHTML("beforeend", `<section class="match-loading-transition" role="status" aria-live="assertive"><div class="match-loading-grid" aria-hidden="true"></div><div class="match-loading-beam" aria-hidden="true"></div><div class="match-loading-content"><span>${text("transition.confirmed")}</span><img src="/bomberlan-logo-transparent.png" alt="Bomberlan" /><b>${text("transition.entering")}</b><div><i></i></div></div></section>`);
  matchIntroTimers.push(setTimeout(() => {
    const elapsed = performance.now() - transitionStartedAt;
    const networkTravel = estimatedRtt / 2;
    renderMatch({ ...start, countdownMs: Math.max(3200, (Number(start.countdownMs) || 4420) - elapsed - networkTravel) });
  }, MATCH_TRANSITION_MS));
}

function handleMessage(message) {
  if (message.type === "joined") { player = message; startLatencyMonitoring(); }
  else if (message.type === "pong") {
    const sample = Date.now() - Number(message.clientTime);
    if (Number.isFinite(sample) && sample >= 0 && sample < 5000) {
      rttSamples.push(sample);
      if (rttSamples.length > 12) rttSamples.shift();
      // The lowest recent RTT best represents transport latency; queueing spikes
      // should not push visual prediction farther ahead and cause later rollback.
      estimatedRtt = Math.min(...rttSamples);
    }
  }
  else if (message.type === "lobbyReturn") renderLobbyReturnTransition(message);
  else if (message.type === "lobby") queueLobbyReveal(message);
  else if (message.type === "matchStart") transitionToMatch(message);
  else if (message.type === "snapshot") {
    playSnapshotEffects(latestSnapshot, message);
    latestSnapshot = message;
    latestSnapshotReceivedAt = performance.now();
    updateHud(message);
  }
  else if (message.type === "matchEnd") renderResult(message.winnerSlot, message.standings || [], message.reason);
  else if (message.type === "host") player.isHost = message.hostId === player.playerId;
  else if (message.type === "error") renderError(message);
}

function playSnapshotEffects(previous, current) {
  if (!previous?.players || !current?.players) return;
  const currentBombIds = new Set((current.bombs || []).map((bomb) => bomb.id));
  if ((previous.bombs || []).some((bomb) => !currentBombIds.has(bomb.id))) playBombExplosionSound();
  if (previous.players.some((oldPlayer) => oldPlayer.alive && current.players.some((nextPlayer) => nextPlayer.id === oldPlayer.id && !nextPlayer.alive))) playDeathSound();
  const oldSelf = previous.players.find((candidate) => candidate.id === player?.playerId);
  const nextSelf = current.players.find((candidate) => candidate.id === player?.playerId);
  const moved = Boolean(oldSelf?.alive && nextSelf?.alive && (oldSelf.x !== nextSelf.x || oldSelf.y !== nextSelf.y));
  setWalkingSoundActive(moved);
}

function renderLobby(lobby) {
  setMenuMusicActive(true, lobby.gameMode);
  stopVictory();
  stopMenuMascot();
  stopInput?.();
  stopInput = null;
  stopRenderLoop();
  stopMatchIntro();
  const isHost = lobby.hostId === player.playerId;
  player.isHost = isHost;
  const ownSlot = lobby.slots.find((slot) => slot.id === player.playerId);
  const roomUrl = `${location.origin}/r/${player.roomCode}`;
  const onlineCount = lobby.slots.filter((slot) => slot.kind === "human").length;
  const firstLobbyRender = !lobbyMounted;
  const botDifficulty = ["easy", "normal", "hard"].includes(lobby.botDifficulty) ? lobby.botDifficulty : "normal";
  const difficultyOptions = [
    { value: "easy", label: text("difficulty.easy"), detail: text("difficulty.easyDetail"), icon: "Ⅰ" },
    { value: "normal", label: text("difficulty.normal"), detail: text("difficulty.normalDetail"), icon: "Ⅱ" },
    { value: "hard", label: text("difficulty.hard"), detail: text("difficulty.hardDetail"), icon: "Ⅲ" },
  ];
  const botDifficultyPanel = isHost && onlineCount === 1
    ? `<section class="bot-difficulty-panel"><header><span>${text("difficulty.solo")}</span><b>${text("difficulty.title")}</b></header><div class="bot-difficulty-options" role="group" ${attr("aria-label", "difficulty.choose")}>${difficultyOptions.map((option) => `<button type="button" class="${option.value === botDifficulty ? "active" : ""}" data-bot-difficulty="${option.value}" aria-pressed="${option.value === botDifficulty}"><i aria-hidden="true">${option.icon}</i><span>${option.label}<small>${option.detail}</small></span></button>`).join("")}</div><p>${text("difficulty.available")}</p></section>`
    : "";
  const gameMode = lobby.gameMode === GAME_MODES.SUPER ? GAME_MODES.SUPER : GAME_MODES.CLASSIC;
  const modeChanged = lobbyMounted && lastLobbyGameMode && lastLobbyGameMode !== gameMode;
  const switchDirection = modeChanged ? (gameMode === GAME_MODES.SUPER ? "switch-to-super" : "switch-to-classic") : "";
  lastLobbyGameMode = gameMode;
  const modePanel = `<section class="mode-panel"><header><span>${text("mode.rules")}</span><b>${text("mode.choose")}</b><small>${isHost ? text("mode.hostRules") : text("mode.guestRules")}</small></header><div class="mode-options" role="group" ${attr("aria-label", "mode.label")}><button type="button" data-game-mode="classic" class="mode-card classic ${gameMode === GAME_MODES.CLASSIC ? "active" : ""}" aria-pressed="${gameMode === GAME_MODES.CLASSIC}" ${isHost ? "" : "disabled"}><i class="mode-icon">B</i><span><strong>BOMBERLAN</strong><small>${text("mode.classicItems")}</small><em>${text("mode.classicDescription")}</em></span><b>${text("mode.classic")}</b></button><button type="button" data-game-mode="super" class="mode-card super ${gameMode === GAME_MODES.SUPER ? "active" : ""}" aria-pressed="${gameMode === GAME_MODES.SUPER}" ${isHost ? "" : "disabled"}><i class="mode-icon">S</i><span><strong>SUPER BOMBERLAN</strong><small>${text("mode.superItems")}</small><em>${text("mode.superDescription")}</em></span><b>SUPER</b></button></div></section>`;
  lobbyMounted = true;
  const squadPreview = lobby.slots.map((slot) => slot.kind === "empty"
    ? `<i class="squad-empty" aria-hidden="true">+</i>`
    : `<img src="/player-avatar-${slot.slot + 1}.png" alt="${escapeHtml(slot.name)}" />`).join("");
  root.innerHTML = `<main class="lobby-shell ${firstLobbyRender ? "lobby-entering" : ""} ${gameMode === GAME_MODES.SUPER ? "super-lobby" : ""} ${modeChanged ? `mode-switching ${switchDirection}` : ""}"><div class="lobby-backdrop" aria-hidden="true"><i></i><i></i><i></i></div><nav class="lobby-nav">${brand()}${settingsMenu()}<div class="room-chip"><i></i><span>${text("lobby.active")}</span><b>${escapeHtml(player.roomCode)}</b></div></nav><section class="lobby-heading"><div class="lobby-heading-copy"><div class="eyebrow"><span>●</span> ${text("lobby.waitingRoom")}</div><h2>${text("lobby.build")}<br><strong>${text("lobby.squad")}</strong></h2><p>${isHost ? text("lobby.hostDescription") : text("lobby.guestDescription")}</p></div><aside class="lobby-squad-card"><span>${text("lobby.currentTeam")}</span><b>${onlineCount}<small>/4</small></b><em>${text("lobby.onlinePlayers")}</em><div class="squad-preview">${squadPreview}</div></aside></section><section class="lobby-grid"><div class="players-panel"><div class="panel-title"><span><i></i> ${text("lobby.roster")}</span><b>${text("lobby.onlineCount", { count: onlineCount })}</b></div><div class="slot-list">${lobby.slots.map((slot) => slotMarkup(slot, lobby.hostId)).join("")}</div></div><aside class="invite-panel"><div class="invite-panel-heading"><div><span>${text("lobby.invite")}</span><b>${text("lobby.callTeam")}</b></div><i aria-hidden="true">✦</i></div><label>${text("lobby.link")}</label><div class="copy-row"><input readonly value="${escapeHtml(roomUrl)}" ${attr("aria-label", "lobby.roomLink")} /><button id="copy-link" ${attr("aria-label", "lobby.copyLabel")}>${text("lobby.copy")}</button></div><div class="room-pass" ${attr("aria-label", "common.roomCodeValue", { code: player.roomCode })}><div class="pass-pixels" aria-hidden="true"></div><span><small>${text("common.roomCodeLabel")}</small><strong>${escapeHtml(player.roomCode)}</strong><em>${text("lobby.characters")}</em></span></div><p>${text("lobby.linkHelp")}</p>${botDifficultyPanel}</aside></section><section class="lobby-actions"><div class="lobby-action-copy"><span>${text("lobby.status")}</span><b>${ownSlot?.ready ? text("lobby.youReady") : text("lobby.confirm")}</b></div><button class="ready-button ${ownSlot?.ready ? "active" : ""}" id="ready-button">${ownSlot?.ready ? text("lobby.ready") : text("lobby.imReady")}</button>${isHost ? `<button class="primary start-button" id="start-button"><span><small>${text("common.host")}</small>${text("lobby.start")}</span><b>▶</b></button>` : `<div class="host-wait"><i></i> ${text("common.waitHost")}</div>`}</section></main>`;
  root.querySelector(".lobby-grid")?.insertAdjacentHTML("beforebegin", modePanel);
  root.querySelector("#copy-link").addEventListener("click", async () => { await navigator.clipboard.writeText(roomUrl); root.querySelector("#copy-link").innerHTML = text("lobby.copied"); });
  root.querySelector("#ready-button").addEventListener("click", () => send({ type: "ready", ready: !ownSlot?.ready }));
  for (const button of root.querySelectorAll("[data-bot-difficulty]")) {
    button.addEventListener("click", () => send({ type: "botDifficulty", difficulty: button.dataset.botDifficulty }));
  }
  for (const button of root.querySelectorAll("[data-game-mode]")) {
    button.addEventListener("click", () => send({ type: "gameMode", mode: button.dataset.gameMode }));
  }
  root.querySelector("#start-button")?.addEventListener("click", (event) => {
    event.currentTarget.disabled = true;
    event.currentTarget.classList.add("starting");
    event.currentTarget.closest(".lobby-shell")?.classList.add("match-queued");
    event.currentTarget.querySelector("span").innerHTML = `<small>${text("common.preparing")}</small>${text("transition.opening")}`;
    send({ type: "start" });
  });
}

function slotMarkup(slot, hostId) {
  const color = PLAYER_COLORS[slot.slot];
  if (slot.kind === "empty") return `<div class="player-slot empty" style="--slot-color:${color}"><span class="slot-number">0${slot.slot + 1}</span><i aria-hidden="true">+</i><div><b>${text("slot.open")}</b><small>${text("slot.waiting")}</small></div><em>${text("slot.available")}</em></div>`;
  return `<div class="player-slot occupied" style="--slot-color:${color}"><span class="slot-number">0${slot.slot + 1}</span><img src="/player-avatar-${slot.slot + 1}.png" alt="" /><div><b>${escapeHtml(slot.name)} ${slot.id === hostId ? `<mark>${text("common.host")}</mark>` : ""}</b><small>${slot.kind === "bot" ? text("slot.bot") : text("slot.connected")}</small></div><span class="slot-trophies" ${attr("title", "common.trophyCount", { count: Number(slot.trophies) || 0 })}><img src="/trophy-pixel.png" alt="" /><b>${Number(slot.trophies) || 0}</b></span><em class="${slot.ready ? "is-ready" : ""}">${slot.ready ? text("slot.ready") : text("slot.notReady")}</em></div>`;
}

function renderMatch(start) {
  setMenuMusicActive(false);
  stopVictory();
  stopMenuMascot();
  stopMatchIntro();
  stopInput?.();
  stopInput = null;
  localInput = { dx: 0, dy: 0, drop: false, detonate: false, special: false };
  latestSnapshot = { ...start, bombs: start.bombs || [], blasts: start.blasts || [], powerups: start.powerups || [], fallingBlocks: start.fallingBlocks || [] };
  latestSnapshotReceivedAt = performance.now();
  displaySnapshot = copySnapshot(latestSnapshot);
  lastHudSignature = "";
  const countdownMs = Math.max(1200, Number(start.countdownMs) || 4420);
  const initialMatchTime = formatMatchTime(start.durationMs || 90_000);
  const roster = start.players.map((candidate) => `<span style="--intro-color:${PLAYER_COLORS[candidate.slot]}"><img src="/player-avatar-${candidate.slot + 1}.png" alt="${escapeHtml(candidate.name)}" /><b>P${candidate.slot + 1}</b></span>`).join("");
  root.innerHTML = `<main class="game-shell match-pending"><header class="game-header">${brand()}${settingsMenu()}<div class="match-label"><span>${text("common.room", { code: player.roomCode })}</span><b>${text("match.lastAlive")}</b></div><div class="match-timer" id="match-timer" role="timer" ${attr("aria-label", "match.timeLabel")}><small>${text("match.time")}</small><b>${initialMatchTime}</b></div></header><section class="game-layout"><div class="arena-wrap"><canvas width="520" height="440" ${attr("aria-label", "match.arena")}></canvas><div class="corner-mark top-left"></div><div class="corner-mark bottom-right"></div></div><aside class="match-sidebar"><div class="panel-title"><span>${text("match.survivors")}</span><b id="alive-count">${text("match.initialAlive")}</b></div><div id="hud-players"></div><div class="controls-card"><span>${text("controls.title")}</span><p><kbd>WASD</kbd> ${text("controls.or")} <kbd>↑↓←→</kbd> ${text("controls.move")}</p><p><kbd>${text("controls.space")}</kbd> ${text("controls.drop")}</p></div></aside></section><div class="touch-controls" ${attr("aria-label", "controls.touch")}><div class="dpad"><button data-action="up" ${attr("aria-label", "controls.up")}>↑</button><button data-action="left" ${attr("aria-label", "controls.left")}>←</button><button data-action="down" ${attr("aria-label", "controls.down")}>↓</button><button data-action="right" ${attr("aria-label", "controls.right")}>→</button></div><button class="bomb-button" data-action="drop" ${attr("aria-label", "controls.drop")}>${text("controls.bomb")}</button></div></main><section class="match-intro" id="match-intro" role="status" aria-live="assertive"><div class="settings-corner">${settingsMenu()}</div><div class="match-intro-grid" aria-hidden="true"></div><div class="match-intro-burst" aria-hidden="true"></div><div class="match-intro-content"><span class="match-intro-kicker">${text("common.room", { code: player.roomCode })}</span><div class="match-intro-logo"><i></i><img src="/bomberlan-logo-transparent.png" alt="Bomberlan" /></div><div class="countdown-stage"><span>${text("match.starts")}</span><b id="countdown-number">…</b><strong class="go-signal" aria-hidden="true">${text("match.go")}</strong><em id="countdown-label">${text("match.getReady")}</em></div><div class="match-intro-roster">${roster}</div></div></section>`;
  const isSuperMode = start.mode === GAME_MODES.SUPER;
  root.querySelector(".game-shell")?.classList.toggle("super-mode", isSuperMode);
  setText(root.querySelector(".match-label b"), isSuperMode ? "match.super" : "match.classic");
  setText(root.querySelector(".match-intro-kicker"), "match.intro", { code: player.roomCode, mode: isSuperMode ? "SUPER BOMBERLAN" : "BOMBERLAN" });
  if (isSuperMode) {
    root.querySelector(".controls-card")?.insertAdjacentHTML("beforeend", `<p><kbd>E</kbd> ${text("controls.detonate")}</p><p><kbd>Q</kbd> ${text("controls.throw")}</p>`);
    root.querySelector(".touch-controls")?.insertAdjacentHTML("beforeend", `<div class="power-buttons"><button data-action="detonate" ${attr("aria-label", "controls.remoteLabel")}>${text("controls.remote")}</button><button data-action="special" ${attr("aria-label", "controls.gloveLabel")}>${text("controls.glove")}</button></div>`);
  }
  renderGame(root.querySelector("canvas"), latestSnapshot);
  updateHud(latestSnapshot);
  startRenderLoop();
  const intro = root.querySelector("#match-intro");
  const number = root.querySelector("#countdown-number");
  const label = root.querySelector("#countdown-label");
  const setCountdown = (value) => {
    if (!number) return;
    number.classList.remove("count-pop");
    void number.offsetWidth;
    number.textContent = value;

    number.classList.add("count-pop");
  };
  playMatchCountdown();
  matchIntroTimers.push(
    setTimeout(() => setCountdown("3"), 200),
    setTimeout(() => setCountdown("2"), 1200),
    setTimeout(() => setCountdown("1"), 2200),
    setTimeout(() => {
      number.textContent = "";
      number.classList.remove("count-pop");
      setText(label, "match.blast");
      intro?.classList.add("launching");
    }, 3200),
    setTimeout(() => {
      root.querySelector(".game-shell")?.classList.replace("match-pending", "match-live");
      intro?.classList.add("leaving");
      startBattleTheme(start.mode);
      stopInput = createInputController(send, (input) => { localInput = input; });
    }, countdownMs),
    setTimeout(() => intro?.remove(), countdownMs + 900),
  );
}

function updateHud(state) {
  const timer = root.querySelector("#match-timer");
  if (timer) {
    const remainingMs = Number.isFinite(state.remainingMs) ? state.remainingMs : state.durationMs;
    const remainingSeconds = Math.max(0, Math.ceil((Number(remainingMs) || 0) / 1000));
    timer.querySelector("b").textContent = formatMatchTime(remainingMs);
    timer.classList.toggle("warning", remainingSeconds <= 30 && remainingSeconds > 10);
    timer.classList.toggle("critical", remainingSeconds <= 10);
    timer.classList.toggle("sudden", Boolean(state.suddenDeathActive));
  }
  const matchLabel = root.querySelector(".match-label b");
  if (matchLabel && state.suddenDeathActive) setText(matchLabel, "match.suddenDeath");
  const target = root.querySelector("#hud-players");
  if (!target || !state.players) return;
  const signature = state.players.map((candidate) => `${candidate.id}:${candidate.alive}:${candidate.kind}:${candidate.maxBombs}:${candidate.fireRange}:${candidate.moveSpeed}:${candidate.remote}:${candidate.glove}:${candidate.kick}:${candidate.bombPass}:${candidate.blockPass}:${candidate.protected}`).join("|");
  if (signature === lastHudSignature) return;
  lastHudSignature = signature;
  const alive = state.players.filter((candidate) => candidate.alive).length;
  setText(root.querySelector("#alive-count"), alive === 1 ? "match.aliveOne" : "match.aliveMany", { count: alive });
  target.innerHTML = state.players.map((candidate) => {
    const abilities = Object.entries(ABILITY_META).filter(([key]) => candidate[key]).map(([, [icon, label]]) => `<i ${attr("title", label)}>${icon}</i>`);
    if (candidate.fireRange >= 13) abilities.push(`<i class="full-fire" ${attr("title", "ability.fullFire")}>MAX</i>`);
    if (candidate.protected) abilities.push(`<i class="suit" ${attr("title", "ability.protected")}>S</i>`);
    return `<div class="hud-player ${candidate.alive ? "" : "dead"}"><img src="/player-avatar-${candidate.slot + 1}.png" alt="" /><span><b>${escapeHtml(candidate.name)}</b><small>${candidate.kind === "bot" ? text("hud.bot") : candidate.id === player.playerId ? text("hud.you") : text("hud.human")}</small><span class="hud-stats"><i ${attr("title", "hud.bombs")}>● ${candidate.maxBombs || 2}</i><i ${attr("title", "hud.fire")}>✦ ${candidate.fireRange || 2}</i><i ${attr("title", "hud.speed")}>» ${candidate.moveSpeed || MOVE_SPEED}</i></span><span class="hud-abilities">${abilities.join("")}</span></span><em>${candidate.alive ? text("hud.alive") : text("hud.out")}</em></div>`;
  }).join("");
}

function renderResult(winnerSlot, standings = [], reason = "elimination") {
  stopMatchAudio();
  setMenuMusicActive(false);
  stopMatchIntro();
  stopInput?.();
  stopInput = null;
  stopRenderLoop();
  stopVictory();

  const scoreById = new Map(standings.map((entry) => [entry.id, Number(entry.trophies) || 0]));
  const competitors = latestSnapshot?.players?.length ? latestSnapshot.players : standings;
  const ranking = competitors.map((candidate) => ({
    ...candidate,
    trophies: scoreById.get(candidate.id) || 0,
  })).sort((left, right) => {
    const leftWon = left.slot === winnerSlot;
    const rightWon = right.slot === winnerSlot;
    if (leftWon !== rightWon) return leftWon ? -1 : 1;
    return right.trophies - left.trophies || left.slot - right.slot;
  });
  const winner = ranking.find((candidate) => candidate.slot === winnerSlot);
  const headingKey = winner ? "result.first" : "result.draw";
  const subtitleKey = winner
    ? "result.winnerDescription"
    : reason === "timeout"
      ? "result.timeoutDescription"
      : "result.drawDescription";

  if (winner) {
    playWinSound();
    root.insertAdjacentHTML("beforeend", `<section class="winner-celebration" id="winner-celebration" role="status" aria-live="assertive"><div class="settings-corner">${settingsMenu()}</div><div class="winner-celebration-burst" aria-hidden="true"></div><span>${text("result.lastSurvivor")}</span><canvas width="112" height="96" ${attr("aria-label", "result.celebrating", { name: winner.name })}></canvas><h2>${escapeHtml(winner.name)}<b> ${text("result.won")}</b></h2><p>${text("result.championReady")}</p></section>`);
    stopVictoryLoop = startVictoryAnimation(root.querySelector("#winner-celebration canvas"), winner.slot);
  } else {
    playDrawSound();
    const drawPlayers = (reason === "timeout" ? ranking.filter((candidate) => candidate.alive) : ranking).slice(0, 4);
    const drawRoster = drawPlayers.map((candidate, index) => `<article style="--draw-color:${PLAYER_COLORS[candidate.slot]};--draw-delay:${index * .12}s"><i></i><img src="/player-avatar-${candidate.slot + 1}.png" alt="${escapeHtml(candidate.name)}" /><b>${escapeHtml(candidate.name)}</b></article>`).join("");
    const drawKicker = reason === "timeout" ? text("result.timeout") : text("result.doubleBlast");
    const drawClock = reason === "timeout" ? "00:00" : "K.O.";
    root.insertAdjacentHTML("beforeend", `<section class="draw-celebration" id="draw-celebration" role="status" aria-live="assertive"><div class="settings-corner">${settingsMenu()}</div><div class="draw-grid" aria-hidden="true"></div><div class="draw-divider" aria-hidden="true"></div><div class="draw-content"><span class="draw-kicker">${drawKicker}</span><div class="draw-clock"><small>${text("result.roundEnd")}</small><b>${drawClock}</b></div><div class="draw-contenders">${drawRoster}</div><h2><span>${text("result.drawFirst")}</span><b>${text("result.drawSecond")}</b></h2><p>${text("result.noTrophy")}</p></div></section>`);
  }

  const mountResultBoard = () => {
    const celebration = root.querySelector("#winner-celebration, #draw-celebration");
    celebration?.classList.add("leaving");
    stopVictoryLoop?.();
    stopVictoryLoop = null;
    resultTimers.push(setTimeout(() => celebration?.remove(), 480));

    const rankingMarkup = ranking.map((candidate, index) => {
      const isWinner = candidate.slot === winnerSlot;
      const isDraw = !winner;
      const mood = isWinner ? "winner" : "crying";
      const status = isWinner
        ? text("result.roundWinner")
        : isDraw
          ? reason === "timeout" && candidate.alive ? text("result.survivedDraw") : text("result.tied")
        : candidate.kind === "bot"
          ? text("result.botDefeated")
          : text("result.playerDefeated");
      const character = isDraw
        ? `<img class="battle-avatar draw-result-avatar" src="/player-avatar-${candidate.slot + 1}.png" alt="" />`
        : `<canvas class="battle-avatar result-character-canvas" width="112" height="96" data-result-slot="${candidate.slot}" data-result-mood="${mood}" role="img" ${attr("aria-label", isWinner ? "result.celebrating" : "result.crying", { name: candidate.name })}></canvas>`;
      return `<article class="battle-rank-row ${isWinner ? "champion" : isDraw ? "tied" : "crying"}" style="--rank-color:${PLAYER_COLORS[candidate.slot]};--rank-delay:${.24 + index * .12}s"><span class="battle-position">${isDraw ? "=" : text("result.position", { position: index + 1 })}</span><div class="battle-character">${character}${isWinner ? `<span class="trophy-flight" aria-hidden="true"><img src="/trophy-pixel.png" alt="" /></span>` : ""}</div><div class="battle-player-copy"><strong>${escapeHtml(candidate.name)}</strong><small>${status}</small></div><div class="battle-trophy-total"><img src="/trophy-pixel.png" alt="" /><span><b>${candidate.trophies}</b><small>${text("common.trophies")}</small></span></div></article>`;
    }).join("");

    root.insertAdjacentHTML("beforeend", `<section class="result-overlay battle-result-overlay"><div class="settings-corner">${settingsMenu()}</div><div class="result-pixel-rain" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div><div class="battle-result-board ${winner ? "has-champion" : "is-draw"}" style="--trophy-delay:${TROPHY_ANIMATION_DELAY_MS}ms;--trophy-duration:${TROPHY_ANIMATION_DURATION_MS}ms"><header class="battle-result-header"><span>${text("result.battleEnd")}</span><h2>${text(headingKey)}</h2><p>${text(subtitleKey, { name: winner?.name })}</p></header><div class="battle-ranking" ${attr("aria-label", "result.ranking")}>${rankingMarkup}</div><footer class="battle-result-actions">${player.isHost ? `<button class="result-rematch-button" id="rematch-button" type="button"><span><small>${text("result.sameTeam")}</small>${text("result.playAgain")}</span><b>↻</b></button>` : `<div class="host-wait"><i></i> ${text("result.waitHost")}</div>`}<button class="result-exit-button" id="exit-room-button" type="button"><span><small>${text("result.endSession")}</small>${text("result.exit")}</span><b>×</b></button></footer></div></section>`);

    const characterStops = [...root.querySelectorAll(".result-character-canvas")].map((canvas) =>
      startResultCharacterAnimation(canvas, Number(canvas.dataset.resultSlot), canvas.dataset.resultMood));
    stopVictoryLoop = () => {
      for (const stopCharacter of characterStops) stopCharacter();
    };

    root.querySelector("#rematch-button")?.addEventListener("click", (event) => {
      event.currentTarget.disabled = true;
      event.currentTarget.querySelector("span").innerHTML = `<small>${text("common.preparing")}</small>${text("result.returning")}`;
      stopVictory();
      stopMatchAudio();
      send({ type: "rematch" });
    });
    root.querySelector("#exit-room-button")?.addEventListener("click", () => {
      stopVictory();
      stopMatchAudio();
      errorShown = true;
      socket?.close();
      socket = null;
      history.pushState({}, "", "/");
      player = null;
      latestSnapshot = null;
      lobbyMounted = false;
      renderLanding();
    });
  };

  resultTimers.push(setTimeout(mountResultBoard, winner ? RESULT_BOARD_REVEAL_MS : DRAW_BOARD_REVEAL_MS));
}

function renderError(message) {
  const knownErrors = { ROOM_FULL: "error.fullTitle", ROOM_NOT_FOUND: "error.notFoundTitle", MATCH_IN_PROGRESS: "error.inProgressTitle" };
  const knownError = Object.hasOwn(knownErrors, message.code);
  const errorTitle = knownError ? knownErrors[message.code] : "error.genericTitle";
  const errorKey = knownError ? `error.${message.code}` : "error.unknown";
  setMenuMusicActive(true);
  stopVictory();
  stopMenuMascot();
  clearRoomTransition();
  stopMatchIntro();
  errorShown = true; socket?.close();
  root.innerHTML = `<main class="center-shell"><nav>${brand()}${settingsMenu()}</nav><section class="compact-card error-card"><div class="error-code">${escapeHtml(message.code)}</div><h2>${text(errorTitle)}</h2><p>${text(errorKey)}</p><button class="primary" id="new-room">${text("error.newRoom")} <span>→</span></button><a class="text-link" href="/">${text("common.back")}</a></section></main>`;
  root.querySelector("#new-room").addEventListener("click", () => { history.pushState({}, "", "/"); renderLanding(); });
}

function showToast(key, danger = false) { document.body.insertAdjacentHTML("beforeend", `<div class="toast ${danger ? "danger" : ""}" role="status">${text(key)}</div>`); }

window.addEventListener("popstate", () => { socket?.close(); const code = roomFromPath(); code ? renderDirectJoin(code) : renderLanding(); });
const initialRoom = roomFromPath();
if (initialRoom) renderDirectJoin(initialRoom); else renderLanding();
