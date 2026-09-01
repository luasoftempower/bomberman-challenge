import { BOARD_HEIGHT, BOARD_WIDTH, CRATE, PLAYER_COLORS, TILE_SIZE, WALL } from "../shared/constants.js";

const px = (context, color, x, y, width, height) => {
  context.fillStyle = color;
  context.fillRect(Math.round(x), Math.round(y), Math.round(width), Math.round(height));
};

function drawFloor(context, left, top, x, y) {
  const base = (x + y) % 2 ? "#17283b" : "#192d42";
  px(context, "#091421", left, top, TILE_SIZE, TILE_SIZE);
  px(context, base, left + 2, top + 2, 36, 36);
  px(context, "#25445b", left + 3, top + 3, 34, 3);
  px(context, "#203b51", left + 3, top + 6, 3, 29);
  px(context, "#0f1e2e", left + 3, top + 35, 34, 3);
  px(context, "#0c1928", left + 35, top + 6, 3, 29);
  px(context, (x + y) % 2 ? "#1e354b" : "#20394f", left + 10, top + 11, 5, 4);
  px(context, "#102235", left + 27, top + 26, 4, 4);
}

function drawWall(context, left, top, border) {
  const face = border ? "#536176" : "#574a78";
  const light = border ? "#a9bbca" : "#927bd0";
  const mid = border ? "#718096" : "#6c5a99";
  const dark = border ? "#263345" : "#2d2545";
  const deepest = border ? "#111c2a" : "#171327";

  px(context, deepest, left, top, 40, 40);
  px(context, dark, left + 2, top + 2, 36, 36);
  px(context, face, left + 4, top + 4, 32, 29);
  px(context, light, left + 4, top + 4, 32, 4);
  px(context, mid, left + 4, top + 8, 4, 25);
  px(context, dark, left + 8, top + 29, 28, 4);
  px(context, deepest, left + 8, top + 33, 28, 3);
  px(context, border ? "#65758a" : "#4a3d69", left + 12, top + 12, 20, 13);
  px(context, border ? "#8190a3" : "#7965ad", left + 12, top + 12, 20, 3);
  px(context, border ? "#3b485b" : "#332a4d", left + 29, top + 15, 3, 10);
  px(context, "#c8ff50", left + 6, top + 6, 3, 3);
}

function drawCrate(context, left, top) {
  px(context, "#24131a", left + 1, top + 1, 38, 38);
  px(context, "#6f321f", left + 4, top + 4, 32, 32);
  px(context, "#b95b2f", left + 7, top + 7, 26, 26);
  px(context, "#e88a3f", left + 7, top + 7, 26, 4);
  px(context, "#874022", left + 7, top + 29, 26, 4);
  px(context, "#ffb652", left + 9, top + 9, 4, 4);
  for (let step = 0; step < 5; step += 1) {
    px(context, "#5a281c", left + 8 + step * 5, top + 8 + step * 5, 5, 5);
    px(context, "#5a281c", left + 27 - step * 5, top + 8 + step * 5, 5, 5);
  }
  px(context, "#d97736", left + 9, top + 16, 22, 8);
  px(context, "#5c2a1c", left + 16, top + 9, 8, 22);
  px(context, "#ffd069", left + 9, top + 9, 3, 3);
  px(context, "#ffd069", left + 28, top + 28, 3, 3);
  px(context, "#361821", left + 17, top + 17, 6, 6);
}

function drawBlast(context, blast, animationTime) {
  const left = blast.x * TILE_SIZE;
  const top = blast.y * TILE_SIZE;
  const flicker = Math.floor(animationTime * 18 + blast.x * 3 + blast.y) % 2;
  const outer = flicker ? "#ff315f" : "#ef453d";
  px(context, outer, left + 3, top + 15, 34, 10);
  px(context, outer, left + 15, top + 3, 10, 34);
  px(context, "#ff8a2b", left + 7, top + 12, 26, 16);
  px(context, "#ff8a2b", left + 12, top + 7, 16, 26);
  px(context, "#ffe557", left + 11, top + 15, 18, 10);
  px(context, "#ffe557", left + 15, top + 11, 10, 18);
  px(context, "#fffbe0", left + 17, top + 14, 6, 12);
  px(context, "#fffbe0", left + 14, top + 17, 12, 6);
  px(context, outer, left + 1, top + 18, 5, 4);
  px(context, outer, left + 34, top + 18, 5, 4);
  px(context, outer, left + 18, top + 1, 4, 5);
  px(context, outer, left + 18, top + 34, 4, 5);
}

