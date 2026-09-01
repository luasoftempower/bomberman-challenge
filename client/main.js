import "./styles.css";
<<<<<<< HEAD
import { initializeAudio, playBombExplosionSound, playDeathSound, playLuaSoftSound, playMatchCountdown, playWinSound, setMenuMusicActive, setWalkingSoundActive, startBattleTheme, stopMatchAudio } from "./audio.js";
import { createInputController } from "./input.js";
import { renderGame, startMenuMascotAnimation, startResultCharacterAnimation, startVictoryAnimation } from "./render.js";
import { BOARD_WIDTH, EMPTY, MOVE_SPEED, PLAYER_COLORS, TILE_SIZE } from "../shared/constants.js";

const root = document.querySelector("#app");
initializeAudio();
=======
import { createInputController } from "./input.js";
import { renderGame, startMenuMascotAnimation, startVictoryAnimation } from "./render.js";
import { BOARD_WIDTH, EMPTY, MOVE_SPEED, PLAYER_COLORS, TILE_SIZE } from "../shared/constants.js";

const root = document.querySelector("#app");
>>>>>>> e1d4b9e6430ba42826193cf0423b78a20eded43a
const roomFromPath = () => location.pathname.match(/^\/r\/([A-Z2-9]{6})\/?$/i)?.[1]?.toUpperCase();
const escapeHtml = (value) => String(value ?? "").replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]);
const getName = () => localStorage.getItem("blast-name") || "Jogador";

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
<<<<<<< HEAD
let resultTimers = [];
=======
>>>>>>> e1d4b9e6430ba42826193cf0423b78a20eded43a
let stopMenuMascotLoop = null;
let introShown = false;
let roomTransitionStartedAt = 0;
let pendingLobby = null;
let lobbyRevealTimer = null;
let lobbyMounted = false;
let matchIntroTimers = [];
let localInput = { dx: 0, dy: 0, drop: false };

const LOCAL_PREDICTION_LEAD = 6;
<<<<<<< HEAD
const WIN_SOUND_MUSIC_CUE_MS = 4150;
const RESULT_BOARD_REVEAL_MS = 1250;
const TROPHY_ANIMATION_DELAY_MS = 520;
const TROPHY_ANIMATION_DURATION_MS = WIN_SOUND_MUSIC_CUE_MS - RESULT_BOARD_REVEAL_MS - TROPHY_ANIMATION_DELAY_MS;
=======
>>>>>>> e1d4b9e6430ba42826193cf0423b78a20eded43a

function stopVictory() {
  stopVictoryLoop?.();
  stopVictoryLoop = null;
<<<<<<< HEAD
  for (const timer of resultTimers) clearTimeout(timer);
  resultTimers = [];
=======
>>>>>>> e1d4b9e6430ba42826193cf0423b78a20eded43a
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
  return state ? { ...state, players: state.players.map((candidate) => ({ ...candidate })) } : null;
}

function cardinalInput(input) {
  if (input.dx) return { x: Math.sign(input.dx), y: 0 };
  if (input.dy) return { x: 0, y: Math.sign(input.dy) };
  return null;
}

function predictionTileBlocked(state, self, tileX, tileY) {
  if (state.grid?.[tileY * BOARD_WIDTH + tileX] !== EMPTY) return true;
  if (state.bombs?.some((bomb) => bomb.x === tileX && bomb.y === tileY)) return true;
  return state.players.some((candidate) => {
    if (!candidate.alive || candidate.id === self.id) return false;
    const occupiesTile = Math.floor(candidate.x / TILE_SIZE) === tileX && Math.floor(candidate.y / TILE_SIZE) === tileY;
    const reservesTile = candidate.moveTarget?.tileX === tileX && candidate.moveTarget?.tileY === tileY;
    return occupiesTile || reservesTile;
  });
}

