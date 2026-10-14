import { attr } from "../i18n/index.js";

// Centraliza o logo e o link de retorno usados nas telas do jogo.
// O rótulo acessível é traduzido por attr(); o nome próprio Raivolt permanece.
export function brand() {
  return `
    <a class="brand" href="/" ${attr("aria-label", "common.home")}>
      <img src="/raivolt-logo.png" alt="Raivolt" />
    </a>
  `;
}
