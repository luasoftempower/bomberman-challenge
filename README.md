<p align="center">
  <img src="public/bomberlan-logo-transparent.png" alt="Logo do Bomberlan" width="450">
</p>

<p align="center">
  <strong>Um jogo multiplayer inspirado nos clássicos de arena com bombas, visual pixelado e partidas rápidas para até quatro jogadores.</strong>
</p>

---

## 🎮 Sobre o Projeto

O **Bomberlan** é um protótipo de jogo online em tempo real. Crie uma sala, compartilhe o código com seus amigos e dispute para ser o último sobrevivente. 

As vagas livres são preenchidas automaticamente por **bots inteligentes** capazes de navegar pelo mapa, destruir caixas, fugir de explosões e enfrentar outros jogadores. 

### ⚙️ Arquitetura de Rede
* **Servidor Autoritativo:** O servidor controla a partida por completo e valida movimentos, colisões, bombas e explosões para evitar trapaças.
* **Previsão no Cliente (Client-side Prediction):** O cliente usa previsão visual limitada para manter o personagem responsivo e sem atrasos, sem perder a sincronização online.

---

## ✨ Principais Recursos

- 🌐 **Salas Online:** Criação de partidas privadas com código compartilhável.
- 🤖 **Bots Avançados:** IA com planejamento de rotas, previsão de explosões e fuga segura.
- 🎲 **Mapas Randômicos:** Arena e distribuição de caixas geradas aleatoriamente a cada rodada.
- 🧱 **Mecânicas Clássicas:** Movimento pixel-perfeito de casa em casa (estilo 16 bits) e reação em cadeia de bombas.
- 🎨 **Pixel Art:** Personagens, arenas, menus, contagem regressiva e telas de vitória totalmente animados.
- 📱 **Controles Híbridos:** Suporte completo para teclado e dispositivos com tela sensível ao toque.
- 🔌 **Tempo Real:** Comunicação via WebSocket usando arquitetura autoritativa.
- ⏱️ **Dois Modos:** Bomberlan clássico (1:30, sem itens) e Super Bomberlan (3:00, power-ups e Sudden Death).
- 💥 **Dez Power-ups:** Fogo, Bomba, Patins, Controle Remoto, Luva, Chute, Passagem de Bomba, Passagem de Bloco, Colete e Fogo Cheio.

---

## 🕹️ Controles

| Ação | Teclado | Telas Touch |
| :--- | :--- | :--- |
| **Movimentar** | `WASD` ou Setas Direcionais | Direcional na Tela |
| **Colocar Bomba** | `Espaço` | Botão Virtual |
| **Detonar Bomba Remota** | `E` | Botão Remoto |
| **Arremessar com a Luva** | `Q` | Botão Luva |

> **Objetivo:** Sobreviver às explosões, eliminar seus oponentes e ser o último jogador vivo na arena!

---

## 🛠️ Tecnologias Utilizadas

- **Linguagem:** JavaScript moderno com módulos ES.
- **Backend:** Node.js, Express e biblioteca `ws` (WebSockets).
- **Frontend:** HTML5 Canvas 2D para renderização de alta performance.
- **Ferramental:** Vite para desenvolvimento ágil e build de produção.
- **Testes:** Módulo nativo `node:test` (sem dependências externas de teste).

---

## 🚀 Como Executar Localmente

### Pré-requisitos
* Node.js `22` ou superior.
* pnpm `11` ou superior.

### 1. Clonar e Instalar
```bash
# Clone o repositório
git clone https://github.com/luasoftempower/bomberman-challenge.git

# Acesse a pasta do projeto
cd bomberman-challenge

# Instale as dependências
pnpm install
```

