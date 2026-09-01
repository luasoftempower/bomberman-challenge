const menuTheme = new Audio("/sounds/menu.mp3");
const hoverSound = new Audio("/sounds/scrollmouse.mp3");
const clickSound = new Audio("/sounds/clickbutton.mp3");
const luaSoftSound = new Audio("/sounds/luasoft.mp3");
const countdownSound = new Audio("/sounds/contagemregressiva.mp3");
const battleTheme = new Audio("/sounds/battletheme.mp3");
const deathSound = new Audio("/sounds/deathsound.mp3");
const walkingSound = new Audio("/sounds/walking.wav");
const bombExplosionSound = new Audio("/sounds/bombexploding.wav");
const winSound = new Audio("/sounds/winsound.mp3");

menuTheme.loop = true;
menuTheme.preload = "auto";
menuTheme.volume = 0.24;
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
deathSound.preload = "auto";
deathSound.volume = 0.52;
walkingSound.preload = "auto";
walkingSound.loop = true;
walkingSound.volume = 0.14;
bombExplosionSound.preload = "auto";
bombExplosionSound.volume = 0.42;
winSound.preload = "auto";
winSound.volume = 0.5;

let menuMusicActive = false;
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

export function setMenuMusicActive(active) {
  menuMusicActive = active;
  if (active) {
    stopMatchAudio();
    play(menuTheme);
  } else {
    menuTheme.pause();
    menuTheme.currentTime = 0;
  }
}

export function playMatchCountdown() {
  stop(battleTheme);
  play(countdownSound, true);
}

export function startBattleTheme() {
  stop(countdownSound);
  play(battleTheme, true);
}

export function stopMatchAudio() {
  stop(countdownSound);
  stop(battleTheme);
  stop(walkingSound);
  stop(winSound);
}

export function playWinSound() {
  stop(countdownSound);
  stop(battleTheme);
  stop(walkingSound);
  play(winSound, true);
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
    if (menuMusicActive) play(menuTheme);
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