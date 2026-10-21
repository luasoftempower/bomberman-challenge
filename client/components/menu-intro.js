import { attr, text } from "../i18n/index.js";
import { settingsMenu } from "../settings-menu.js";

export const INTRO_SEEN_STORAGE_KEY = "raivolt-intro-seen";

// A preferência é deliberadamente simples: qualquer valor diferente de "1"
// volta a exibir a abertura. O try/catch mantém o jogo utilizável quando o
// navegador bloqueia o armazenamento (modo privado, políticas corporativas etc.).
export function hasSeenMenuIntro(storage) {
  try {
    return (storage || globalThis.localStorage)?.getItem(INTRO_SEEN_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function markMenuIntroSeen(storage) {
  try {
    (storage || globalThis.localStorage)?.setItem(INTRO_SEEN_STORAGE_KEY, "1");
    return true;
  } catch {
    return false;
  }
}

// Monta apenas o HTML da abertura. Os textos usam o sistema de tradução e o
// controle de idioma já fica disponível antes de o jogador iniciar a apresentação.
// O botão começa disabled e será liberado por initializeMenuIntro().
export function menuIntro() {
  return `
    <div class="menu-intro" id="menu-intro">
      <div class="settings-corner">${settingsMenu()}</div>
      <div class="intro-logo-wrap">
        <i aria-hidden="true"></i>
        <img src="/raivolt-logo.png" alt="Raivolt" />
      </div>
      <div class="intro-loader">
        <div class="intro-track"><i></i></div>
        <span>
          <b>${text("intro.preparing")}</b>
          <em>${text("intro.loading")}</em>
        </span>
      </div>
      <div class="intro-actions">
        <button class="intro-start" id="intro-start" type="button" disabled>
          <span>
            <small>${text("intro.ready")}</small>
            ${text("intro.start")}
          </span>
          <b aria-hidden="true">▶</b>
        </button>
        <button
          class="intro-skip"
          id="intro-skip"
          type="button"
          ${attr("aria-label", "intro.skipLabel")}
        >
          <span>${text("intro.skip")}</span>
          <b aria-hidden="true">→</b>
        </button>
      </div>
      <section class="intro-story" aria-live="polite">
        <span class="intro-story-kicker">${text("intro.presents")}</span>
        <h1>${text("intro.welcome")} <strong>RAIVOLT</strong></h1>
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
export function initializeMenuIntro(root, playStudioSound, { storage } = {}) {
  const intro = root.querySelector("#menu-intro");
  const home = root.querySelector(".menu-home");
  const startButton = root.querySelector("#intro-start");
  const skipButton = root.querySelector("#intro-skip");
  const timers = new Set();

  const schedule = (callback, delay) => {
    const timer = setTimeout(() => {
      timers.delete(timer);
      callback();
    }, delay);
    timers.add(timer);
    return timer;
  };

  const cancelTimers = () => {
    for (const timer of timers) clearTimeout(timer);
    timers.clear();
  };

  let completed = false;
  const finishIntro = ({ immediate = false } = {}) => {
    if (completed) return;
    completed = true;
    cancelTimers();
    markMenuIntroSeen(storage);
    home?.classList.add("intro-complete");

    if (immediate) {
      intro?.remove();
    } else {
      intro?.classList.add("leaving");
      setTimeout(() => intro?.remove(), 500);
    }

    // Evita deixar o foco preso no botão que acabou de ser removido.
    root.querySelector(".create-room-action")?.focus({ preventScroll: true });
  };

  // Estes tempos, em milissegundos, acompanham a apresentação visual existente.
  // A espera de 1,32 s é da animação de entrada, não de uma requisição ao servidor.
  const readyTimer = schedule(() => {
    intro?.classList.add("ready");
    if (startButton) {
      startButton.disabled = false;
      // Permite iniciar pelo teclado sem deslocar a página ao mover o foco.
      // Se o jogador já alcançou "Pular" com Tab, não roubamos o foco dele.
      if (!intro?.contains(document.activeElement)) {
        startButton.focus({ preventScroll: true });
      }
    }
  }, 1320);

  skipButton?.addEventListener("click", () => finishIntro({ immediate: true }), { once: true });

  startButton?.addEventListener("click", () => {
    // Interrompe a espera inicial e bloqueia novos cliques durante a sequência.
    clearTimeout(readyTimer);
    startButton.disabled = true;
    intro?.classList.add("starting");
    // Cada classe ativa uma etapa definida no CSS; os tempos contam desde o clique.
    schedule(() => intro?.classList.add("story-mode"), 1400);
    // Sincroniza o áudio com a apresentação da equipe, aos 11 segundos.
    schedule(playStudioSound, 11000);
    schedule(() => {
      // Revela o menu principal enquanto a abertura executa sua animação de saída.
      finishIntro();
    }, 16100);
    // once garante que este listener execute uma única sequência por abertura.
  }, { once: true });
}