### 2. Iniciar em Modo de Desenvolvimento
```bash
pnpm dev
```
Após iniciar, abra **[http://localhost:3000](http://localhost:3000)** no seu navegador.

---

## 🐳 Executando com Docker

Se preferir rodar o projeto em um ambiente isolado via Docker, utilize os comandos abaixo:

```bash
# Construir a imagem do container
docker build -t bomberlan .

# Executar o container
docker run --rm -p 3000:3000 -e PUBLIC_ORIGIN=http://localhost:3000 bomberlan
```

---

## 🧪 Testes e Build de Produção

### Rodar Testes Automatizados
```bash
pnpm test
```

### Gerar e Executar o Build de Produção
```bash
# Compilar o frontend e preparar os arquivos
pnpm build

# Iniciar o servidor de produção
pnpm start
```

> 💡 O projeto já inclui um arquivo `render.yaml` pronto para implantação automática na plataforma **Render**.

---

## 📂 Estrutura do Projeto

```text
├── client/          # Interface, controles, Canvas e animações visuais
├── public/          # Assets estáticos (logos, avatares e sprites)
├── server/          # Servidor HTTP, WebSocket e gerenciamento de salas
├── shared/          # Regras de negócio, constantes e a IA dos bots
└── test/            # Suíte de testes (salas, física, bombas e IA)
```

---

## 🌐 Idiomas (ST-16)

O jogador pode alternar entre **Português e Inglês** sem recarregar a página ou reiniciar a partida. O controle aparece na abertura, no menu principal, no lobby, na partida e no resultado.

A ideia é deixar essa escolha fácil de encontrar: no computador, basta clicar no idioma ao lado do nome; no celular, a opção fica dentro de um menu pequeno para ocupar menos espaço. A troca muda os textos da interface, mas mantém o que o jogador já digitou.

- **Desktop (acima de 680px):** um botão arredondado em formato de pill mostra a bandeira e o nome do idioma atual, **Português** ou **English**. Um clique alterna o idioma diretamente.
- **Mobile (até 680px):** o botão quadrado de três traços abre um painel compacto com a opção de idioma. As linhas se transformam em X ao abrir.
- **Bandeiras em pixel art:** Brasil para Português e Estados Unidos para Inglês, mantendo a identidade visual do jogo.
- **Preferência persistida:** o idioma escolhido é salvo na chave `blast-language` do `localStorage` e recuperado nas próximas visitas.
- **Atualização imediata:** textos, dicas e rótulos acessíveis acompanham a troca; nomes de jogadores, códigos de sala e valores digitados são preservados.
- **Navegação por teclado:** no mobile, Esc fecha o painel e devolve o foco ao botão. As opções ocultas não recebem foco. Ao alternar entre os tamanhos de tela, o painel fecha e o foco passa ao controle visível, se estava no menu.

### Organização do código

Os dicionários e a lógica de tradução continuam separados da interface. A página inicial foi dividida em componentes menores, com HTML indentado, para facilitar a leitura e a manutenção.

| Arquivo | Responsabilidade |
| --- | --- |
| `client/i18n/pt.js` e `client/i18n/en.js` | Textos dos dois idiomas, identificados pelas mesmas chaves. |
| `client/i18n/index.js` | Tradução, atualização dos textos e persistência da preferência. |
| `client/settings-menu.js` | Pill do desktop, menu mobile e eventos de abertura e fechamento. |
| `client/settings-menu.css` | Aparência dos controles, animações e regras responsivas. |
| `client/components/landing.js` | Composição da página inicial: cabeçalho, perfil, formulário de sala, arte e rodapé. |
| `client/components/menu-intro.js` | Marcação da abertura e sequência das animações. |
| `client/components/brand.js` | Logo reutilizado nas telas. |
| `client/utils/html.js` | Escape de caracteres especiais antes da inserção de valores no HTML. |
| `client/utils/format-time.js` | Formatação do tempo da partida. |
| `client/main.js` | Integração dos componentes com os eventos, as salas e o estado do jogo. |

O mesmo conteúdo do botão de criar sala é reutilizado na montagem inicial e na recuperação após um erro. O utilitário de escape de HTML também é compartilhado, evitando duplicação entre a interface e as traduções.

Veja o [guia do sistema de idiomas](client/i18n/README.md) para entender o fluxo e adicionar traduções.

Os [prints comentados da ST-16](docs/evidencias/st-16/README.md) mostram como a página inicial, o perfil, a abertura e o controle de idioma foram organizados. Os arquivos também têm comentários em português explicando as decisões e o papel de cada parte.

### Como conferir os ajustes

1. Execute `pnpm dev` e abra [localhost:3000](http://localhost:3000).
2. Na página inicial, digite um nome e um código de sala. No desktop, clique na pill e confira a troca dos textos sem alteração dos campos.
3. Use a visualização responsiva do navegador com largura de 390px. Abra o menu de três traços e alterne o idioma pelo painel.
4. Recarregue a página e confira se o idioma escolhido foi mantido.
5. Crie uma sala e verifique a troca no lobby, preservando o nome do jogador e o código da sala.

Na validação local dos ajustes da revisão, os **55 testes automatizados passaram**, o **build de produção foi concluído** e os fluxos de desktop, mobile, teclado e criação de sala foram conferidos no navegador. O teste de chaves de tradução também verifica os componentes extraídos.

## 📈 Estado Atual e Contribuições

Este projeto é um **protótipo jogável em desenvolvimento ativo**. Sugestões, relatórios de bugs, testes de estresse e contribuições via Pull Requests são extremamente bem-vindos!

---

## 📄 Licença

Consulte o arquivo [LICENSE](LICENSE) para conhecer os termos de uso e direitos autorais do projeto.
