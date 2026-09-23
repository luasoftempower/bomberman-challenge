// O módulo de idiomas cuida dos textos, da bandeira e da troca PT/EN.
// Este arquivo cuida da apresentação dos controles e do estado aberto/fechado.
import { attr, languageButton } from "./i18n/index.js";

// A abertura e o cabeçalho podem existir juntos. O contador evita IDs repetidos
// e permite que cada botão indique seu próprio painel pelo aria-controls.
let menuId = 0;

// Cada tela reutiliza este HTML. O CSS exibe a pill no desktop ou o menu no mobile.
// As duas versões usam languageButton(), então compartilham a mesma preferência.
// aria-expanded informa se o menu está aberto; aria-hidden e inert começam
// bloqueando a leitura e a interação com o painel fechado.
// Novas opções do mobile podem entrar no painel settings-menu-panel abaixo.
export function settingsMenu() {
  const panelId = `settings-panel-${++menuId}`;
  return `<div class="settings-menu" data-settings-menu>
    <div class="settings-desktop">
      ${languageButton()}
    </div>
    <div class="settings-mobile">
      <button
        class="settings-menu-toggle"
        data-settings-toggle
        type="button"
        ${attr("aria-label", "settings.menu")}
        ${attr("title", "settings.menu")}
        aria-expanded="false"
        aria-controls="${panelId}"
      >
        <span class="settings-menu-lines" aria-hidden="true">
          <i></i><i></i><i></i>
        </span>
      </button>
      <div
        class="settings-menu-panel"
        id="${panelId}"
        role="group"
        ${attr("aria-label", "settings.menu")}
        aria-hidden="true"
        inert
      >
        ${languageButton()}
      </div>
    </div>
  </div>`;
}

function setMenuOpen(menu, open) {
  // A mesma decisão atualiza o visual no CSS e o estado para leitores de tela.
  menu.classList.toggle("is-open", open);
  menu.querySelector("[data-settings-toggle]").setAttribute("aria-expanded", String(open));
  const panel = menu.querySelector(".settings-menu-panel");
  // Ocultar visualmente não basta: inert também impede cliques e foco via Tab.
  panel.inert = !open;
  panel.setAttribute("aria-hidden", String(!open));
}

// Fecha os painéis abertos, preservando apenas o menu que está sendo utilizado.
// Sem argumento (ou com null), fecha todos, como no clique fora do controle.
function closeMenus(except = null) {
  for (const menu of document.querySelectorAll("[data-settings-menu].is-open")) {
    if (menu !== except) setMenuOpen(menu, false);
  }
}

export function initializeSettingsMenu() {
  // Deve ser inicializada uma vez, na entrada do main.js, sem repetir por tela.
  // O limite precisa acompanhar a media query de settings-menu.css.
  const mobile = window.matchMedia("(max-width: 680px)");
  mobile.addEventListener("change", () => {
    // change ocorre ao cruzar o limite de 680px, não a cada pixel redimensionado.
    // Guarda o menu focado antes de fechar os painéis, pois o foco pode se perder
    // quando o controle anterior fica oculto ou o painel passa a ser inert.
    const focusedMenu = document.activeElement?.closest("[data-settings-menu]");
    closeMenus();
    const selector = mobile.matches
      ? "[data-settings-toggle]"
      : ".settings-desktop [data-language-toggle]";
    // Só move o foco se ele já estava no menu, sem interromper quem digita no nome.
    // O operador ?. ignora a chamada se não houver menu ou controle correspondente.
    focusedMenu?.querySelector(selector)?.focus({ preventScroll: true });
  });

  // Delegação: o listener fica no document, que permanece mesmo quando o main.js
  // substitui o HTML. Não é preciso registrar eventos em cada novo botão.
  document.addEventListener("click", (event) => {
    // closest encontra o menu mesmo quando o clique vem da bandeira ou de uma linha.
    const menu = event.target.closest("[data-settings-menu]");
    closeMenus(menu);
    if (event.target.closest("[data-settings-toggle]")) {
      // Inverte o estado somente no botão de três linhas. A troca de idioma
      // é tratada pelo i18n e mantém o painel aberto para mostrar a nova escolha.
      setMenuOpen(menu, !menu.classList.contains("is-open"));
    }
  });
  document.addEventListener("keydown", (event) => {
    const menu = event.target.closest("[data-settings-menu].is-open");
    // Não interfere em outras teclas nem no Escape usado fora de um menu aberto.
    if (event.key !== "Escape" || !menu) return;
    event.preventDefault();
    setMenuOpen(menu, false);
    // Devolve o foco para um elemento visível depois que o painel é fechado.
    menu.querySelector("[data-settings-toggle]").focus();
  });
  document.addEventListener("focusin", (event) => {
    // Ao sair do menu com Tab, fecha o painel; ao navegar dentro dele, mantém aberto.
    closeMenus(event.target.closest("[data-settings-menu]"));
  });
}
