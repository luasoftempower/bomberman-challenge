// Importa os arquivos que contêm os textos traduzidos para Português e Inglês.
// Cada arquivo possui um conjunto de chaves e suas respectivas traduções.
import pt from "./pt.js";
import en from "./en.js";


// Define a chave utilizada para salvar no navegador o idioma escolhido pelo usuário.
// Essa informação será armazenada no localStorage.
export const STORAGE_KEY = "blast-language";


// Reúne todos os idiomas disponíveis no sistema.
// "pt" representa Português e "en" representa Inglês.
export const dictionaries = { pt, en };


// Define Português como idioma padrão da aplicação.
// Caso o usuário já tenha escolhido outro idioma anteriormente,
// esse valor poderá ser alterado pelo bloco abaixo.
let language = "pt";


// ======================================================
// RECUPERA O IDIOMA SALVO NO NAVEGADOR
// ======================================================

// Tenta verificar se o usuário já escolheu um idioma anteriormente.
// Caso exista uma preferência salva no localStorage,
// ela será usada como idioma inicial.
//
// O try/catch evita que a aplicação apresente erro caso o navegador
// bloqueie ou não permita o acesso ao localStorage.
try {
  const saved = globalThis.localStorage?.getItem(STORAGE_KEY);

  // Verifica se o idioma salvo realmente existe no objeto de traduções.
  // Isso impede que valores inválidos sejam usados.
  if (Object.hasOwn(dictionaries, saved)) {
    language = saved;
  }
} catch {
  // Caso não seja possível acessar o armazenamento,
  // o Português continuará sendo utilizado como padrão.
}


// ======================================================
// RETORNA O IDIOMA ATUAL
// ======================================================

// Essa função simplesmente informa qual idioma está ativo no momento.
// Pode retornar, por exemplo, "pt" ou "en".
export const getLanguage = () => language;


// ======================================================
// PROTEÇÃO DE TEXTO HTML
// ======================================================

// Essa função transforma caracteres especiais em entidades HTML.
//
// Isso é importante quando algum texto será inserido dentro do HTML,
// pois evita que caracteres como <, >, " e ' sejam interpretados
// como parte do código HTML.
//
// Exemplo:
// "<teste>" será transformado em "&lt;teste&gt;".
export const escapeHtml = (value) =>
  String(value ?? "").replace(/[&<>"']/g, (character) =>
    ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    })[character]
  );


// ======================================================
// FUNÇÃO PRINCIPAL DE TRADUÇÃO
// ======================================================

// A função t() recebe uma chave de tradução e retorna o texto
// correspondente ao idioma atualmente selecionado.
//
// Exemplo:
// t("app.title")
//
// Caso a tradução não exista no idioma atual,
// ela tenta utilizar a tradução em Português.
// Se também não existir em Português, retorna a própria chave.
//
// O parâmetro "params" permite inserir valores dentro da tradução.
//
// Exemplo de tradução:
// "player.score": "{name} fez {score} pontos"
//
// Uso:
// t("player.score", { name: "Davi", score: 10 })
//
// Resultado:
// "Davi fez 10 pontos"
export function t(key, params = {}) {
  const message =
    dictionaries[language][key] ??
    pt[key] ??
    key;

  return message.replace(/\{(\w+)\}/g, (placeholder, name) =>
    Object.hasOwn(params, name)
      ? String(params[name])
      : placeholder
  );
}


// ======================================================
// CRIA UM TEXTO TRADUZÍVEL NO HTML
// ======================================================

// Essa função cria uma tag <i18n-text> contendo informações
// sobre qual chave de tradução está sendo utilizada.
//
// Isso permite que o texto seja atualizado depois,
// quando o usuário trocar o idioma,
// sem precisar recriar toda a interface.
//
// Exemplo:
// text("menu.play")
//
// Pode gerar algo parecido com:
//
// <i18n-text data-i18n="menu.play">Jogar</i18n-text>
export function text(key, params = {}) {
  return `<i18n-text
    data-i18n="${escapeHtml(key)}"
    data-i18n-params="${escapeHtml(JSON.stringify(params))}"
  >${escapeHtml(t(key, params))}</i18n-text>`;
}


// ======================================================
// CRIA ATRIBUTOS HTML TRADUZÍVEIS
// ======================================================