function updateLocalDisplay(current, target, state, elapsed) {
  if (Math.abs(current.x - target.x) > TILE_SIZE || Math.abs(current.y - target.y) > TILE_SIZE) {
    current.x = target.x;
    current.y = target.y;
  }

  let direction = target.moveTarget
    ? { x: Math.sign(target.moveTarget.x - target.x), y: Math.sign(target.moveTarget.y - target.y) }
    : cardinalInput(localInput);
  let limitX = target.moveTarget?.x;
  let limitY = target.moveTarget?.y;

  if (direction && !target.moveTarget) {
    const currentTileX = Math.round(target.x / TILE_SIZE - 0.5);
    const currentTileY = Math.round(target.y / TILE_SIZE - 0.5);
    const tileX = currentTileX + direction.x;
    const tileY = currentTileY + direction.y;
    if (predictionTileBlocked(state, target, tileX, tileY)) direction = null;
    else {
      limitX = (tileX + 0.5) * TILE_SIZE;
      limitY = (tileY + 0.5) * TILE_SIZE;
    }
  }

  let goalX = target.x;
  let goalY = target.y;
  if (direction) {
    goalX += direction.x * LOCAL_PREDICTION_LEAD;
    goalY += direction.y * LOCAL_PREDICTION_LEAD;
    if (direction.x > 0) goalX = Math.min(goalX, limitX);
    if (direction.x < 0) goalX = Math.max(goalX, limitX);
    if (direction.y > 0) goalY = Math.min(goalY, limitY);
    if (direction.y < 0) goalY = Math.max(goalY, limitY);
  }

  const dx = goalX - current.x;
  const dy = goalY - current.y;
  const distance = Math.abs(dx) + Math.abs(dy);
  const speed = direction ? MOVE_SPEED * 1.6 : MOVE_SPEED * 3;
  const travel = Math.min(speed * elapsed / 1000, distance);
  if (dx) current.x += Math.sign(dx) * travel;
  else if (dy) current.y += Math.sign(dy) * travel;
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
      const displayById = new Map(displaySnapshot.players.map((candidate) => [candidate.id, candidate]));
      const players = latestSnapshot.players.map((target) => {
        const current = displayById.get(target.id) || { ...target };
        if (target.id === player?.playerId) updateLocalDisplay(current, target, latestSnapshot, elapsed);
        else {
          current.x += (target.x - current.x) * smoothing;
          current.y += (target.y - current.y) * smoothing;
        }
        Object.assign(current, { alive: target.alive, kind: target.kind, name: target.name, slot: target.slot, moveTarget: target.moveTarget });
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
  return `<a class="brand" href="/" aria-label="Página inicial do Bomberlan"><img src="/bomberlan-logo-transparent.png" alt="Bomberlan" /></a>`;
}

function renderLanding() {
<<<<<<< HEAD
  setMenuMusicActive(true);
=======
>>>>>>> e1d4b9e6430ba42826193cf0423b78a20eded43a
  stopVictory();
  stopMenuMascot();
  clearRoomTransition();
  stopMatchIntro();
  const showIntro = !introShown;
  introShown = true;
  player = null;
  root.innerHTML = `
    <main class="menu-home ${showIntro ? "has-intro" : ""}">
<<<<<<< HEAD
      ${showIntro ? `<div class="menu-intro" id="menu-intro"><div class="intro-logo-wrap"><i aria-hidden="true"></i><img src="/bomberlan-logo-transparent.png" alt="Bomberlan" /></div><div class="intro-loader"><div class="intro-track"><i></i></div><span><b>PREPARANDO A ARENA</b><em>CARREGANDO SISTEMAS</em></span></div><button class="intro-start" id="intro-start" type="button" disabled><span><small>ARENA PRONTA</small>INICIAR</span><b aria-hidden="true">▶</b></button><section class="intro-story" aria-live="polite"><span class="intro-story-kicker">LUASOFT APRESENTA</span><h1>BEM-VINDO AO <strong>BOMBERLAN</strong></h1><p>Uma arena multiplayer em pixel art onde estratégia, bombas e coragem decidem o último sobrevivente.</p><div class="intro-studio"><i aria-hidden="true">★</i><span>UM PROJETO DA<strong>EQUIPE LUASOFT</strong></span><i aria-hidden="true">★</i></div></section></div>` : ""}
=======
      ${showIntro ? `<div class="menu-intro" id="menu-intro"><div class="intro-logo-wrap"><i aria-hidden="true"></i><img src="/bomberlan-logo-transparent.png" alt="Bomberlan" /></div><div class="intro-loader"><div class="intro-track"><i></i></div><span><b>PREPARANDO A ARENA</b><em>CARREGANDO SISTEMAS</em></span></div></div>` : ""}
>>>>>>> e1d4b9e6430ba42826193cf0423b78a20eded43a
      <header class="menu-header">
        ${brand()}
        <label class="player-profile" for="player-name"><span class="profile-avatar">B</span><span class="profile-copy"><small>INSIRA SEU NOME</small><input form="create-form" id="player-name" maxlength="16" autocomplete="nickname" placeholder="Seu nome" value="${escapeHtml(getName())}" required /></span></label>
        <div class="status-pill"><i></i> ARENA ONLINE</div>
      </header>
      <section class="menu-stage">
        <div class="menu-options">
          <div class="menu-kicker"><span>●</span> BEM-VINDO À ARENA</div>
          <div class="battle-logo" role="img" aria-label="Entre na batalha"><span>ENTRE NA</span><strong>BATALHA!</strong><em>★ ARENA MULTIPLAYER ★</em></div>
          <form class="arcade-menu-form" id="create-form">
            <button class="arcade-action create-room-action" type="submit"><span><small>PARTIDA ONLINE</small>CRIAR UMA SALA</span><b>▶</b></button>
            <div class="join-room-action">
              <label for="room-code">ENTRAR COM UM AMIGO</label>
              <div class="menu-code-row"><input id="room-code" maxlength="6" aria-label="Código da sala" placeholder="CÓDIGO DA SALA" pattern="[A-Za-z2-9]{6}" /><button type="button" id="join-button"><span>ENTRAR</span><b>▶</b></button></div>
            </div>
            <p class="form-error menu-error" id="form-error" role="alert"></p>
          </form>
        </div>
        <div class="menu-hero-art" aria-hidden="true">
          <div class="arena-rank"><span>★</span><small>MODO</small><b>CLÁSSICO</b></div>
          <div class="hero-burst"></div>
          <canvas id="menu-mascot-canvas" width="360" height="432" aria-label="Personagem do Bomberlan fazendo malabarismo com bombas"></canvas>
          <div class="player-count"><b>4</b><span>JOGADORES<br><small>HUMANOS OU BOTS</small></span></div>
        </div>
      </section>
      <div class="menu-footer"><span><b>WASD</b> PARA MOVER</span><i></i><span><b>ESPAÇO</b> PARA BOMBA</span><i></i><span>ÚLTIMO VIVO <b>VENCE</b></span></div>
    </main>`;

  stopMenuMascotLoop = startMenuMascotAnimation(root.querySelector("#menu-mascot-canvas"));
  if (showIntro) {
    const intro = root.querySelector("#menu-intro");
<<<<<<< HEAD
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
=======
    setTimeout(() => intro?.classList.add("leaving"), 1450);
    setTimeout(() => intro?.remove(), 1920);
>>>>>>> e1d4b9e6430ba42826193cf0423b78a20eded43a
  }

  root.querySelector("#create-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const button = event.submitter;
    button.disabled = true;
    button.textContent = "PREPARANDO ARENA…";
    const name = saveName();
    try {
      const response = await fetch("/api/rooms", { method: "POST" });
      if (!response.ok) throw new Error("Não foi possível criar a sala");
      const data = await response.json();
      sessionStorage.setItem(`blast-host-${data.roomCode}`, data.hostToken);
      history.pushState({}, "", data.path);
      connectToRoom(data.roomCode, name, data.hostToken);
    } catch {
      root.querySelector("#form-error").textContent = "A arena está aquecendo. Tente novamente.";
      button.disabled = false;
      button.innerHTML = "<span><small>PARTIDA ONLINE</small>CRIAR UMA SALA</span><b>▶</b>";
    }
  });
  root.querySelector("#join-button").addEventListener("click", joinFromLanding);
  root.querySelector("#room-code").addEventListener("keydown", (event) => { if (event.key === "Enter") { event.preventDefault(); joinFromLanding(); } });
}

function saveName() {
  const name = (root.querySelector("#player-name")?.value || getName()).trim().slice(0, 16) || "Jogador";
  localStorage.setItem("blast-name", name);
  return name;
}

function joinFromLanding() {
  const code = root.querySelector("#room-code").value.trim().toUpperCase();
  if (!/^[A-Z2-9]{6}$/.test(code)) { root.querySelector("#form-error").textContent = "Digite o código de 6 caracteres da sala."; return; }
  const name = saveName();
  history.pushState({}, "", `/r/${code}`);
  connectToRoom(code, name);
}

function renderDirectJoin(code) {
<<<<<<< HEAD
  setMenuMusicActive(true);
=======
>>>>>>> e1d4b9e6430ba42826193cf0423b78a20eded43a
  root.innerHTML = `<main class="center-shell"><nav>${brand()}</nav><form class="compact-card" id="direct-join"><div class="card-kicker">SALA ${escapeHtml(code)}</div><h2>VOCÊ FOI CONVIDADO.</h2><p>Escolha seu nome e entre na arena.</p><label for="player-name">NOME DO JOGADOR</label><input id="player-name" maxlength="16" autocomplete="nickname" value="${escapeHtml(getName())}" required /><button class="primary" type="submit">ENTRAR NA SALA <span>→</span></button><a href="/" class="text-link">Voltar ao início</a></form></main>`;
  root.querySelector("#direct-join").addEventListener("submit", (event) => { event.preventDefault(); connectToRoom(code, saveName(), sessionStorage.getItem(`blast-host-${code}`)); });
}

function renderConnecting(code) {
<<<<<<< HEAD
  setMenuMusicActive(true);
=======
>>>>>>> e1d4b9e6430ba42826193cf0423b78a20eded43a
  root.innerHTML = `<main class="room-transition"><div class="transition-grid" aria-hidden="true"></div><div class="transition-radar" aria-hidden="true"><i></i><i></i><i></i></div><section class="transition-content" role="status"><span class="transition-kicker">SALA ${escapeHtml(code)}</span><div class="transition-logo"><i aria-hidden="true"></i><img src="/bomberlan-logo-transparent.png" alt="Bomberlan" /></div><div class="transition-copy"><b>ABRINDO A ARENA</b><span>Sincronizando jogadores e preparando o campo</span></div><div class="transition-track"><i></i></div></section><div class="transition-tip"><span>●</span> FIQUE PRONTO PARA A EXPLOSÃO</div></main>`;
}

function renderLobbyReturnTransition(message) {
  stopVictory();
<<<<<<< HEAD
  stopMatchAudio();
  setMenuMusicActive(true);
  stopVictory();
=======
>>>>>>> e1d4b9e6430ba42826193cf0423b78a20eded43a
  stopMatchIntro();
  stopInput?.();
  stopInput = null;
  stopRenderLoop();
  clearRoomTransition();
  lobbyMounted = false;
  roomTransitionStartedAt = performance.now();
  const roster = (latestSnapshot?.players || []).map((candidate) => `<span style="--return-color:${PLAYER_COLORS[candidate.slot]}"><img src="/player-avatar-${candidate.slot + 1}.png" alt="${escapeHtml(candidate.name)}" /></span>`).join("");
  root.innerHTML = `<main class="room-transition return-transition"><div class="transition-grid" aria-hidden="true"></div><div class="transition-radar" aria-hidden="true"><i></i><i></i><i></i></div><section class="transition-content" role="status"><span class="transition-kicker">RODADA FINALIZADA</span><div class="transition-logo"><i aria-hidden="true"></i><img src="/bomberlan-logo-transparent.png" alt="Bomberlan" /></div><div class="transition-copy"><b>RETORNANDO À SALA</b><span>Reunindo os jogadores para a próxima batalha</span></div><div class="return-roster">${roster}</div><div class="transition-track"><i style="animation-duration:${Math.max(800, Number(message?.transitionMs) || 1320) - 170}ms"></i></div></section><div class="transition-tip"><span>●</span> PREPARE A REVANCHE</div></main>`;
}

function connectToRoom(code, name, hostToken = null) {
  clearRoomTransition();
  lobbyMounted = false;
  roomTransitionStartedAt = performance.now();
  renderConnecting(code);
  errorShown = false;
  const protocol = location.protocol === "https:" ? "wss:" : "ws:";
  socket = new WebSocket(`${protocol}//${location.host}/ws`);
  socket.addEventListener("open", () => socket.send(JSON.stringify({ type: "join", roomCode: code, name, hostToken })));
  socket.addEventListener("message", (event) => handleMessage(JSON.parse(event.data)));
  socket.addEventListener("close", () => { if (!errorShown && player) showToast("Conexão perdida. Atualize a página para voltar.", true); });
}

function send(message) { if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message)); }

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