function drawBomb(context, bomb, animationTime) {
  const x = Math.round((bomb.x + 0.5) * TILE_SIZE);
  const y = Math.round((bomb.y + 0.5) * TILE_SIZE);
  const alert = bomb.fuse < 0.7 && Math.floor(animationTime * 12) % 2 === 0;
  const outline = alert ? "#ff4969" : "#080b14";
  px(context, "rgba(0,0,0,.35)", x - 12, y + 12, 27, 5);
  px(context, outline, x - 10, y - 13, 20, 28);
  px(context, outline, x - 14, y - 9, 28, 20);
  px(context, "#17162d", x - 9, y - 10, 18, 22);
  px(context, "#17162d", x - 11, y - 7, 22, 16);
  px(context, "#3d3767", x - 7, y - 8, 7, 6);
  px(context, "#7771a8", x - 5, y - 7, 4, 3);
  px(context, "#080b14", x + 5, y - 14, 6, 5);
  px(context, "#a675ff", x + 8, y - 17, 4, 5);
  px(context, "#a675ff", x + 11, y - 20, 5, 4);
  px(context, bomb.fuse < 0.7 ? "#ff4267" : "#c8ff50", x + 15, y - 23, 5, 5);
  px(context, "#fff3a0", x + 17, y - 25, 3, 3);
}

const spriteMotion = new Map();
const CHARACTER_PALETTES = [
  { helmet: "#f5f3e9", suit: "#f5f3e9", accent: "#9b6cff", gloves: "#ff8bb4", boots: "#ed4f8b" },
  { helmet: "#171a2a", suit: "#20243a", accent: "#c8ff50", gloves: "#ff8bb4", boots: "#e84d91" },
  { helmet: "#2e68d7", suit: "#3476e8", accent: "#55dff7", gloves: "#ff8bb4", boots: "#e94c91" },
  { helmet: "#ed5037", suit: "#f15c3d", accent: "#ffd24d", gloves: "#ff9bad", boots: "#d93657" },
];

function shade(color, amount) {
  const value = Number.parseInt(color.slice(1), 16);
  const channel = (shift) => Math.max(0, Math.min(255, ((value >> shift) & 255) + amount));
  return `rgb(${channel(16)},${channel(8)},${channel(0)})`;
}

function motionFor(player, animationTime) {
  const previous = spriteMotion.get(player.id);
  const dx = previous ? player.x - previous.x : 0;
  const dy = previous ? player.y - previous.y : 0;
  let direction = previous?.direction || "down";
  if (Math.abs(dx) > 0.02 || Math.abs(dy) > 0.02) {
    direction = Math.abs(dx) >= Math.abs(dy) ? (dx > 0 ? "right" : "left") : (dy > 0 ? "down" : "up");
  }
  const moving = Math.abs(dx) > 0.02 || Math.abs(dy) > 0.02;
  const frame = moving ? Math.floor(animationTime * 9) % 2 : 0;
  spriteMotion.set(player.id, { x: player.x, y: player.y, direction });
  return { direction, moving, frame };
}

function drawKnockedOutPlayer(context, player, palette) {
  const x = Math.round(player.x);
  const y = Math.round(player.y);
  context.globalAlpha = 0.72;
  px(context, "rgba(0,0,0,.4)", x - 16, y + 8, 32, 5);
  px(context, "#080b14", x - 15, y - 6, 27, 15);
  px(context, shade(palette.helmet, -45), x - 12, y - 4, 22, 11);
  px(context, palette.helmet, x - 9, y - 6, 17, 9);
  px(context, "#f5d3ad", x + 4, y - 3, 8, 8);
  px(context, "#ffffff", x + 6, y - 1, 2, 2);
  px(context, "#ffffff", x + 9, y + 2, 2, 2);
  px(context, "#111523", x + 6, y + 2, 2, 2);
  px(context, "#111523", x + 9, y - 1, 2, 2);
  px(context, palette.gloves, x - 16, y - 2, 6, 7);
  px(context, palette.boots, x - 11, y + 5, 8, 5);
  context.globalAlpha = 1;
}

