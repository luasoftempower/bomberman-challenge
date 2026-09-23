# ST-16 — Respostas à revisão e roteiro de prints

Rascunhos para responder aos comentários da revisão e preparar o post da ST-16. As respostas abaixo são sugestões de texto; não são publicadas automaticamente. Os prints usados na documentação estão em [evidências da ST-16](evidencias/st-16/README.md).

## 1. Pill no desktop e menu de três traços no mobile

> Ajustado! No desktop, deixei uma pill com a bandeira e o nome do idioma atual, “Português” ou “English”, que faz a troca com um clique. O menu de três traços aparece apenas no mobile, em telas de até 680px, com a opção de idioma dentro do painel compacto. Mantive as cores do Bomberlan e as bandeiras em pixel art.

## 2. Extrair utilitários e dividir a página inicial

> Separei a página inicial em componentes menores. O `landing.js` reúne funções para o cabeçalho, perfil, formulário de sala, arte e rodapé; a abertura e o logo ficaram em arquivos próprios. Também extraí o escape de HTML e a formatação do tempo para `client/utils/`. Assim, o `main.js` ficou responsável pela integração com os eventos e o estado do jogo, e removi trechos duplicados.

## 3. Organizar o trecho do perfil e do cabeçalho

> Organizei esse trecho nas funções `playerProfile()` e `landingHeader()`, dentro de `client/components/landing.js`. O HTML agora está indentado, com os elementos e atributos separados em linhas, para facilitar a leitura. O nome do jogador continua sendo tratado como dado do usuário, sem ser traduzido.

## 4. Organizar o trecho da abertura

> Extraí a abertura para `client/components/menu-intro.js`. Separei o HTML em `menuIntro()` e os eventos e temporizadores em `initializeMenuIntro()`, mantendo a sequência da animação. No `main.js`, ficaram apenas as chamadas que integram esse componente à página.

## Texto geral para acompanhar a atualização do PR

> Apliquei os ajustes da revisão da ST-16: pill com troca direta de idioma no desktop e menu compacto de três traços no mobile. Também dividi a página inicial em componentes, organizei a indentação do HTML e centralizei os utilitários compartilhados. Atualizei o README com a estrutura dos arquivos e o roteiro de verificação. Na validação local, os 55 testes passaram e o build foi concluído. Conferi no navegador a troca PT/EN, a preservação dos campos, a preferência salva, o teclado e a criação de sala.

## Onde tirar os prints

Use a versão local em `http://localhost:3000` para capturar as alterações desta branch. Enviar o PR não atualiza por si só o site hospedado: isso depende do fluxo de merge e implantação do projeto. Clique em **Iniciar** e aguarde a abertura terminar para capturar o menu principal.

Os quatro primeiros prints mostram o resultado visual. Os dois últimos são opcionais para explicar a organização do código.

| Print | Onde e como preparar | O que deve aparecer | Legenda sugerida |
| --- | --- | --- | --- |
| 1. Desktop em Português | Página inicial, largura de aproximadamente 1280px. Se necessário, clique na pill até aparecer “Português”. | Cabeçalho com perfil e pill, bandeira do Brasil e textos principais em PT. | Desktop: troca de idioma com um clique pela pill ao lado do nome. |
| 2. Desktop em Inglês | Na mesma tela, clique na pill. Mantenha o mesmo enquadramento. | Bandeira dos EUA, “English” e textos principais traduzidos. Digite antes um nome como “Jogador VIVO” e o código “ABC234” para mostrar que os campos permanecem iguais. Não é necessário entrar nessa sala. | Interface em Inglês, preservando o nome e o código digitados. |
| 3. Mobile com menu fechado | Abra as ferramentas do navegador, ative o modo de dispositivo e use 390 × 844px. | Cabeçalho com o botão de três traços ao lado do nome, sem pill de desktop. | Mobile: acesso às opções pelo botão compacto de três traços. |
| 4. Mobile com menu aberto | Na mesma largura, clique nas três linhas. | Botão transformado em X e painel com bandeira e nome do idioma, sem cortes no texto. | Painel compacto com troca de idioma e animação de abertura. |
| 5. Página inicial dividida em componentes | No editor, abra `client/components/landing.js` e procure `export function landingMarkup`. | Função que compõe a tela chamando abertura, cabeçalho, formulário, arte e rodapé. | Página inicial organizada em funções menores e com responsabilidades claras. |
| 6. HTML organizado | No editor, abra `client/components/landing.js` em `playerProfile()` ou `client/components/menu-intro.js` em `menuIntro()`. | Um trecho legível, com as tags e os atributos indentados. | HTML extraído e indentado conforme a revisão. |

No Chrome ou Edge, abra as ferramentas com **F12** e ative a barra de dispositivos com **Ctrl + Shift + M**. Selecione o modo responsivo e informe 390 × 844. Para voltar ao desktop, desative a barra de dispositivos e feche as ferramentas. No Windows, **Win + Shift + S** permite recortar a área desejada.

Para os prints de código, mostre o nome do arquivo na aba do editor e aumente o zoom até o texto ficar legível. Não é necessário capturar o arquivo inteiro.

## Evidências extras, se pedirem

- **Persistência:** escolha English, recarregue a página e capture a abertura ainda em Inglês. Uma gravação curta mostra melhor a sequência de troca e recarga.
- **Lobby:** crie uma sala e capture o controle de idioma junto ao nome do jogador e ao código da sala. Compare PT/EN para mostrar que esses dados não mudam.
- **Testes:** execute `pnpm test` e capture o resumo com 55 testes aprovados e nenhuma falha. Capture também a conclusão de `pnpm build` se quiser anexar a validação técnica.

## Texto curto para o post

> Atualização da ST-16 no Bomberlan: o controle de idioma agora se adapta ao tamanho da tela. No desktop, a pill mostra “Português” ou “English” e permite trocar com um clique; no mobile, a opção fica em um menu compacto de três traços. A preferência continua salva no navegador, e os textos mudam sem recarregar a página. Também reorganizei a página inicial em componentes e utilitários para facilitar a leitura e a manutenção do código. Ajustes validados localmente com 55 testes aprovados e build concluído.