function handleMessage(message) {
  if (message.type === "joined") player = message;
  else if (message.type === "lobbyReturn") renderLobbyReturnTransition(message);
  else if (message.type === "lobby") queueLobbyReveal(message);
  else if (message.type === "matchStart") renderMatch(message);
<<<<<<< HEAD
  else if (message.type === "snapshot") { playSnapshotEffects(latestSnapshot, message); latestSnapshot = message; updateHud(message); }
  else if (message.type === "matchEnd") renderResult(message.winnerSlot, message.standings || []);
=======
  else if (message.type === "snapshot") { latestSnapshot = message; updateHud(message); }
  else if (message.type === "matchEnd") renderResult(message.winnerSlot);
>>>>>>> e1d4b9e6430ba42826193cf0423b78a20eded43a
  else if (message.type === "host") player.isHost = message.hostId === player.playerId;
  else if (message.type === "error") renderError(message);
}

<<<<<<< HEAD
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
  setMenuMusicActive(true);
=======
function renderLobby(lobby) {
>>>>>>> e1d4b9e6430ba42826193cf0423b78a20eded43a
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
<<<<<<< HEAD
  const botDifficulty = ["easy", "normal", "hard"].includes(lobby.botDifficulty) ? lobby.botDifficulty : "normal";
  const difficultyOptions = [
    { value: "easy", label: "FÁCIL", detail: "MAIS TRANQUILOS", icon: "Ⅰ" },
    { value: "normal", label: "NORMAL", detail: "EQUILIBRADOS", icon: "Ⅱ" },
    { value: "hard", label: "DIFÍCIL", detail: "RÁPIDOS E AGRESSIVOS", icon: "Ⅲ" },
  ];
  const botDifficultyPanel = isHost && onlineCount === 1
    ? `<section class="bot-difficulty-panel"><header><span>PARTIDA SOLO</span><b>DIFICULDADE DOS BOTS</b></header><div class="bot-difficulty-options" role="group" aria-label="Escolha a dificuldade dos bots">${difficultyOptions.map((option) => `<button type="button" class="${option.value === botDifficulty ? "active" : ""}" data-bot-difficulty="${option.value}" aria-pressed="${option.value === botDifficulty}"><i aria-hidden="true">${option.icon}</i><span>${option.label}<small>${option.detail}</small></span></button>`).join("")}</div><p>Disponível enquanto você estiver sozinho na sala.</p></section>`
    : "";
=======
>>>>>>> e1d4b9e6430ba42826193cf0423b78a20eded43a
  lobbyMounted = true;
  const squadPreview = lobby.slots.map((slot) => slot.kind === "empty"
    ? `<i class="squad-empty" aria-hidden="true">+</i>`
    : `<img src="/player-avatar-${slot.slot + 1}.png" alt="${escapeHtml(slot.name)}" />`).join("");
<<<<<<< HEAD
  root.innerHTML = `<main class="lobby-shell ${firstLobbyRender ? "lobby-entering" : ""}"><div class="lobby-backdrop" aria-hidden="true"><i></i><i></i><i></i></div><nav class="lobby-nav">${brand()}<div class="room-chip"><i></i><span>SALA ATIVA</span><b>${escapeHtml(player.roomCode)}</b></div></nav><section class="lobby-heading"><div class="lobby-heading-copy"><div class="eyebrow"><span>●</span> SALA DE ESPERA</div><h2>MONTE SEU<br><strong>ESQUADRÃO.</strong></h2><p>${isHost ? "Convide seus amigos ou complete a equipe com bots. Você decide quando a batalha começa." : "O anfitrião está preparando a partida. Marque-se como pronto e aguarde o sinal."}</p></div><aside class="lobby-squad-card"><span>EQUIPE ATUAL</span><b>${onlineCount}<small>/4</small></b><em>JOGADORES ONLINE</em><div class="squad-preview">${squadPreview}</div></aside></section><section class="lobby-grid"><div class="players-panel"><div class="panel-title"><span><i></i> ESCALAÇÃO DA ARENA</span><b>${onlineCount}/4 ONLINE</b></div><div class="slot-list">${lobby.slots.map((slot) => slotMarkup(slot, lobby.hostId)).join("")}</div></div><aside class="invite-panel"><div class="invite-panel-heading"><div><span>CONVITE DA SALA</span><b>CHAME SUA EQUIPE</b></div><i aria-hidden="true">✦</i></div><label>LINK DE ACESSO</label><div class="copy-row"><input readonly value="${escapeHtml(roomUrl)}" aria-label="Link da sala" /><button id="copy-link" aria-label="Copiar link do convite">COPIAR</button></div><div class="room-pass" aria-label="Código da sala ${escapeHtml(player.roomCode)}"><div class="pass-pixels" aria-hidden="true"></div><span><small>CÓDIGO DA SALA</small><strong>${escapeHtml(player.roomCode)}</strong><em>6 CARACTERES</em></span></div><p>O link funciona enquanto houver uma vaga livre na equipe.</p>${botDifficultyPanel}</aside></section><section class="lobby-actions"><div class="lobby-action-copy"><span>SEU STATUS</span><b>${ownSlot?.ready ? "VOCÊ ESTÁ PRONTO" : "CONFIRME SUA PRESENÇA"}</b></div><button class="ready-button ${ownSlot?.ready ? "active" : ""}" id="ready-button">${ownSlot?.ready ? "✓ PRONTO" : "ESTOU PRONTO"}</button>${isHost ? `<button class="primary start-button" id="start-button"><span><small>ANFITRIÃO</small>INICIAR PARTIDA</span><b>▶</b></button>` : `<div class="host-wait"><i></i> AGUARDANDO ANFITRIÃO</div>`}</section></main>`;
  root.querySelector("#copy-link").addEventListener("click", async () => { await navigator.clipboard.writeText(roomUrl); root.querySelector("#copy-link").textContent = "COPIADO"; });
  root.querySelector("#ready-button").addEventListener("click", () => send({ type: "ready", ready: !ownSlot?.ready }));
  for (const button of root.querySelectorAll("[data-bot-difficulty]")) {
    button.addEventListener("click", () => send({ type: "botDifficulty", difficulty: button.dataset.botDifficulty }));
  }
=======
  root.innerHTML = `<main class="lobby-shell ${firstLobbyRender ? "lobby-entering" : ""}"><div class="lobby-backdrop" aria-hidden="true"><i></i><i></i><i></i></div><nav class="lobby-nav">${brand()}<div class="room-chip"><i></i><span>SALA ATIVA</span><b>${escapeHtml(player.roomCode)}</b></div></nav><section class="lobby-heading"><div class="lobby-heading-copy"><div class="eyebrow"><span>●</span> SALA DE ESPERA</div><h2>MONTE SEU<br><strong>ESQUADRÃO.</strong></h2><p>${isHost ? "Convide seus amigos ou complete a equipe com bots. Você decide quando a batalha começa." : "O anfitrião está preparando a partida. Marque-se como pronto e aguarde o sinal."}</p></div><aside class="lobby-squad-card"><span>EQUIPE ATUAL</span><b>${onlineCount}<small>/4</small></b><em>JOGADORES ONLINE</em><div class="squad-preview">${squadPreview}</div></aside></section><section class="lobby-grid"><div class="players-panel"><div class="panel-title"><span><i></i> ESCALAÇÃO DA ARENA</span><b>${onlineCount}/4 ONLINE</b></div><div class="slot-list">${lobby.slots.map((slot) => slotMarkup(slot, lobby.hostId)).join("")}</div></div><aside class="invite-panel"><div class="invite-panel-heading"><div><span>CONVITE DA SALA</span><b>CHAME SUA EQUIPE</b></div><i aria-hidden="true">✦</i></div><label>LINK DE ACESSO</label><div class="copy-row"><input readonly value="${escapeHtml(roomUrl)}" aria-label="Link da sala" /><button id="copy-link" aria-label="Copiar link do convite">COPIAR</button></div><div class="room-pass" aria-label="Código da sala ${escapeHtml(player.roomCode)}"><div class="pass-pixels" aria-hidden="true"></div><span><small>CÓDIGO DA SALA</small><strong>${escapeHtml(player.roomCode)}</strong><em>6 CARACTERES</em></span></div><p>O link funciona enquanto houver uma vaga livre na equipe.</p></aside></section><section class="lobby-actions"><div class="lobby-action-copy"><span>SEU STATUS</span><b>${ownSlot?.ready ? "VOCÊ ESTÁ PRONTO" : "CONFIRME SUA PRESENÇA"}</b></div><button class="ready-button ${ownSlot?.ready ? "active" : ""}" id="ready-button">${ownSlot?.ready ? "✓ PRONTO" : "ESTOU PRONTO"}</button>${isHost ? `<button class="primary start-button" id="start-button"><span><small>ANFITRIÃO</small>INICIAR PARTIDA</span><b>▶</b></button>` : `<div class="host-wait"><i></i> AGUARDANDO ANFITRIÃO</div>`}</section></main>`;
  root.querySelector("#copy-link").addEventListener("click", async () => { await navigator.clipboard.writeText(roomUrl); root.querySelector("#copy-link").textContent = "COPIADO"; });
  root.querySelector("#ready-button").addEventListener("click", () => send({ type: "ready", ready: !ownSlot?.ready }));
>>>>>>> e1d4b9e6430ba42826193cf0423b78a20eded43a
  root.querySelector("#start-button")?.addEventListener("click", (event) => {
    event.currentTarget.disabled = true;
    event.currentTarget.classList.add("starting");
    event.currentTarget.querySelector("span").innerHTML = "<small>PREPARANDO</small>ABRINDO A ARENA";
    send({ type: "start" });
  });
}