// Essa função é utilizada quando a tradução não está no texto
// visível do elemento, mas sim em algum atributo.
//
// Pode ser usada, por exemplo, para:
//
// aria-label
// title
// placeholder
// content
//
// Ela também adiciona informações data-i18n para permitir que
// o atributo seja atualizado automaticamente quando o idioma mudar.
//
// Exemplo:
// attr("placeholder", "input.name")
export function attr(attribute, key, params = {}) {
  return `${attribute}="${escapeHtml(t(key, params))}"
    data-i18n-${attribute}="${escapeHtml(key)}"
    data-i18n-${attribute}-params="${escapeHtml(
      JSON.stringify(params)
    )}"`;
}


// ======================================================
// ALTERA UM TEXTO DINÂMICO
// ======================================================

// Essa função serve principalmente para textos que mudam durante
// a execução do jogo.
//
// Exemplos:
//
// contagem regressiva
// mensagens de erro
// status da partida
// quantidade de jogadores
// pontuação
//
// Além de modificar o texto do elemento,
// ela salva a chave da tradução no dataset.
// Dessa forma, o texto também será atualizado caso
// o usuário mude o idioma depois.
export function setText(element, key, params = {}) {
  // Caso o elemento não exista, a função é encerrada.
  if (!element) return;

  // Guarda a chave da tradução.
  element.dataset.i18n = key;

  // Guarda os parâmetros utilizados na tradução.
  element.dataset.i18nParams = JSON.stringify(params);

  // Atualiza o conteúdo exibido para o usuário.
  element.textContent = t(key, params);
}


// ======================================================
// APLICA AS TRADUÇÕES NA PÁGINA
// ======================================================

// Essa função percorre os elementos da página procurando
// aqueles que possuem informações de tradução.
//
// Ela atualiza tanto textos comuns quanto atributos,
// como title, placeholder e aria-label.
//
// Essa função é chamada sempre que o idioma é alterado,
// permitindo mudar Português/Inglês sem recarregar a página.
export function applyTranslations(scope = document) {

  // ------------------------------------------------------
  // Atualiza textos dos elementos que possuem data-i18n.
  // ------------------------------------------------------

  for (const element of scope.querySelectorAll("[data-i18n]")) {
    element.textContent = t(
      element.dataset.i18n,
      JSON.parse(element.dataset.i18nParams || "{}")
    );
  }


  // ------------------------------------------------------
  // Atualiza atributos que também possuem tradução.
  // ------------------------------------------------------

  // Lista de atributos que podem conter textos traduzíveis.
  for (const attribute of [
    "aria-label",
    "title",
    "placeholder",
    "content",
  ]) {

    // Procura elementos que utilizam tradução naquele atributo.
    for (
      const element of scope.querySelectorAll(
        `[data-i18n-${attribute}]`
      )
    ) {

      // Recupera a chave da tradução.
      const key = element.getAttribute(
        `data-i18n-${attribute}`
      );

      // Recupera possíveis parâmetros usados na tradução.
      const params = JSON.parse(
        element.getAttribute(
          `data-i18n-${attribute}-params`
        ) || "{}"
      );

      // Atualiza o atributo com a tradução correta.
      element.setAttribute(
        attribute,
        t(key, params)
      );
    }
  }


  // ------------------------------------------------------
  // Atualiza o idioma informado no próprio HTML.
  // ------------------------------------------------------

  // Isso é útil para navegadores, mecanismos de busca
  // e ferramentas de acessibilidade.
  document.documentElement.lang =
    language === "pt"
      ? "pt-BR"
      : "en";


  // ------------------------------------------------------
  // Atualiza o título da página.
  // ------------------------------------------------------

  document.title = t("app.title");


  // ------------------------------------------------------
  // Atualiza os botões responsáveis pela troca de idioma.
  // ------------------------------------------------------

  for (
    const button of scope.querySelectorAll(
      "[data-language-toggle]"
    )
  ) {

    // Atualiza bandeira, nome do idioma e outros elementos.
    button.innerHTML = flagMarkup();

    // Atualiza informações usadas por leitores de tela.
    button.setAttribute(
      "aria-label",
      t("language.toggle")
    );

    // Atualiza o texto exibido ao passar o mouse.
    button.title = t("language.toggle");
  }
}


// ======================================================
// TROCA O IDIOMA DA APLICAÇÃO
// ======================================================

