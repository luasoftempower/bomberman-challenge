import { GAME_CONTROLS, POWERUPS } from "../gameplay-guide.js";
import { attr, text } from "../i18n/index.js";
import { drawPowerupIcon } from "../render.js";

function keyMarkup(control) {
  return control.keys.map((key) => {
    const content = control.keyLabelKey ? text(control.keyLabelKey) : key;
    return `<kbd>${content}</kbd>`;
  }).join(`<span class="key-separator">${text("controls.or")}</span>`);
}

function powerupIcon(type, nameKey) {
  return `<canvas class="powerup-icon" width="40" height="40" data-powerup-icon="${type}" role="img" ${attr("aria-label", nameKey)}></canvas>`;
}

function powerupCard(powerup) {
  return `
    <li class="powerup-card">
      ${powerupIcon(powerup.type, powerup.nameKey)}
      <div>
        <strong>${text(powerup.nameKey)}</strong>
        <p>${text(powerup.descriptionKey)}</p>
        <span class="powerup-use">
          ${powerup.key ? `<kbd>${powerup.key}</kbd>` : ""}
          ${text(powerup.usageKey)}
        </span>
      </div>
    </li>
  `;
}

// Seção completa do menu. Os cards vêm de POWERUPS, a mesma lista consumida
// pelo HUD e pela legenda compacta da partida.
export function gameplayGuideMarkup() {
  return `
    <dialog class="gameplay-guide-dialog" id="gameplay-guide-dialog" aria-labelledby="how-to-play-title">
      <section class="gameplay-guide">
        <button class="guide-close" type="button" ${attr("aria-label", "guide.close")}>×</button>
        <header class="guide-heading">
          <span>${text("guide.eyebrow")}</span>
          <h2 id="how-to-play-title">${text("guide.title")}</h2>
          <p>${text("guide.intro")}</p>
        </header>

        <div class="guide-basics">
          <article class="guide-goal">
            <span aria-hidden="true">★</span>
            <div>
              <h3>${text("guide.goalTitle")}</h3>
              <p>${text("guide.goalDescription")}</p>
            </div>
          </article>
          <ul class="control-list" ${attr("aria-label", "guide.controlsLabel")}>
            ${GAME_CONTROLS.map((control) => `
              <li>
                <span class="control-keys">${keyMarkup(control)}</span>
                <span>${text(control.labelKey)}</span>
              </li>
            `).join("")}
          </ul>
        </div>

        <div class="powerup-heading">
          <div>
            <span>${text("guide.superOnly")}</span>
            <h3>${text("guide.powerupsTitle")}</h3>
          </div>
          <p>${text("guide.powerupsIntro")}</p>
        </div>
        <ul class="powerup-grid">
          ${POWERUPS.map(powerupCard).join("")}
        </ul>
      </section>
    </dialog>
  `;
}

// O <dialog> nativo cuida do foco e do fechamento por Esc. Aqui ligamos o
// botão do menu, o X e o clique na área escura ao redor do conteúdo.
export function initializeGameplayGuide(root) {
  const dialog = root.querySelector("#gameplay-guide-dialog");
  const openButton = root.querySelector("#open-gameplay-guide");
  const closeButton = dialog?.querySelector(".guide-close");
  if (!dialog || !openButton || !closeButton) return;

  openButton.addEventListener("click", () => {
    if (!dialog.open) dialog.showModal();
    closeButton.focus();
  });
  closeButton.addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });
  dialog.addEventListener("close", () => openButton.focus());
}

// Versão pequena para a lateral da partida. Ela reaproveita nome, ordem e
// ícone da lista principal, evitando que as duas telas divirjam no futuro.
export function compactPowerupLegendMarkup() {
  return `
    <details class="sidebar-powerups">
      <summary>${text("guide.powerupsTitle")} <span>${POWERUPS.length}</span></summary>
      <ul>
        ${POWERUPS.map((powerup) => `
          <li>${powerupIcon(powerup.type, powerup.nameKey)}<span>${text(powerup.nameKey)}</span></li>
        `).join("")}
      </ul>
    </details>
  `;
}

// Os ícones são desenhados pelo mesmo renderer usado dentro da arena.
export function paintPowerupIcons(scope = document) {
  for (const canvas of scope.querySelectorAll("canvas[data-powerup-icon]")) {
    drawPowerupIcon(canvas, canvas.dataset.powerupIcon);
  }
}