function slotMarkup(slot, hostId) {
  const color = PLAYER_COLORS[slot.slot];
  if (slot.kind === "empty") return `<div class="player-slot empty" style="--slot-color:${color}"><span class="slot-number">0${slot.slot + 1}</span><i aria-hidden="true">+</i><div><b>VAGA ABERTA</b><small>Aguardando jogador</small></div><em>DISPONÍVEL</em></div>`;
<<<<<<< HEAD
  return `<div class="player-slot occupied" style="--slot-color:${color}"><span class="slot-number">0${slot.slot + 1}</span><img src="/player-avatar-${slot.slot + 1}.png" alt="" /><div><b>${escapeHtml(slot.name)} ${slot.id === hostId ? `<mark>ANFITRIÃO</mark>` : ""}</b><small>${slot.kind === "bot" ? "BOT DA ARENA" : "JOGADOR CONECTADO"}</small></div><span class="slot-trophies" title="${Number(slot.trophies) || 0} troféus"><img src="/trophy-pixel.png" alt="" /><b>${Number(slot.trophies) || 0}</b></span><em class="${slot.ready ? "is-ready" : ""}">${slot.ready ? "● PRONTO" : "○ AGUARDANDO"}</em></div>`;
}

function renderMatch(start) {
  setMenuMusicActive(false);
=======
  return `<div class="player-slot occupied" style="--slot-color:${color}"><span class="slot-number">0${slot.slot + 1}</span><img src="/player-avatar-${slot.slot + 1}.png" alt="" /><div><b>${escapeHtml(slot.name)} ${slot.id === hostId ? `<mark>ANFITRIÃO</mark>` : ""}</b><small>${slot.kind === "bot" ? "BOT DA ARENA" : "JOGADOR CONECTADO"}</small></div><em class="${slot.ready ? "is-ready" : ""}">${slot.ready ? "● PRONTO" : "○ AGUARDANDO"}</em></div>`;
}