function drawPlayer(context, player, palette, animationTime) {
  if (!player.alive) {
    drawKnockedOutPlayer(context, player, palette);
    return;
  }

  const motion = motionFor(player, animationTime);
  const x = Math.round(player.x);
  const y = Math.round(player.y) + (motion.moving && motion.frame ? -1 : 0);
  const dark = shade(palette.helmet, -72);
  const shadow = shade(palette.helmet, -38);
  const light = shade(palette.helmet, 38);
  const suitDark = shade(palette.suit, -58);
  const leftStep = motion.moving && motion.frame ? 2 : 0;
  const rightStep = motion.moving && !motion.frame ? -2 : 0;
  const armSwing = motion.moving ? (motion.frame ? 2 : -2) : 0;

  px(context, "rgba(0,0,0,.42)", x - 13, y + 12, 26, 5);

  // Boots and legs: two-frame walk cycle.
  px(context, "#070b14", x - 10 + leftStep, y + 6, 8, 10);
  px(context, "#070b14", x + 2 + rightStep, y + 6, 8, 10);
  px(context, palette.boots, x - 8 + leftStep, y + 6, 6, 7);
  px(context, palette.boots, x + 2 + rightStep, y + 6, 6, 7);
  px(context, shade(palette.boots, -55), x - 11 + leftStep, y + 12, 9, 4);
  px(context, shade(palette.boots, -55), x + 2 + rightStep, y + 12, 9, 4);

  // Compact suit and belt.
  px(context, "#080b14", x - 10, y - 1, 20, 13);
  px(context, suitDark, x - 8, y, 16, 10);
  px(context, palette.suit, x - 6, y, 12, 8);
  px(context, "#22243a", x - 8, y + 6, 16, 3);
  px(context, palette.accent, x - 2, y + 6, 4, 3);

  // Swinging arms and oversized gloves.
  px(context, suitDark, x - 13, y + armSwing, 5, 9);
  px(context, suitDark, x + 8, y - armSwing, 5, 9);
  px(context, shade(palette.gloves, -45), x - 15, y + 4 + armSwing, 7, 7);
  px(context, palette.gloves, x - 14, y + 4 + armSwing, 4, 4);
  px(context, shade(palette.gloves, -45), x + 8, y + 4 - armSwing, 7, 7);
  px(context, palette.gloves, x + 10, y + 4 - armSwing, 4, 4);

  // Rounded arcade helmet and central antenna, built on an original pixel grid.
  px(context, "#070a12", x - 13, y - 13, 26, 16);
  px(context, "#070a12", x - 10, y - 18, 20, 23);
  px(context, "#070a12", x - 6, y - 21, 12, 4);
  px(context, shadow, x - 11, y - 12, 22, 14);
  px(context, palette.helmet, x - 8, y - 16, 16, 18);
  px(context, palette.helmet, x - 11, y - 11, 22, 10);
  px(context, light, x - 7, y - 15, 8, 4);
  px(context, "rgba(255,255,255,.55)", x - 8, y - 12, 4, 4);
  px(context, "#080b14", x - 2, y - 24, 4, 6);
  px(context, "#080b14", x - 4, y - 28, 8, 6);
  px(context, palette.accent, x - 3, y - 27, 6, 5);
  px(context, shade(palette.accent, 45), x - 2, y - 27, 3, 2);

  if (motion.direction === "up") {
    px(context, dark, x - 7, y - 9, 14, 9);
    px(context, shade(palette.helmet, -25), x - 4, y - 7, 8, 6);
    px(context, palette.accent, x - 2, y - 6, 4, 4);
  } else {
    const faceShift = motion.direction === "left" ? -3 : motion.direction === "right" ? 3 : 0;
    px(context, "#080b14", x - 9 + faceShift, y - 10, 18, 11);
    px(context, "#f0bf91", x - 7 + faceShift, y - 9, 14, 8);
    px(context, "#ffd9ae", x - 5 + faceShift, y - 9, 10, 5);
    if (motion.direction === "left") {
      px(context, "#101523", x - 5, y - 7, 3, 4);
      px(context, "#ffffff", x - 5, y - 7, 2, 2);
    } else if (motion.direction === "right") {
      px(context, "#101523", x + 2, y - 7, 3, 4);
      px(context, "#ffffff", x + 2, y - 7, 2, 2);
    } else {
      px(context, "#101523", x - 5, y - 7, 3, 4);
      px(context, "#101523", x + 2, y - 7, 3, 4);
      px(context, "#ffffff", x - 5, y - 7, 2, 2);
      px(context, "#ffffff", x + 2, y - 7, 2, 2);
    }
  }

  context.fillStyle = "#f7f3ff";
  context.font = "700 8px Silkscreen, monospace";
  context.textAlign = "center";
  context.textBaseline = "bottom";
  context.shadowColor = "#05070d";
  context.shadowBlur = 0;
  context.fillText(player.name, x, y - 29);
}

