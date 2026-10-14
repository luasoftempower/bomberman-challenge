import { MAX_BOMBS, BLAST_RANGE, MOVE_SPEED } from "../../shared/constants.js";
import { gridDimensions } from "../../shared/arena.js";
import { text } from "../i18n/index.js";

// Cada item guarda o tipo do poder e seu ícone.
// Remoto e luva também guardam a tecla e o texto do botão de toque.
const POWERS = [
  ["fire", "🔥"], ["bomb", "💣"], ["speed", "🛼"],
  ["remote", "📡", "E", "controls.remote"],
  ["glove", "🧤", "Q", "controls.glove"],
  ["kick", "🥾"], ["bombPass", "👻"], ["blockPass", "🧱"],
  ["suit", "🛡️"], ["fullFire", "☀️"],
];

// Descobre os poderes ativos usando os dados atuais do jogador enviados pelo servidor.
export function activePowers(player, grid) {
  // Se o jogador não foi encontrado ou já morreu, a lista fica vazia.
  if (!player?.alive) return [];
  const { width, height } = gridDimensions(grid);
  // O alcance máximo depende do tamanho da arena.
  const fullFire = player.fireRange >= Math.max(width, height);
  // Mantém só os poderes ativos. Bombas, fogo e patins precisam superar o valor inicial.
  // Quando há fogo cheio, mostramos apenas ele para não repetir o poder de fogo.
  return POWERS.filter(([type]) => {
    if (type === "fire") return player.fireRange > BLAST_RANGE && !fullFire;
    if (type === "fullFire") return fullFire;
    if (type === "bomb") return player.maxBombs > MAX_BOMBS;
    if (type === "speed") return player.moveSpeed > MOVE_SPEED;
    if (type === "suit") return player.protected;
    return player[type];
  });
}

// Monta o painel. A tag details permite abrir e fechar a legenda sem um botão separado.
export function powerLegendMarkup() {
  return '<details class="power-legend" id="power-legend"><summary>' + text("powers.title") + ' <span id="power-count">0</span></summary><div id="power-list"></div></details>';
}

// Monta os itens com ícone, nome e descrição no idioma escolhido.
// Só os poderes que têm uma tecla extra mostram a tecla e o botão de toque.
export function powerListMarkup(player, grid) {
  const powers = activePowers(player, grid);
  // Explica se ainda não há poderes ou se o jogador foi eliminado.
  if (!powers.length) return '<p class="power-empty">' + text(player?.alive ? "powers.empty" : "powers.inactive") + '</p>';
  return '<ul>' + powers.map(([type, icon, key, touchLabel]) =>
    '<li><span class="power-icon" aria-hidden="true">' + icon + '</span><div><b>' + text("powers." + type + "Name") + '</b><p>' + text("powers." + type + "Description") + '</p>' +
    (key ? '<span class="power-key"><kbd>' + key + '</kbd> · ' + text("powers.touchLabel") + ": " + text(touchLabel) + '</span>' : '') + '</div></li>'
  ).join('') + '</ul>';
}