function renderMatch(start) {
>>>>>>> e1d4b9e6430ba42826193cf0423b78a20eded43a
  stopVictory();
  stopMenuMascot();
  stopMatchIntro();
  stopInput?.();
  stopInput = null;
  localInput = { dx: 0, dy: 0, drop: false };
  latestSnapshot = { ...start, bombs: [], blasts: [] };
  displaySnapshot = copySnapshot(latestSnapshot);
  lastHudSignature = "";
<<<<<<< HEAD
  const countdownMs = Math.max(1200, Number(start.countdownMs) || 4420);
  const roster = start.players.map((candidate) => `<span style="--intro-color:${PLAYER_COLORS[candidate.slot]}"><img src="/player-avatar-${candidate.slot + 1}.png" alt="${escapeHtml(candidate.name)}" /><b>P${candidate.slot + 1}</b></span>`).join("");
  root.innerHTML = `<main class="game-shell match-pending"><header class="game-header">${brand()}<div class="match-label"><span>SALA ${escapeHtml(player.roomCode)}</span><b>O ÚLTIMO VIVO VENCE</b></div></header><section class="game-layout"><div class="arena-wrap"><canvas width="520" height="440" aria-label="Arena do Bomberlan"></canvas><div class="corner-mark top-left"></div><div class="corner-mark bottom-right"></div></div><aside class="match-sidebar"><div class="panel-title"><span>SOBREVIVENTES</span><b id="alive-count">4 VIVOS</b></div><div id="hud-players"></div><div class="controls-card"><span>CONTROLES</span><p><kbd>WASD</kbd> ou <kbd>↑↓←→</kbd> Mover</p><p><kbd>ESPAÇO</kbd> Soltar bomba</p></div></aside></section><div class="touch-controls" aria-label="Controles de toque do jogo"><div class="dpad"><button data-action="up" aria-label="Mover para cima">↑</button><button data-action="left" aria-label="Mover para a esquerda">←</button><button data-action="down" aria-label="Mover para baixo">↓</button><button data-action="right" aria-label="Mover para a direita">→</button></div><button class="bomb-button" data-action="drop" aria-label="Soltar bomba">BOMBA</button></div></main><section class="match-intro" id="match-intro" role="status" aria-live="assertive"><div class="match-intro-grid" aria-hidden="true"></div><div class="match-intro-burst" aria-hidden="true"></div><div class="match-intro-content"><span class="match-intro-kicker">SALA ${escapeHtml(player.roomCode)} · MODO CLÁSSICO</span><div class="match-intro-logo"><i></i><img src="/bomberlan-logo-transparent.png" alt="Bomberlan" /></div><div class="countdown-stage"><span>A BATALHA COMEÇA EM</span><b id="countdown-number">…</b><strong class="go-signal" aria-hidden="true">JÁ!</strong><em id="countdown-label">PREPARE-SE</em></div><div class="match-intro-roster">${roster}</div></div></section>`;
=======
  const countdownMs = Math.max(1200, Number(start.countdownMs) || 2400);
  const roster = start.players.map((candidate) => `<span style="--intro-color:${PLAYER_COLORS[candidate.slot]}"><img src="/player-avatar-${candidate.slot + 1}.png" alt="${escapeHtml(candidate.name)}" /><b>P${candidate.slot + 1}</b></span>`).join("");
  root.innerHTML = `<main class="game-shell match-pending"><header class="game-header">${brand()}<div class="match-label"><span>SALA ${escapeHtml(player.roomCode)}</span><b>O ÚLTIMO VIVO VENCE</b></div></header><section class="game-layout"><div class="arena-wrap"><canvas width="520" height="440" aria-label="Arena do Bomberlan"></canvas><div class="corner-mark top-left"></div><div class="corner-mark bottom-right"></div></div><aside class="match-sidebar"><div class="panel-title"><span>SOBREVIVENTES</span><b id="alive-count">4 VIVOS</b></div><div id="hud-players"></div><div class="controls-card"><span>CONTROLES</span><p><kbd>WASD</kbd> ou <kbd>↑↓←→</kbd> Mover</p><p><kbd>ESPAÇO</kbd> Soltar bomba</p></div></aside></section><div class="touch-controls" aria-label="Controles de toque do jogo"><div class="dpad"><button data-action="up" aria-label="Mover para cima">↑</button><button data-action="left" aria-label="Mover para a esquerda">←</button><button data-action="down" aria-label="Mover para baixo">↓</button><button data-action="right" aria-label="Mover para a direita">→</button></div><button class="bomb-button" data-action="drop" aria-label="Soltar bomba">BOMBA</button></div></main><section class="match-intro" id="match-intro" role="status" aria-live="assertive"><div class="match-intro-grid" aria-hidden="true"></div><div class="match-intro-burst" aria-hidden="true"></div><div class="match-intro-content"><span class="match-intro-kicker">SALA ${escapeHtml(player.roomCode)} · MODO CLÁSSICO</span><div class="match-intro-logo"><i></i><img src="/bomberlan-logo-transparent.png" alt="Bomberlan" /></div><div class="countdown-stage"><span>A BATALHA COMEÇA EM</span><b id="countdown-number">3</b><em id="countdown-label">PREPARE-SE</em></div><div class="match-intro-roster">${roster}</div></div></section>`;
>>>>>>> e1d4b9e6430ba42826193cf0423b78a20eded43a
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
<<<<<<< HEAD

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
      label.textContent = "EXPLODA O CAMINHO";
      intro?.classList.add("launching");
    }, 3200),
    setTimeout(() => {
      root.querySelector(".game-shell")?.classList.replace("match-pending", "match-live");
      intro?.classList.add("leaving");
      startBattleTheme();
      stopInput = createInputController(send, (input) => { localInput = input; });
    }, countdownMs),
    setTimeout(() => intro?.remove(), countdownMs + 900),