function drawVictoryMascot(context, palette, elapsed) {
  const x = 56;
  const jump = Math.round(Math.abs(Math.sin(elapsed * 3.8)) * 12);
  const y = 72 - jump;
  const frame = Math.floor(elapsed * 7.6) % 2;
  const helmetShadow = shade(palette.helmet, -42);
  const suitShadow = shade(palette.suit, -58);
  const confetti = ["#c8ff50", "#a675ff", "#ff5f78", "#55dff7", "#ffd24d"];

  for (let index = 0; index < 16; index += 1) {
    const fall = (elapsed * (18 + (index % 4) * 5) + index * 9) % 76;
    const drift = Math.sin(elapsed * 1.8 + index * 2.1) * 5;
    const left = 6 + ((index * 29) % 98) + drift;
    px(context, confetti[index % confetti.length], left, 4 + fall, index % 3 === 0 ? 5 : 3, 4);
  }

  px(context, "rgba(0,0,0,.28)", x - 17 + jump / 4, 89, 34 - jump / 2, 5);

  // Legs kick outward on alternating frames.
  const kick = frame ? 4 : 0;
  px(context, "#080b14", x - 10 - kick, y + 9, 9, 12);
  px(context, "#080b14", x + 1 + kick, y + 9, 9, 12);
  px(context, palette.boots, x - 9 - kick, y + 12, 8, 7);
  px(context, palette.boots, x + 1 + kick, y + 12, 8, 7);

  // Body and raised arms.
  px(context, "#080b14", x - 10, y - 1, 20, 15);
  px(context, suitShadow, x - 8, y, 16, 12);
  px(context, palette.suit, x - 6, y, 12, 9);
  px(context, "#23253a", x - 8, y + 8, 16, 3);
  px(context, palette.accent, x - 2, y + 8, 4, 3);

  px(context, suitShadow, x - 15, y - 8, 6, 12);
  px(context, suitShadow, x + 9, y - 8, 6, 12);
  px(context, palette.gloves, x - 18, y - 13 - frame * 2, 8, 8);
  px(context, palette.gloves, x + 10, y - 13 - (1 - frame) * 2, 8, 8);
  px(context, "#ffe2ec", x - 17, y - 12 - frame * 2, 4, 3);
  px(context, "#ffe2ec", x + 12, y - 12 - (1 - frame) * 2, 4, 3);

  // Oversized rounded helmet.
  px(context, "#070a12", x - 15, y - 18, 30, 20);
  px(context, "#070a12", x - 11, y - 23, 22, 27);
  px(context, helmetShadow, x - 13, y - 17, 26, 17);
  px(context, palette.helmet, x - 9, y - 21, 18, 22);
  px(context, palette.helmet, x - 12, y - 16, 24, 14);
  px(context, shade(palette.helmet, 40), x - 8, y - 20, 8, 4);

  // Central antenna and smiling face.
  px(context, "#080b14", x - 2, y - 27, 4, 6);
  px(context, "#080b14", x - 5, y - 32, 10, 7);
  px(context, palette.accent, x - 4, y - 31, 8, 5);
  px(context, shade(palette.accent, 42), x - 3, y - 31, 4, 2);
  px(context, "#080b14", x - 10, y - 14, 20, 13);
  px(context, "#f0bf91", x - 8, y - 13, 16, 10);
  px(context, "#ffd9ae", x - 6, y - 13, 12, 6);
  px(context, "#161927", x - 6, y - 10, 4, 2);
  px(context, "#161927", x + 2, y - 10, 4, 2);
  px(context, "#161927", x - 3, y - 6, 6, 2);
  px(context, "#ffffff", x - 5, y - 11, 2, 1);
  px(context, "#ffffff", x + 3, y - 11, 2, 1);
}

