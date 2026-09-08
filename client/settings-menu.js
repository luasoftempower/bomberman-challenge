import { attr, languageButton } from "./i18n/index.js";

let menuId = 0;

// Cada tela reutiliza o mesmo menu. Novas opções entram no painel abaixo.
export function settingsMenu() {
  const panelId = `settings-panel-${++menuId}`;
  return `<div class="settings-menu" data-settings-menu>
    <button class="settings-menu-toggle" data-settings-toggle type="button" ${attr("aria-label", "settings.menu")} ${attr("title", "settings.menu")} aria-expanded="false" aria-controls="${panelId}">
      <span class="settings-menu-lines" aria-hidden="true"><i></i><i></i><i></i></span>
    </button>
    <div class="settings-menu-panel" id="${panelId}" role="group" ${attr("aria-label", "settings.menu")} aria-hidden="true" inert>
      ${languageButton()}
    </div>
  </div>`;
}

function setMenuOpen(menu, open) {
  menu.classList.toggle("is-open", open);
  menu.querySelector("[data-settings-toggle]").setAttribute("aria-expanded", String(open));
  const panel = menu.querySelector(".settings-menu-panel");
  panel.inert = !open;
  panel.setAttribute("aria-hidden", String(!open));
}

function closeMenus(except = null) {
  for (const menu of document.querySelectorAll("[data-settings-menu].is-open")) {
    if (menu !== except) setMenuOpen(menu, false);
  }
}

export function initializeSettingsMenu() {
  // Eventos delegados continuam funcionando quando a tela é recriada.
  document.addEventListener("click", (event) => {
    const menu = event.target.closest("[data-settings-menu]");
    closeMenus(menu);
    if (event.target.closest("[data-settings-toggle]")) {
      setMenuOpen(menu, !menu.classList.contains("is-open"));
    }
  });
  document.addEventListener("keydown", (event) => {
    const menu = event.target.closest("[data-settings-menu].is-open");
    if (event.key !== "Escape" || !menu) return;
    event.preventDefault();
    setMenuOpen(menu, false);
    menu.querySelector("[data-settings-toggle]").focus();
  });
  document.addEventListener("focusin", (event) => {
    closeMenus(event.target.closest("[data-settings-menu]"));
  });
}