=======
    number.classList.add("count-pop");
  };
  matchIntroTimers.push(
    setTimeout(() => setCountdown("2"), countdownMs * .27),
    setTimeout(() => setCountdown("1"), countdownMs * .54),
    setTimeout(() => {
      setCountdown("JÁ!");
      label.textContent = "EXPLODA O CAMINHO";
      intro?.classList.add("launching");
    }, countdownMs * .8),
    setTimeout(() => {
      root.querySelector(".game-shell")?.classList.replace("match-pending", "match-live");
      intro?.classList.add("leaving");
      stopInput = createInputController(send, (input) => { localInput = input; });
    }, countdownMs),
    setTimeout(() => intro?.remove(), countdownMs + 430),
>>>>>>> e1d4b9e6430ba42826193cf0423b78a20eded43a
  );
}

function updateHud(state) {
  const target = root.querySelector("#hud-players");
  if (!target || !state.players) return;
  const signature = state.players.map((candidate) => `${candidate.id}:${candidate.alive}:${candidate.kind}`).join("|");
  if (signature === lastHudSignature) return;
  lastHudSignature = signature;
  const alive = state.players.filter((candidate) => candidate.alive).length;
  root.querySelector("#alive-count").textContent = `${alive} ${alive === 1 ? "VIVO" : "VIVOS"}`;
  target.innerHTML = state.players.map((candidate) => `<div class="hud-player ${candidate.alive ? "" : "dead"}"><img src="/player-avatar-${candidate.slot + 1}.png" alt="" /><span><b>${escapeHtml(candidate.name)}</b><small>${candidate.kind === "bot" ? "BOT" : candidate.id === player.playerId ? "VOCÊ" : "HUMANO"}</small></span><em>${candidate.alive ? "VIVO" : "FORA"}</em></div>`).join("");
}

