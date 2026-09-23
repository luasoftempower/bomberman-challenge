// text() registra textos traduzíveis; attr() faz o mesmo para atributos do HTML.
// Assim, a troca de idioma atualiza o conteúdo sem recriar os campos da página.
import { text, attr } from "../i18n/index.js";
import { settingsMenu } from "../settings-menu.js";
import { escapeHtml } from "../utils/html.js";
import { brand } from "./brand.js";
import { menuIntro } from "./menu-intro.js";

// Recebe o nome como dado: escapeHtml() protege o atributo value, sem traduzir o nome.
// O atributo form="create-form" associa este input ao formulário de criar sala,
// mesmo estando no cabeçalho. Isso mantém a validação de required no envio.
function playerProfile(playerName) {
  return `
    <label class="player-profile" for="player-name">
      <span class="profile-avatar">B</span>
      <span class="profile-copy">
        <small>${text("menu.nameLabel")}</small>
        <input
          form="create-form"
          id="player-name"
          maxlength="16"
          autocomplete="nickname"
          ${attr("placeholder", "menu.namePlaceholder")}
          value="${escapeHtml(playerName)}"
          required
        />
      </span>
    </label>
  `;
}

// Agrupa logo, perfil e preferências. O settingsMenu() escolhe a apresentação
// pelo CSS responsivo, então o cabeçalho não precisa saber o tamanho da tela.
function landingHeader(playerName) {
  return `
    <header class="menu-header">
      ${brand()}
      <div class="player-preferences">
        ${playerProfile(playerName)}
        ${settingsMenu()}
      </div>
      <div class="status-pill"><i></i> ${text("menu.online")}</div>
    </header>
  `;
}

// O título visual é composto por três faixas. O aria-label traduzível fornece
// uma descrição única para leitores de tela, pois o conjunto tem role="img".
function battleHeading() {
  return `
    <div class="menu-kicker"><span>●</span> ${text("menu.welcome")}</div>
    <div class="battle-logo" role="img" ${attr("aria-label", "menu.battleLabel")}>
      <span>${text("menu.enterBattle")}</span>
      <strong>${text("menu.battle")}</strong>
      <em>${text("menu.multiplayer")}</em>
    </div>
  `;
}

// Retorna apenas o conteúdo interno do botão, sem criar outro <button>.
// É usado pelo formulário e pelo main.js para restaurar o botão após uma falha,
// evitando manter duas cópias dos mesmos textos e elementos visuais.
export function createRoomButtonContent() {
  return `
    <span>
      <small>${text("menu.onlineMatch")}</small>
      ${text("menu.create")}
    </span>
    <b>▶</b>
  `;
}

// Os IDs ligam o HTML aos eventos registrados no main.js depois da montagem.
// Criar sala usa submit; entrar usa type="button" para não disparar essa criação.
// O código aceita seis letras ou dígitos de 2 a 9; a validação de entrada também
// acontece em joinFromLanding(). O role="alert" anuncia os erros ao usuário.
function roomForm() {
  return `
    <form class="arcade-menu-form" id="create-form">
      <button class="arcade-action create-room-action" type="submit">
        ${createRoomButtonContent()}
      </button>
      <div class="join-room-action">
        <label for="room-code">${text("menu.friend")}</label>
        <div class="menu-code-row">
          <input
            id="room-code"
            maxlength="6"
            ${attr("aria-label", "common.roomCode")}
            ${attr("placeholder", "common.roomCodeLabel")}
            pattern="[A-Za-z2-9]{6}"
          />
          <button type="button" id="join-button">
            <span>${text("menu.join")}</span>
            <b>▶</b>
          </button>
        </div>
      </div>
      <p class="form-error menu-error" id="form-error" role="alert"></p>
    </form>
  `;
}

// Cria a área decorativa e o canvas. A animação é iniciada pelo main.js somente
// depois que esse HTML está no DOM; este componente não desenha nem cria timers.
// aria-hidden mantém a arte fora da leitura assistiva para evitar ruído visual.
function heroArt() {
  return `
    <div class="menu-hero-art" aria-hidden="true">
      <div class="arena-rank">
        <span>★</span>
        <small>${text("menu.mode")}</small>
        <b>${text("mode.classic")}</b>
      </div>
      <div class="hero-burst"></div>
      <canvas
        id="menu-mascot-canvas"
        width="360"
        height="432"
        ${attr("aria-label", "menu.mascot")}
      ></canvas>
      <div class="player-count">
        <b>4</b>
        <span>
          ${text("menu.players")}<br>
          <small>${text("menu.humansBots")}</small>
        </span>
      </div>
    </div>
  `;
}

// As instruções usam chaves de tradução; WASD permanece literal por ser o nome
// das teclas, e não uma palavra que deve mudar entre Português e Inglês.
function menuFooter() {
  return `
    <div class="menu-footer">
      <span><b>WASD</b> ${text("menu.move")}</span>
      <i></i>
      <span><b>${text("controls.space")}</b> ${text("menu.bomb")}</span>
      <i></i>
      <span>${text("menu.lastAlive")} <b>${text("menu.wins")}</b></span>
    </div>
  `;
}

// Ponto de entrada da composição: recebe as informações necessárias em um objeto
// e devolve uma string de HTML. Eventos, conexão e estado do jogo ficam no main.js.
// showIntro controla tanto a abertura quanto a classe usada nas animações CSS.
// Essa montagem acontece ao entrar na tela; trocar o idioma não chama esta função.
export function landingMarkup({ showIntro, playerName }) {
  return `
    <main class="menu-home ${showIntro ? "has-intro" : ""}">
      ${showIntro ? menuIntro() : ""}
      ${landingHeader(playerName)}
      <section class="menu-stage">
        <div class="menu-options">
          ${battleHeading()}
          ${roomForm()}
        </div>
        ${heroArt()}
      </section>
      ${menuFooter()}
    </main>
  `;
}
