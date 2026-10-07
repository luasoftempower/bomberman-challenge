import { MAX_FIRE_RANGE, POWERUP_TYPES } from "../shared/constants.js";

// Esta lista é a fonte única dos poderes exibidos no menu e durante a partida.
// Ao criar um novo poder, adicione-o primeiro em shared/constants.js e depois
// descreva aqui como ele aparece e, quando necessário, como fica ativo no HUD.
export const POWERUPS = Object.freeze([
  { type: "fire", nameKey: "ability.fire", descriptionKey: "ability.fireDescription", usageKey: "ability.collectUse" },
  { type: "bomb", nameKey: "ability.bomb", descriptionKey: "ability.bombDescription", usageKey: "ability.collectUse" },
  { type: "speed", nameKey: "ability.speed", descriptionKey: "ability.speedDescription", usageKey: "ability.collectUse" },
  { type: "remote", nameKey: "ability.remote", descriptionKey: "ability.remoteDescription", usageKey: "ability.remoteUse", key: "E", playerField: "remote", hudBadge: "R" },
  { type: "glove", nameKey: "ability.glove", descriptionKey: "ability.gloveDescription", usageKey: "ability.gloveUse", key: "Q", playerField: "glove", hudBadge: "G" },
  { type: "kick", nameKey: "ability.kick", descriptionKey: "ability.kickDescription", usageKey: "ability.kickUse", playerField: "kick", hudBadge: "K" },
  { type: "bombPass", nameKey: "ability.bombPass", descriptionKey: "ability.bombPassDescription", usageKey: "ability.bombPassUse", playerField: "bombPass", hudBadge: "BP" },
  { type: "blockPass", nameKey: "ability.blockPass", descriptionKey: "ability.blockPassDescription", usageKey: "ability.blockPassUse", playerField: "blockPass", hudBadge: "CP" },
  { type: "suit", nameKey: "ability.suit", descriptionKey: "ability.suitDescription", usageKey: "ability.suitUse", playerField: "protected", hudBadge: "S", hudClass: "suit" },
  { type: "fullFire", nameKey: "ability.fullFire", descriptionKey: "ability.fullFireDescription", usageKey: "ability.collectUse", statField: "fireRange", minimum: MAX_FIRE_RANGE, hudBadge: "MAX", hudClass: "full-fire" },
]);

// Falha cedo em desenvolvimento se a simulação ganhar/perder um poder sem que
// a documentação visual seja atualizada junto.
const documentedTypes = POWERUPS.map(({ type }) => type);
if (documentedTypes.length !== POWERUP_TYPES.length
  || documentedTypes.some((type, index) => type !== POWERUP_TYPES[index])) {
  throw new Error("POWERUPS must document every POWERUP_TYPES entry in order");
}

export const GAME_CONTROLS = Object.freeze([
  { id: "move", keys: ["WASD", "↑ ↓ ← →"], labelKey: "guide.controlMove" },
  { id: "bomb", keys: ["SPACE"], keyLabelKey: "controls.space", labelKey: "guide.controlBomb" },
  { id: "remote", keys: ["E"], labelKey: "guide.controlRemote" },
  { id: "glove", keys: ["Q"], labelKey: "guide.controlGlove" },
]);

// O HUD usa a mesma configuração, em vez de manter outra lista de poderes.
export function activeHudPowerups(player) {
  return POWERUPS.filter((powerup) => {
    if (!powerup.hudBadge) return false;
    if (powerup.playerField) return Boolean(player[powerup.playerField]);
    return Number(player[powerup.statField]) >= powerup.minimum;
  });
}
