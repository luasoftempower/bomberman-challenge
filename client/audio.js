const menuTheme = new Audio("/sounds/menu.mp3");
const superMenuTheme = new Audio("/sounds/menusuperbomberlan.mp3");
const hoverSound = new Audio("/sounds/scrollmouse.mp3");
const clickSound = new Audio("/sounds/clickbutton.mp3");
const luaSoftSound = new Audio("/sounds/luasoft.mp3");
const countdownSound = new Audio("/sounds/contagemregressiva.mp3");
const battleTheme = new Audio("/sounds/battletheme.mp3");
const superBattleTheme = new Audio("/sounds/superbomberlan.mp3");
const deathSound = new Audio("/sounds/deathsound.mp3");
const walkingSound = new Audio("/sounds/walking.wav");
const bombExplosionSound = new Audio("/sounds/bombexploding.wav");
const winSound = new Audio("/sounds/winsound.mp3");
const drawSound = new Audio("/sounds/drawgame.mp3");

menuTheme.loop = true;
menuTheme.preload = "auto";
menuTheme.volume = 0.24;
superMenuTheme.loop = true;
superMenuTheme.preload = "auto";
superMenuTheme.volume = 0.26;
hoverSound.preload = "auto";
hoverSound.volume = 0.28;
clickSound.preload = "auto";
clickSound.volume = 0.42;
luaSoftSound.preload = "auto";
luaSoftSound.volume = 0.68;
countdownSound.preload = "auto";
countdownSound.volume = 0.62;
battleTheme.preload = "auto";
battleTheme.loop = true;
battleTheme.volume = 0.16;
superBattleTheme.preload = "auto";
superBattleTheme.loop = true;
superBattleTheme.volume = 0.18;
deathSound.preload = "auto";
deathSound.volume = 0.52;
walkingSound.preload = "auto";
walkingSound.loop = true;
walkingSound.volume = 0.14;
bombExplosionSound.preload = "auto";
bombExplosionSound.volume = 0.42;
winSound.preload = "auto";
winSound.volume = 0.5;
drawSound.preload = "auto";
drawSound.volume = 0.58;

let menuMusicActive = false;
let menuMusicMode = "classic";
let audioUnlocked = false;
let lastHoverAt = 0;

function play(audio, restart = false) {
  if (!audioUnlocked) return;
  if (restart) audio.currentTime = 0;
  audio.play().catch(() => {});
}

function stop(audio) {
  audio.pause();
  audio.currentTime = 0;
}

function inMenuInterface(target) {
  return target.closest(".menu-home, .lobby-shell, .center-shell, .room-transition, .result-overlay");
}

function activeMenuTheme() {
  return menuMusicMode === "super" ? superMenuTheme : menuTheme;
}

export function setMenuMusicActive(active, mode = "classic") {
  menuMusicActive = active;
  menuMusicMode = mode === "super" ? "super" : "classic";
  if (active) {
    stopMatchAudio();
    const nextTheme = activeMenuTheme();
    const previousTheme = nextTheme === menuTheme ? superMenuTheme : menuTheme;
    if (!previousTheme.paused) stop(previousTheme);
    play(nextTheme);
  } else {
    stop(menuTheme);
    stop(superMenuTheme);
  }
}

export function playMatchCountdown() {
  stop(battleTheme);
  stop(superBattleTheme);
  play(countdownSound, true);
}

export function startBattleTheme(mode = "classic") {
  stop(countdownSound);
  stop(battleTheme);
  stop(superBattleTheme);
  play(mode === "super" ? superBattleTheme : battleTheme, true);
}

export function stopMatchAudio() {
  stop(countdownSound);
  stop(battleTheme);
  stop(superBattleTheme);
  stop(walkingSound);
  stop(winSound);
  stop(drawSound);
}

export function playWinSound() {
  stop(countdownSound);
  stop(battleTheme);
  stop(superBattleTheme);
  stop(walkingSound);
  play(winSound, true);
}

export function playDrawSound() {
  stop(countdownSound);
  stop(battleTheme);
  stop(superBattleTheme);
  stop(walkingSound);
  stop(winSound);
  play(drawSound, true);
}

export function playDeathSound() {
  play(deathSound, true);
}

export function playBombExplosionSound() {
  play(bombExplosionSound, true);
}

export function setWalkingSoundActive(active) {
  if (active) {
    if (walkingSound.paused) play(walkingSound);
  } else if (!walkingSound.paused) stop(walkingSound);
}

export function playLuaSoftSound() {
  play(luaSoftSound, true);
}

export function initializeAudio() {
  const unlock = () => {
    audioUnlocked = true;
    if (menuMusicActive) play(activeMenuTheme());
  };

  window.addEventListener("pointerdown", unlock, { passive: true });
  window.addEventListener("keydown", unlock);

  document.addEventListener("pointerover", (event) => {
    if (event.pointerType && event.pointerType !== "mouse") return;
    const control = event.target.closest("button, a");
    if (!control || !inMenuInterface(control)) return;
    const now = performance.now();
    if (now - lastHoverAt < 55) return;
    lastHoverAt = now;
    play(hoverSound, true);
  });

  document.addEventListener("click", (event) => {
    const control = event.target.closest("button, a");
    if (!control || !inMenuInterface(control)) return;
    play(clickSound, true);
  });
}