function drawCryingMascot(context, palette, elapsed) {
  const x = 56;
  const sob = Math.floor(elapsed * 7) % 2 ? 1 : -1;
  const y = 69 + Math.round(Math.abs(Math.sin(elapsed * 5.4)) * 2);
  const helmetShadow = shade(palette.helmet, -42);
  const suitShadow = shade(palette.suit, -58);
  const tearFall = Math.round((elapsed * 24) % 24);

  px(context, "rgba(0,0,0,.3)", x - 18, 89, 36, 5);
  px(context, "#080b14", x - 10, y + 9, 9, 13);
  px(context, "#080b14", x + 1, y + 9, 9, 13);
  px(context, palette.boots, x - 9 - sob, y + 14, 8, 7);
  px(context, palette.boots, x + 1 + sob, y + 14, 8, 7);
  px(context, "#080b14", x - 10, y - 1, 20, 15);
  px(context, suitShadow, x - 8, y, 16, 12);
  px(context, palette.suit, x - 6, y, 12, 9);
  px(context, "#24263b", x - 8, y + 8, 16, 3);
  px(context, palette.accent, x - 2, y + 8, 4, 3);

  px(context, suitShadow, x - 15, y - 1 + sob, 7, 11);
  px(context, suitShadow, x + 8, y - 1 - sob, 7, 11);
  px(context, "#080b14", x - 18, y - 8 + sob, 9, 9);
  px(context, palette.gloves, x - 17, y - 7 + sob, 7, 7);
  px(context, "#080b14", x + 9, y - 8 - sob, 9, 9);
  px(context, palette.gloves, x + 10, y - 7 - sob, 7, 7);

  px(context, "#070a12", x - 15, y - 18, 30, 20);
  px(context, "#070a12", x - 11, y - 23, 22, 27);
  px(context, helmetShadow, x - 13, y - 17, 26, 17);
  px(context, palette.helmet, x - 9, y - 21, 18, 22);
  px(context, palette.helmet, x - 12, y - 16, 24, 14);
  px(context, shade(palette.helmet, 40), x - 8, y - 20, 8, 4);
  px(context, "#080b14", x - 2, y - 27, 4, 6);
  px(context, "#080b14", x - 5, y - 32, 10, 7);
  px(context, palette.accent, x - 4, y - 31, 8, 5);
  px(context, "#080b14", x - 10, y - 14, 20, 13);
  px(context, "#f0bf91", x - 8, y - 13, 16, 10);
  px(context, "#ffd9ae", x - 6, y - 13, 12, 6);
  px(context, "#151927", x - 6, y - 10, 4, 2);
  px(context, "#151927", x + 2, y - 10, 4, 2);
  px(context, "#151927", x - 3, y - 4, 2, 2);
  px(context, "#151927", x - 1, y - 5, 2, 2);
  px(context, "#151927", x + 1, y - 4, 2, 2);
  px(context, "#55dff7", x - 7, y - 8 + tearFall, 3, 6);
  px(context, "#2588ce", x - 7, y - 3 + tearFall, 3, 3);
  px(context, "#55dff7", x + 4, y - 8 + ((tearFall + 10) % 24), 3, 6);
  px(context, "#2588ce", x + 4, y - 3 + ((tearFall + 10) % 24), 3, 3);
}

