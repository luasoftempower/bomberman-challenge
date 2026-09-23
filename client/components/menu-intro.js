import { text } from "../i18n/index.js";
import { settingsMenu } from "../settings-menu.js";

// Monta apenas o HTML da abertura. Os textos usam o sistema de tradução e o
// controle de idioma já fica disponível antes de o jogador iniciar a apresentação.
// O botão começa disabled e será liberado por initializeMenuIntro().
export function menuIntro() {
  return `
    <div class="menu-intro" id="menu-intro">
      <div class="settings-corner">${settingsMenu()}</div>
      <div class="intro-logo-wrap">
        <i aria-hidden="true"></i>
        <img src="/bomberlan-logo-transparent.png" alt="Bomberlan" />
      </div>
      <div class="intro-loader">
        <div class="intro-track"><i></i></div>
        <span>
          <b>${text("intro.preparing")}</b>
          <em>${text("intro.loading")}</em>
        </span>
      </div>
      <button class="intro-start" id="intro-start" type="button" disabled>
        <span>
          <small>${text("intro.ready")}</small>
          ${text("intro.start")}
        </span>
        <b aria-hidden="true">▶</b>
      </button>
      <section class="intro-story" aria-live="polite">
        <span class="intro-story-kicker">${text("intro.presents")}</span>
        <h1>${text("intro.welcome")} <strong>BOMBERLAN</strong></h1>
        <p>${text("intro.story")}</p>
        <div class="intro-studio">
          <i aria-hidden="true">★</i>
          <span>
            ${text("intro.project")}
            <strong>${text("intro.team")}</strong>
          </span>
          <i aria-hidden="true">★</i>
        </div>
      </section>
    </div>
  `;
}

// Deve ser chamada após inserir o HTML na página, para que os seletores existam.
// playStudioSound é uma função recebida do main.js (callback): este componente
// decide quando tocá-la, sem importar ou configurar o sistema de áudio.
export function initializeMenuIntro(root, playStudioSound) {
  const intro = root.querySelector("#menu-intro");
  const home = root.querySelector(".menu-home");
  const startButton = root.querySelector("#intro-start");
  // Estes tempos, em milissegundos, acompanham a apresentação visual existente.
  // A espera de 1,32 s é da animação de entrada, não de uma requisição ao servidor.
  const readyTimer = setTimeout(() => {
    intro?.classList.add("ready");
    if (startButton) {
      startButton.disabled = false;
      // Permite iniciar pelo teclado sem deslocar a página ao mover o foco.
      startButton.focus({ preventScroll: true });
    }
  }, 1320);

  startButton?.addEventListener("click", () => {
    // Interrompe a espera inicial e bloqueia novos cliques durante a sequência.
    clearTimeout(readyTimer);
    startButton.disabled = true;
    intro?.classList.add("starting");
    // Cada classe ativa uma etapa definida no CSS; os tempos contam desde o clique.
    setTimeout(() => intro?.classList.add("story-mode"), 1400);
    // Sincroniza o áudio com a apresentação da equipe, aos 11 segundos.
    setTimeout(playStudioSound, 11000);
    setTimeout(() => {
      // Revela o menu principal enquanto a abertura executa sua animação de saída.
      home?.classList.add("intro-complete");
      intro?.classList.add("leaving");
    }, 16100);
    // Remove a camada somente depois da saída, para ela não bloquear o menu.
    setTimeout(() => intro?.remove(), 16600);
    // once garante que este listener execute uma única sequência por abertura.
  }, { once: true });
}