// Essa função recebe o código do novo idioma,
// como "pt" ou "en".
//
// Ela verifica se o idioma existe,
// salva a preferência no navegador
// e atualiza toda a página.
export function setLanguage(nextLanguage) {

  // Verifica se o idioma solicitado está disponível.
  if (!Object.hasOwn(dictionaries, nextLanguage)) {
    return false;
  }

  // Atualiza o idioma atual.
  language = nextLanguage;


  // ------------------------------------------------------
  // Salva a preferência no navegador.
  // ------------------------------------------------------

  try {
    globalThis.localStorage?.setItem(
      STORAGE_KEY,
      language
    );
  } catch {
    // Caso o localStorage esteja bloqueado,
    // a troca de idioma ainda funcionará durante a sessão.
  }


  // ------------------------------------------------------
  // Atualiza os textos da página.
  // ------------------------------------------------------

  // A verificação evita erros caso esse arquivo seja executado
  // em um ambiente onde "document" não existe.
  if (typeof document !== "undefined") {
    applyTranslations();
  }

  return true;
}


// ======================================================
// MONTA O CONTEÚDO VISUAL DO BOTÃO DE IDIOMA
// ======================================================

// Essa função gera o HTML utilizado dentro do botão
// responsável pela troca de idioma.
//
// Ela mostra:
//
// - Bandeira do Brasil quando o idioma é Português.
// - Bandeira dos Estados Unidos quando o idioma é Inglês.
// - Nome do idioma atual.
// - Símbolo indicando que é possível realizar a troca.
function flagMarkup() {
  return `
    <img
      src="/flags/${language === "pt" ? "br" : "us"}.svg"
      width="28"
      height="20"
      alt=""
      aria-hidden="true"
    />

    <span
      class="language-copy"
      aria-hidden="true"
    >
      <strong>
        ${escapeHtml(t("language.name"))}
      </strong>
    </span>

    <span
      class="language-switch"
      aria-hidden="true"
    >
      ↔
    </span>
  `;
}


// ======================================================
// CRIA O BOTÃO DE TROCA DE IDIOMA
// ======================================================

// Essa função retorna todo o HTML do botão utilizado
// para trocar o idioma da aplicação.
//
// O atributo "data-language-toggle" é utilizado posteriormente
// pelo JavaScript para identificar quando o usuário clicou
// no botão de idioma.
export function languageButton() {
  return `
    <button
      class="settings-menu-item language-toggle"
      data-language-toggle
      type="button"
      aria-label="${escapeHtml(t("language.toggle"))}"
      title="${escapeHtml(t("language.toggle"))}"
    >
      ${flagMarkup()}
    </button>
  `;
}


// ======================================================
// INICIALIZA TODO O SISTEMA DE IDIOMAS
// ======================================================

// Essa função deve ser chamada quando a aplicação iniciar.
//
// Ela realiza três tarefas principais:
//
// 1. Aplica as traduções iniciais.
// 2. Configura o botão para trocar entre Português e Inglês.
// 3. Sincroniza o idioma entre diferentes abas do navegador.
export function initializeLanguage() {

  // ------------------------------------------------------
  // Aplica as traduções no momento em que o sistema inicia.
  // ------------------------------------------------------

  applyTranslations();


  // ------------------------------------------------------
  // DETECTA CLIQUES NO BOTÃO DE IDIOMA
  // ------------------------------------------------------

  // É utilizada delegação de eventos.
  //
  // Em vez de colocar um evento diretamente em cada botão,
  // o clique é detectado pelo document.
  //
  // Isso é útil porque menus, lobby e HUD podem ser
  // destruídos e recriados durante a execução do jogo.
  document.addEventListener("click", (event) => {

    // Verifica se o clique aconteceu dentro de algum elemento
    // que possua o atributo data-language-toggle.
    if (
      event.target.closest(
        "[data-language-toggle]"
      )
    ) {

      // Se estiver em Português, muda para Inglês.
      // Se estiver em Inglês, muda para Português.
      setLanguage(
        language === "pt"
          ? "en"
          : "pt"
      );
    }
  });


  // ------------------------------------------------------
  // SINCRONIZA O IDIOMA ENTRE ABAS DO NAVEGADOR
  // ------------------------------------------------------

  // O evento "storage" é disparado quando o localStorage
  // é alterado em outra aba do mesmo site.
  //
  // Dessa forma, se o usuário trocar o idioma em uma aba,
  // as outras abas também acompanham a alteração.
  window.addEventListener("storage", (event) => {

    // Verifica se a informação alterada foi justamente
    // a preferência de idioma.
    if (event.key === STORAGE_KEY) {

      // Usa o novo idioma salvo.
      // Caso o valor seja removido, volta para Português.
      setLanguage(
        event.newValue || "pt"
      );
    }
  });
}