function drawJugglingBomb(context, x, y, sparkFrame) {
  px(context, "rgba(0,0,0,.2)", x - 6, y + 6, 13, 3);
  px(context, "#070a12", x - 6, y - 6, 12, 14);
  px(context, "#070a12", x - 8, y - 4, 16, 10);
  px(context, "#18172b", x - 5, y - 5, 10, 11);
  px(context, "#3d3767", x - 3, y - 4, 4, 3);
  px(context, "#080b14", x + 3, y - 8, 4, 4);
  px(context, "#a675ff", x + 5, y - 11, 3, 4);
  px(context, sparkFrame ? "#fff28c" : "#ff5f72", x + 7, y - 13, 4, 4);
}

function drawJugglingMascot(context, elapsed) {
  const palette = CHARACTER_PALETTES[0];
  const x = 60;
  const sway = Math.round(Math.sin(elapsed * 2.5));
  const y = 105 + Math.abs(sway);
  const darkHelmet = shade(palette.helmet, -45);
  const suitDark = shade(palette.suit, -60);

  const leftHandX = x - 20;
  const rightHandX = x + 20;
  const catchHeight = y - 26;
  for (let index = 0; index < 3; index += 1) {
    const fullPhase = (elapsed * 0.82 + index * (2 / 3)) % 2;
    const movingRight = fullPhase < 1;
    const throwProgress = fullPhase % 1;
    const fromX = movingRight ? leftHandX : rightHandX;
    const toX = movingRight ? rightHandX : leftHandX;
    const bombX = fromX + (toX - fromX) * throwProgress;
    const bombY = catchHeight - Math.sin(throwProgress * Math.PI) * 34;
    drawJugglingBomb(context, bombX, bombY, (Math.floor(elapsed * 12) + index) % 2);
  }

  px(context, "rgba(0,0,0,.28)", x - 20, 130, 40, 5);
  px(context, "#080b14", x - 11, y + 10, 10, 20);
  px(context, "#080b14", x + 1, y + 10, 10, 20);
  px(context, palette.boots, x - 10 - sway, y + 19, 10, 8);
  px(context, palette.boots, x + 1 + sway, y + 19, 10, 8);

  px(context, "#080b14", x - 12, y - 4, 24, 22);
  px(context, suitDark, x - 10, y - 2, 20, 18);
  px(context, palette.suit, x - 7, y - 2, 14, 14);
  px(context, "#24263b", x - 10, y + 11, 20, 4);
  px(context, palette.accent, x - 2, y + 11, 4, 4);

  // Raised juggling arms.
  px(context, suitDark, x - 18, y - 12 - sway, 7, 16);
  px(context, suitDark, x + 11, y - 12 + sway, 7, 16);

  // Classic rounded Bomberlan helmet.
  px(context, "#070a12", x - 18, y - 27, 36, 25);
  px(context, "#070a12", x - 13, y - 33, 26, 34);
  px(context, darkHelmet, x - 16, y - 25, 32, 21);
  px(context, palette.helmet, x - 11, y - 31, 22, 28);
  px(context, palette.helmet, x - 15, y - 23, 30, 18);
  px(context, "#ffffff", x - 10, y - 29, 9, 5);

  px(context, "#080b14", x - 2, y - 38, 4, 7);
  px(context, "#080b14", x - 6, y - 44, 12, 8);
  px(context, palette.accent, x - 5, y - 43, 10, 6);
  px(context, "#d7c3ff", x - 4, y - 43, 5, 2);

  px(context, "#080b14", x - 12, y - 22, 24, 16);
  px(context, "#efba88", x - 10, y - 21, 20, 13);
  px(context, "#ffd8aa", x - 8, y - 21, 16, 8);
  px(context, "#151827", x - 7, y - 17, 4, 5);
  px(context, "#151827", x + 3, y - 17, 4, 5);
  px(context, "#ffffff", x - 7, y - 17, 2, 2);
  px(context, "#ffffff", x + 3, y - 17, 2, 2);
  px(context, "#151827", x - 3, y - 10, 6, 2);

  // Hands stay in the foreground so the catches are clearly readable.
  px(context, "#080b14", x - 26, y - 21 - sway, 13, 12);
  px(context, palette.gloves, x - 25, y - 20 - sway, 11, 10);
  px(context, "#ffe0eb", x - 23, y - 19 - sway, 6, 3);
  px(context, shade(palette.gloves, -45), x - 25, y - 12 - sway, 11, 2);
  px(context, "#080b14", x + 13, y - 21 + sway, 13, 12);
  px(context, palette.gloves, x + 14, y - 20 + sway, 11, 10);
  px(context, "#ffe0eb", x + 17, y - 19 + sway, 6, 3);
  px(context, shade(palette.gloves, -45), x + 14, y - 12 + sway, 11, 2);
}

