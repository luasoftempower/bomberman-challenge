import pt from "./pt.js";
import en from "./en.js";

export const STORAGE_KEY = "blast-language";
export const dictionaries = { pt, en };
let language = "pt";

// A preferência é local. Se o navegador bloquear o storage, a troca ainda funciona.
try {
  const saved = globalThis.localStorage?.getItem(STORAGE_KEY);
  if (Object.hasOwn(dictionaries, saved)) language = saved;
} catch { /* Usa Português como padrão. */ }

export const getLanguage = () => language;
export const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (character) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);

// Traduz uma chave e preenche os parâmetros, sem traduzir nomes ou códigos.
export function t(key, params = {}) {
  const message = dictionaries[language][key] ?? pt[key] ?? key;
  return message.replace(/\{(\w+)\}/g, (placeholder, name) =>
    Object.hasOwn(params, name) ? String(params[name]) : placeholder);
}

// Guarda a chave no HTML para trocar só o texto, sem remontar a tela do jogo.
export function text(key, params = {}) {
  return `<i18n-text data-i18n="${escapeHtml(key)}" data-i18n-params="${escapeHtml(JSON.stringify(params))}">${escapeHtml(t(key, params))}</i18n-text>`;
}

export function attr(attribute, key, params = {}) {
  return `${attribute}="${escapeHtml(t(key, params))}" data-i18n-${attribute}="${escapeHtml(key)}" data-i18n-${attribute}-params="${escapeHtml(JSON.stringify(params))}"`;
}

// Para mensagens que mudam durante a partida (contagem, erros, status, etc.).
export function setText(element, key, params = {}) {
  if (!element) return;
  element.dataset.i18n = key;
  element.dataset.i18nParams = JSON.stringify(params);
  element.textContent = t(key, params);
}

export function applyTranslations(scope = document) {
  for (const element of scope.querySelectorAll("[data-i18n]")) {
    element.textContent = t(element.dataset.i18n, JSON.parse(element.dataset.i18nParams || "{}"));
  }
  for (const attribute of ["aria-label", "title", "placeholder", "content"]) {
    for (const element of scope.querySelectorAll(`[data-i18n-${attribute}]`)) {
      const key = element.getAttribute(`data-i18n-${attribute}`);
      const params = JSON.parse(element.getAttribute(`data-i18n-${attribute}-params`) || "{}");
      element.setAttribute(attribute, t(key, params));
    }
  }
  document.documentElement.lang = language === "pt" ? "pt-BR" : "en";
  document.title = t("app.title");
  for (const button of scope.querySelectorAll("[data-language-toggle]")) {
    button.innerHTML = flagMarkup();
    button.setAttribute("aria-label", t("language.toggle"));
    button.title = t("language.toggle");
  }
}

export function setLanguage(nextLanguage) {
  if (!Object.hasOwn(dictionaries, nextLanguage)) return false;
  language = nextLanguage;
  try { globalThis.localStorage?.setItem(STORAGE_KEY, language); } catch { /* Preferência em memória. */ }
  if (typeof document !== "undefined") applyTranslations();
  return true;
}

function flagMarkup() {
  return `<img src="/flags/${language === "pt" ? "br" : "us"}.svg" width="28" height="20" alt="" aria-hidden="true" /><span class="language-copy" aria-hidden="true"><strong>${escapeHtml(t("language.name"))}</strong></span><span class="language-switch" aria-hidden="true">↔</span>`;
}

export function languageButton() {
  return `<button class="settings-menu-item language-toggle" data-language-toggle type="button" aria-label="${escapeHtml(t("language.toggle"))}" title="${escapeHtml(t("language.toggle"))}">${flagMarkup()}</button>`;
}

export function initializeLanguage() {
  applyTranslations();
  // Delegação: o botão continua funcionando quando menu/lobby/HUD são recriados.
  document.addEventListener("click", (event) => {
    if (event.target.closest("[data-language-toggle]")) setLanguage(language === "pt" ? "en" : "pt");
  });
  window.addEventListener("storage", (event) => {
    if (event.key === STORAGE_KEY) setLanguage(event.newValue || "pt");
  });
}
