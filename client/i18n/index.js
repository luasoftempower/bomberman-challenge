// importa os arquivos onde ficam as traduções em português e inglês
import pt from "./pt.js";
import en from "./en.js";


// essa chave é usada no localStorage pra salvar o idioma que o usuário escolheu
// assim, quando ele entrar no site de novo, o idioma continua o mesmo
export const STORAGE_KEY = "blast-language";


// aqui ficam os idiomas que o sistema aceita
// cada idioma aponta pro arquivo que tem as traduções dele
export const dictionaries = { pt, en };


// começa usando português como padrão
// esse valor pode mudar depois caso tenha algum idioma salvo no navegador
let language = "pt";


// tenta pegar o idioma que já estava salvo no navegador
// se o usuário já tiver trocado pra inglês antes, por exemplo,
// ele não precisa escolher de novo toda vez que abrir o site
try {
  const saved = globalThis.localStorage?.getItem(STORAGE_KEY);

  // verifica se o valor salvo realmente é um idioma que existe
  // isso evita colocar qualquer valor inválido dentro de language
  if (Object.hasOwn(dictionaries, saved)) {
    language = saved;
  }

} catch {
  // se o navegador bloquear o localStorage ou der algum erro,
  // simplesmente continua usando português
}


// essa função retorna qual idioma está sendo usado no momento
// pode ser útil em outras partes do código que precisem saber se está em pt ou en
export const getLanguage = () => language;


// essa função serve pra tratar caracteres especiais antes de colocar textos no HTML
// isso evita que coisas como <, > ou aspas sejam interpretadas como código HTML
//
// por exemplo:
// <teste> vira &lt;teste&gt;
//
// além de evitar problemas no HTML, isso também ajuda na segurança
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


// essa é a função principal da tradução
//
// ela recebe uma chave, procura essa chave no idioma atual
// e retorna o texto correspondente
//
// exemplo:
// t("menu.play")
//
// se o idioma estiver em português, pode retornar "Jogar"
// se estiver em inglês, pode retornar "Play"
//
// o params serve pra colocar valores dentro de uma tradução
// por exemplo: "Jogador {name} entrou na partida"
export function t(key, params = {}) {

  // primeiro tenta pegar a tradução no idioma atual
  // se não existir, tenta pegar em português
  // se ainda assim não existir, mostra a própria chave
  const message =
    dictionaries[language][key] ??
    pt[key] ??
    key;

  // procura valores entre chaves, tipo {name}, {score}, {count}
  // e substitui pelo valor que foi passado em params
  return message.replace(/\{(\w+)\}/g, (placeholder, name) =>
    Object.hasOwn(params, name)
      ? String(params[name])
      : placeholder
  );
}


// essa função é usada quando eu quero colocar um texto traduzível no HTML
//
// além de mostrar a tradução atual, ela salva a chave em data-i18n
// assim, quando o idioma mudar, o sistema sabe qual texto precisa atualizar
//
// exemplo:
// text("menu.play")
//
// gera algo parecido com:
// <i18n-text data-i18n="menu.play">Jogar</i18n-text>
export function text(key, params = {}) {

  return `<i18n-text
    data-i18n="${escapeHtml(key)}"
    data-i18n-params="${escapeHtml(JSON.stringify(params))}"
  >${escapeHtml(t(key, params))}</i18n-text>`;
}


// essa função tem uma ideia parecida com a função text(),
// mas ela é usada pra traduzir atributos de elementos HTML
//
// por exemplo:
//
// placeholder de um input
// title de um botão
// aria-label
//
// ela também salva a chave da tradução em um data-i18n
// pra conseguir atualizar depois quando o idioma mudar
export function attr(attribute, key, params = {}) {

  return `${attribute}="${escapeHtml(t(key, params))}"
    data-i18n-${attribute}="${escapeHtml(key)}"
    data-i18n-${attribute}-params="${escapeHtml(
      JSON.stringify(params)
    )}"`;
}


// essa função é usada pra alterar textos que mudam durante o jogo
//
// por exemplo:
//
// pontuação
// mensagens de erro
// quantidade de jogadores
// contagem regressiva
// status da partida
//
// ela não muda só o texto.
// também guarda qual tradução está sendo usada naquele elemento,
// então se o jogador trocar de idioma depois, esse texto também muda
export function setText(element, key, params = {}) {

  // se o elemento não existir, para a função aqui
  // isso evita erro tentando mexer em um elemento inexistente
  if (!element) return;

  // salva qual chave de tradução esse elemento está usando
  element.dataset.i18n = key;

  // salva também os parâmetros usados na tradução
  element.dataset.i18nParams = JSON.stringify(params);

  // coloca o texto traduzido no elemento
  element.textContent = t(key, params);
}