export function startMenuMascotAnimation(canvas) {
  const context = canvas?.getContext("2d", { alpha: true, desynchronized: true });
  if (!context) return () => {};
  const startedAt = performance.now();
  let animationFrameId;
  const frame = (now) => {
    context.imageSmoothingEnabled = false;
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.save();
    context.scale(3, 3);
    drawJugglingMascot(context, (now - startedAt) / 1000);
    context.restore();
    animationFrameId = requestAnimationFrame(frame);
  };
  animationFrameId = requestAnimationFrame(frame);
  return () => cancelAnimationFrame(animationFrameId);
}

export function startResultCharacterAnimation(canvas, slot = 0, mood = "crying") {
  const context = canvas?.getContext("2d", { alpha: true, desynchronized: true });
  if (!context) return () => {};
  const palette = CHARACTER_PALETTES[slot] || CHARACTER_PALETTES[0];
  const startedAt = performance.now();
  let animationFrameId;
  const frame = (now) => {
    context.imageSmoothingEnabled = false;
    context.clearRect(0, 0, canvas.width, canvas.height);
    if (mood === "winner") drawVictoryMascot(context, palette, (now - startedAt) / 1000);
    else drawCryingMascot(context, palette, (now - startedAt) / 1000);
    animationFrameId = requestAnimationFrame(frame);
  };
  animationFrameId = requestAnimationFrame(frame);
  return () => cancelAnimationFrame(animationFrameId);
}
export function startVictoryAnimation(canvas, slot = 0) {
  const context = canvas?.getContext("2d", { alpha: true, desynchronized: true });
  if (!context) return () => {};
  const palette = CHARACTER_PALETTES[slot] || CHARACTER_PALETTES[0];
  const startedAt = performance.now();
  let animationFrameId;
  const frame = (now) => {
    context.imageSmoothingEnabled = false;
    context.clearRect(0, 0, canvas.width, canvas.height);
    drawVictoryMascot(context, palette, (now - startedAt) / 1000);
    animationFrameId = requestAnimationFrame(frame);
  };
  animationFrameId = requestAnimationFrame(frame);
  return () => cancelAnimationFrame(animationFrameId);
}

export function renderGame(canvas, state) {
  if (!state) return;
  const context = canvas.getContext("2d");
  const width = BOARD_WIDTH * TILE_SIZE;
  const height = BOARD_HEIGHT * TILE_SIZE;
  const grid = state.grid || ".".repeat(BOARD_WIDTH * BOARD_HEIGHT);
  const animationTime = performance.now() / 1000;
  context.imageSmoothingEnabled = false;
  context.clearRect(0, 0, width, height);
  px(context, "#07111c", 0, 0, width, height);
  for (let y = 0; y < BOARD_HEIGHT; y += 1) {
    for (let x = 0; x < BOARD_WIDTH; x += 1) {
      const tile = grid[y * BOARD_WIDTH + x];
      const left = x * TILE_SIZE;
      const top = y * TILE_SIZE;
      drawFloor(context, left, top, x, y);
      if (tile === WALL) {
        const border = x === 0 || y === 0 || x === BOARD_WIDTH - 1 || y === BOARD_HEIGHT - 1;
        drawWall(context, left, top, border);
      } else if (tile === CRATE) {
        drawCrate(context, left, top);
      }
    }
  }
  for (const blast of state.blasts) drawBlast(context, blast, animationTime);
  for (const bomb of state.bombs) drawBomb(context, bomb, animationTime);
  for (const player of state.players) drawPlayer(context, player, CHARACTER_PALETTES[player.slot], animationTime);
}

