# ST-16 — Idiomas Português e Inglês

O sistema não precisa de bibliotecas externas. Ele tem duas partes: os textos e as funções que escolhem qual texto mostrar.

## Onde está cada parte

| Arquivo | Responsabilidade |
| --- | --- |
| `pt.js` | Dicionário de textos em Português. |
| `en.js` | As mesmas chaves, com textos em Inglês. |
| `index.js` | Idioma atual, tradução, atualização da interface e persistência. |
| `language.css` | Aparência da bandeira e dos textos do idioma. |
| `../settings-menu.js` | Menu reutilizável: abertura, fechamento e espaço para novas opções. |
| `../settings-menu.css` | Botão quadrado, animações e painel compacto. |
| `../../../public/flags/` | Bandeiras desenhadas numa grade de pixels em SVG. |

As bandeiras ficam em `public/flags/` na raiz do projeto. A bandeira do Brasil acompanha o nome Português; a dos Estados Unidos acompanha English. O painel usa uma única linha compacta com bandeira, nome e seta de troca. O rótulo acessível informa o idioma atual e qual será selecionado ao clicar.

## Como explicar o fluxo

1. Ao abrir o jogo, `index.js` lê `blast-language` no `localStorage`. Sem uma escolha válida, usa Português.
2. Cada texto possui uma chave, como `menu.create`. Essa chave existe em `pt.js` e em `en.js`.
3. `t("menu.create")` consulta o dicionário do idioma atual e devolve a frase.
4. `text("menu.create")` gera a frase junto com sua chave no atributo `data-i18n`. Assim, o sistema lembra qual tradução aquele trecho usa.
5. O botão de três traços abre o menu de opções. Dentro dele, o clique na bandeira chama `setLanguage()`: troca o idioma, salva a preferência e executa `applyTranslations()`.
6. `applyTranslations()` atualiza os textos e os rótulos acessíveis na página. Os campos, o canvas, os eventos e os temporizadores da partida continuam os mesmos.

O elemento `i18n-text` usa `display: contents`: ele identifica o texto traduzível sem criar uma caixa extra no layout. As telas novas usam o idioma atual desde a montagem. A escolha também é sincronizada entre abas pelo evento `storage`.

## Como adicionar outra opção ao menu

Em `client/settings-menu.js`, acrescente um botão com a classe `settings-menu-item` dentro de `settings-menu-panel`, ao lado da chamada `languageButton()`. Use as funções de tradução nos textos e acrescente o evento da nova ação em `initializeSettingsMenu()`.

O menu alterna a classe `is-open`. O CSS transforma as três linhas em X e anima o painel. Clicar fora, sair pelo teclado ou pressionar Esc fecha o painel; Esc devolve o foco ao botão. O painel fechado usa `inert` para impedir cliques e foco em opções ocultas. A troca de idioma mantém o menu aberto para mostrar a bandeira e o texto atualizados.

## Como adicionar um texto

Adicione a mesma chave nos dois dicionários:

```js
// pt.js
"instructions.goal": "Seja o último sobrevivente."
// en.js
"instructions.goal": "Be the last survivor."
```

Na tela, importe a função e use a chave:

```js
import { text, attr, setText } from "./i18n/index.js";

const markup = `<p>${text("instructions.goal")}</p>`;
const input = `<input ${attr("placeholder", "menu.namePlaceholder")} />`;
setText(document.querySelector("#alive-count"), "match.aliveMany", { count: 3 });
```

Use `text()` dentro de HTML, `attr()` para `title`, `placeholder` e `aria-label`, e `setText()` para atualizar uma mensagem de um elemento já montado. `t()` retorna uma string simples, útil fora do HTML, mas não registra um elemento para atualização automática.

## Textos dinâmicos

```js
text("result.winnerDescription", { name: winner.name });
text("common.room", { code: player.roomCode });
```

Os dicionários contêm `{name}` ou `{code}`. Apenas a frase é traduzida; o parâmetro é inserido literalmente. Os helpers escapam HTML para que um nome com caracteres especiais seja mostrado como texto. Nomes já digitados ou salvos não mudam junto com o idioma.

Mensagens de erro usam o código estável recebido do servidor, como `ROOM_FULL`, para escolher uma tradução local. As instruções atuais estão no rodapé do menu e no painel de controles da partida; os nomes dos poderes aparecem nas dicas do HUD.

## Verificação

`pnpm test` executa os testes do jogo e de idiomas. Os testes de idiomas verificam chaves e parâmetros nos dois dicionários, persistência, preferência inválida, armazenamento bloqueado e proteção de nomes/códigos. `pnpm build` gera a versão de produção.

Para demonstrar: digite um nome e um código no menu, troque PT/EN e observe que os campos ficam intactos. Reabra a página para conferir a preferência. No lobby ou na partida, troque novamente: os textos mudam sem reiniciar o jogo.