// essa função é responsável por atualizar as traduções da página inteira
//
// normalmente ela é chamada quando o usuário troca de idioma
//
// em vez de precisar recriar todo o menu, lobby ou HUD,
// ela procura os elementos que têm data-i18n e troca apenas os textos
export function applyTranslations(scope = document) {

  // procura todos os elementos que tenham data-i18n
  // e atualiza o conteúdo de texto de cada um
  for (const element of scope.querySelectorAll("[data-i18n]")) {

    element.textContent = t(
      element.dataset.i18n,
      JSON.parse(element.dataset.i18nParams || "{}")
    );
  }


  // alguns textos não ficam dentro do elemento,
  // ficam em atributos como placeholder ou title
  //
  // então aqui eu percorro esses atributos separadamente
  for (const attribute of [
    "aria-label",
    "title",
    "placeholder",
    "content",
  ]) {

    // procura os elementos que possuem tradução nesse atributo
    for (
      const element of scope.querySelectorAll(
        `[data-i18n-${attribute}]`
      )
    ) {

      // pega qual chave de tradução está salva
      const key = element.getAttribute(
        `data-i18n-${attribute}`
      );

      // pega os parâmetros que foram salvos
      // se não tiver nenhum, usa um objeto vazio
      const params = JSON.parse(
        element.getAttribute(
          `data-i18n-${attribute}-params`
        ) || "{}"
      );

      // atualiza o atributo com a tradução do idioma atual
      element.setAttribute(
        attribute,
        t(key, params)
      );
    }
  }


  // muda o atributo lang da página
  // isso ajuda o navegador e também leitores de tela
  // a entender qual idioma está sendo usado
  document.documentElement.lang =
    language === "pt"
      ? "pt-BR"
      : "en";


  // muda também o título que aparece na aba do navegador
  document.title = t("app.title");


  // procura os botões usados pra trocar de idioma
  // e atualiza eles também
  for (
    const button of scope.querySelectorAll(
      "[data-language-toggle]"
    )
  ) {

    // atualiza bandeira e nome do idioma
    button.innerHTML = flagMarkup();

    // atualiza o texto usado por acessibilidade
    button.setAttribute(
      "aria-label",
      t("language.toggle")
    );

    // atualiza o texto que aparece quando passa o mouse por cima
    button.title = t("language.toggle");
  }
}


// essa função é usada quando o usuário realmente troca o idioma
//
// recebe "pt" ou "en",
// atualiza a variável language,
// salva no navegador e depois atualiza os textos da tela
export function setLanguage(nextLanguage) {

  // verifica primeiro se esse idioma existe
  // se alguém tentar passar um idioma inválido, não faz a troca
  if (!Object.hasOwn(dictionaries, nextLanguage)) {
    return false;
  }

  // atualiza o idioma atual
  language = nextLanguage;


  // tenta salvar a preferência do usuário no navegador
  // assim ela continua salva mesmo depois de fechar a página
  try {

    globalThis.localStorage?.setItem(
      STORAGE_KEY,
      language
    );

  } catch {

    // se não conseguir salvar no localStorage,
    // o idioma ainda funciona normalmente enquanto a página estiver aberta
  }


  // só tenta atualizar a página se o código estiver rodando no navegador
  // isso evita erro em ambientes onde document não existe
  if (typeof document !== "undefined") {
    applyTranslations();
  }

  // retorna true pra indicar que a troca deu certo
  return true;
}


// essa função monta a parte de dentro do botão de idioma
//
// ela escolhe qual bandeira mostrar dependendo do idioma atual
//
// português = bandeira do Brasil
// inglês = bandeira dos Estados Unidos
//
// também mostra o nome do idioma e a setinha de troca
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


// essa função cria o botão completo usado pra trocar o idioma
//
// data-language-toggle é importante porque é através dele
// que o código identifica que esse botão serve pra mudar a linguagem
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


// essa função inicia o sistema de idiomas
//
// ela deve ser chamada quando o jogo/site estiver iniciando
//
// basicamente ela:
//
// 1 - aplica as traduções atuais
// 2 - faz o botão de idioma funcionar
// 3 - sincroniza o idioma entre abas diferentes
export function initializeLanguage() {

  // já aplica a tradução certa assim que inicia
  applyTranslations();


  // aqui eu uso um evento de clique no document inteiro
  //
  // fiz dessa forma porque alguns elementos do jogo podem ser
  // criados e removidos várias vezes, como lobby, HUD e menus
  //
  // se colocasse o evento diretamente no botão,
  // ele poderia parar de funcionar quando o botão fosse recriado
  document.addEventListener("click", (event) => {

    // verifica se o elemento clicado ou algum elemento acima dele
    // possui o atributo data-language-toggle
    if (
      event.target.closest(
        "[data-language-toggle]"
      )
    ) {

      // se estiver em português, muda pra inglês
      // se estiver em inglês, volta pra português
      setLanguage(
        language === "pt"
          ? "en"
          : "pt"
      );
    }
  });


  // esse evento serve pra sincronizar o idioma entre abas
  //
  // por exemplo:
  // se tiver o jogo aberto em duas abas e mudar o idioma em uma,
  // a outra também vai perceber a alteração
  window.addEventListener("storage", (event) => {

    // verifica se o valor alterado no localStorage
    // foi justamente o idioma
    if (event.key === STORAGE_KEY) {

      // coloca o novo idioma
      // se o valor tiver sido apagado, volta pra português
      setLanguage(
        event.newValue || "pt"
      );
    }
  });
}