<<<<<<< HEAD
function renderResult(winnerSlot, standings = []) {
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
  const heading = winner ? "1º LUGAR!" : "EMPATE!";
  const subtitle = winner
    ? `${winner.name} dominou a arena e conquistou mais um troféu.`
    : "A explosão final não deixou sobreviventes nesta rodada.";

  if (winner) {
    playWinSound();
    root.insertAdjacentHTML("beforeend", `<section class="winner-celebration" id="winner-celebration" role="status" aria-live="assertive"><div class="winner-celebration-burst" aria-hidden="true"></div><span>ÚLTIMO SOBREVIVENTE</span><canvas width="112" height="96" aria-label="${escapeHtml(winner.name)} comemorando a vitória"></canvas><h2>${escapeHtml(winner.name)}<b> VENCEU!</b></h2><p>O campeão está pronto para receber o troféu.</p></section>`);
    stopVictoryLoop = startVictoryAnimation(root.querySelector("#winner-celebration canvas"), winner.slot);
  }

  const mountResultBoard = () => {
    const celebration = root.querySelector("#winner-celebration");
    celebration?.classList.add("leaving");
    stopVictoryLoop?.();
    stopVictoryLoop = null;
    resultTimers.push(setTimeout(() => celebration?.remove(), 480));

    const rankingMarkup = ranking.map((candidate, index) => {
      const isWinner = candidate.slot === winnerSlot;
      const mood = isWinner ? "winner" : "crying";
      const status = isWinner
        ? "VENCEDOR DA RODADA"
        : candidate.kind === "bot"
          ? "BOT DERROTADO"
          : "JOGADOR DERROTADO";
      return `<article class="battle-rank-row ${isWinner ? "champion" : "crying"}" style="--rank-color:${PLAYER_COLORS[candidate.slot]};--rank-delay:${.24 + index * .12}s"><span class="battle-position">${index + 1}º</span><div class="battle-character"><canvas class="battle-avatar result-character-canvas" width="112" height="96" data-result-slot="${candidate.slot}" data-result-mood="${mood}" role="img" aria-label="${escapeHtml(candidate.name)} ${isWinner ? "comemorando" : "chorando"}"></canvas>${isWinner ? `<span class="trophy-flight" aria-hidden="true"><img src="/trophy-pixel.png" alt="" /></span>` : ""}</div><div class="battle-player-copy"><strong>${escapeHtml(candidate.name)}</strong><small>${status}</small></div><div class="battle-trophy-total"><img src="/trophy-pixel.png" alt="" /><span><b>${candidate.trophies}</b><small>TROFÉUS</small></span></div></article>`;
    }).join("");

    root.insertAdjacentHTML("beforeend", `<section class="result-overlay battle-result-overlay"><div class="result-pixel-rain" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div><div class="battle-result-board ${winner ? "has-champion" : "is-draw"}" style="--trophy-delay:${TROPHY_ANIMATION_DELAY_MS}ms;--trophy-duration:${TROPHY_ANIMATION_DURATION_MS}ms"><header class="battle-result-header"><span>★ FIM DA BATALHA ★</span><h2>${heading}</h2><p>${escapeHtml(subtitle)}</p></header><div class="battle-ranking" aria-label="Classificação da sala">${rankingMarkup}</div><footer class="battle-result-actions">${player.isHost ? `<button class="result-rematch-button" id="rematch-button" type="button"><span><small>MESMA EQUIPE</small>JOGAR NOVAMENTE</span><b>↻</b></button>` : `<div class="host-wait"><i></i> AGUARDANDO O ANFITRIÃO</div>`}<button class="result-exit-button" id="exit-room-button" type="button"><span><small>ENCERRAR SESSÃO</small>SAIR PARA O MENU</span><b>×</b></button></footer></div></section>`);

    const characterStops = [...root.querySelectorAll(".result-character-canvas")].map((canvas) =>
      startResultCharacterAnimation(canvas, Number(canvas.dataset.resultSlot), canvas.dataset.resultMood));
    stopVictoryLoop = () => {
      for (const stopCharacter of characterStops) stopCharacter();
    };

    root.querySelector("#rematch-button")?.addEventListener("click", (event) => {
      event.currentTarget.disabled = true;
      event.currentTarget.querySelector("span").innerHTML = "<small>PREPARANDO</small>VOLTANDO À SALA…";
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

  resultTimers.push(setTimeout(mountResultBoard, winner ? RESULT_BOARD_REVEAL_MS : 260));
}

function renderError(message) {
  setMenuMusicActive(true);
=======
function renderResult(winnerSlot) {
  stopMatchIntro();
  stopInput?.(); stopInput = null;
  stopRenderLoop();
  stopVictory();
  const winner = latestSnapshot?.players.find((candidate) => candidate.slot === winnerSlot);
  const subtitle = winnerSlot === null ? "Todos foram atingidos na mesma explosão." : winner?.id === player.playerId ? "Último sobrevivente. Belo trabalho." : "A arena escolheu seu campeão.";
  const resultVisual = winner
    ? `<div class="victory-stage"><canvas id="victory-canvas" width="112" height="104" aria-label="${escapeHtml(winner.name)} comemorando a vitória"></canvas></div><h2 class="retro-result-message" role="status"><span>${escapeHtml(winner.name || "JOGADOR")}</span><b> - VENCEU!</b></h2>`
    : `<div class="draw-burst" aria-hidden="true">×</div><h2 class="retro-result-message immediate" role="status"><span>EMPATE</span><b> - NINGUÉM VENCEU!</b></h2>`;
  root.insertAdjacentHTML("beforeend", `<section class="result-overlay"><div class="result-card retro-result ${winner ? "has-winner" : "is-draw"}"><div class="card-kicker">RESULTADO FINAL</div>${resultVisual}<p class="result-subtitle">${subtitle}</p><div class="result-actions">${player.isHost ? `<button class="primary" id="rematch-button">VOLTAR À SALA <span>→</span></button>` : `<div class="host-wait"><i></i> AGUARDANDO ANFITRIÃO</div>`}<a class="text-link" href="/">Sair da sala</a></div></div></section>`);
  if (winner) stopVictoryLoop = startVictoryAnimation(root.querySelector("#victory-canvas"), winner.slot);
  root.querySelector("#rematch-button")?.addEventListener("click", (event) => {
    event.currentTarget.disabled = true;
    event.currentTarget.innerHTML = "RETORNANDO À SALA…";
    stopVictory();
    send({ type: "rematch" });
  });
}

function renderError(message) {
>>>>>>> e1d4b9e6430ba42826193cf0423b78a20eded43a
  stopVictory();
  stopMenuMascot();
  clearRoomTransition();
  stopMatchIntro();
  errorShown = true; socket?.close();
  root.innerHTML = `<main class="center-shell"><nav>${brand()}</nav><section class="compact-card error-card"><div class="error-code">${escapeHtml(message.code)}</div><h2>${message.code === "ROOM_FULL" ? "ARENA LOTADA." : "SALA NÃO ENCONTRADA."}</h2><p>${escapeHtml(message.message)}</p><button class="primary" id="new-room">CRIAR NOVA SALA <span>→</span></button><a class="text-link" href="/">Voltar ao início</a></section></main>`;
  root.querySelector("#new-room").addEventListener("click", () => { history.pushState({}, "", "/"); renderLanding(); });
}

function showToast(message, danger = false) { document.body.insertAdjacentHTML("beforeend", `<div class="toast ${danger ? "danger" : ""}" role="status">${escapeHtml(message)}</div>`); }

window.addEventListener("popstate", () => { socket?.close(); const code = roomFromPath(); code ? renderDirectJoin(code) : renderLanding(); });
const initialRoom = roomFromPath();
if (initialRoom) renderDirectJoin(initialRoom); else renderLanding();
