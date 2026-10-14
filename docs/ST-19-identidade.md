# RAIVOLT — guia de identidade (ST-19)

Produto: **RAIVOLT**, por Luasoft. Manter essa grafia nos títulos, metadados, logos e materiais públicos. Os modos existentes continuam RAIVOLT e RAIVOLT Overdrive.

## Ciborgues

Ciborgue humano de cabelo castanho volumoso, olhos expressivos, camiseta sombreada, jeans e botas de couro. Antebraço mecânico e pequeno implante na têmpora. Oito variações de cor da roupa identificam os jogadores; esta versão compartilha rosto, cabelo e tom de pele. Sem capacetes, antenas ou partículas decorativas.

| Slot / avatar | Nome | Carcaça | Luz | Tema |
| --- | --- | --- | --- | --- |
| 1 | Íon | #637f83 | #65f5ff | Condutor principal |
| 2 | Ônix | #6950ad | #d8a0ff | Condutor de arena |
| 3 | Fluxo | #216eaa | #7abfff | Condutor de arena |
| 4 | Fagulha | #b54768 | #ff98ba | Condutor de arena |
| 5 | Dínamo | #b48d37 | #fff18a | Condutor de arena |
| 6 | Arco | #268d83 | #84ffd4 | Condutor de arena |
| 7 | Pulso | #8d51b4 | #f8a9ff | Reserva visual |
| 8 | Surto | #5f9238 | #c9ff80 | Reserva visual |

Há seis vagas de jogo; os oito arquivos históricos de avatar são mantidos. Nomes autorais aparecem junto ao status no lobby e no HUD; apelidos dos usuários continuam intactos.

## Carga de arco

Carga compacta em aço fosco, com uma única janela de energia ciano. Ao disparar, desenha raios ramificados entre as casas ativas, com halo ciano, ramificações finas e núcleo branco. A tintura sutil cobre a casa perigosa inteira. Alcance, duração, colisões e dano permanecem inalterados; IDs internos como `bomb`, `fire` e `blast` permanecem compatíveis com a simulação.

## Implementação e manutenção

`client/identity.js` define as paletas e chama o renderizador da folha ilustrada `client/cyborg-atlas.js`. A folha fonte `public/cyborg-master.png` foi criada com imagegen integrado usando a referência do usuário. Contém quatro quadros de frente, quatro de lado, quatro de costas e quatro de vitória. Esquerda usa espelhamento; a sequência percorre oito intervalos com quatro quadros desenhados e leve oscilação. Os pés mantêm a mesma âncora. A geometria antiga só é usada se uma imagem falhar ao carregar ou por ferramentas sem DOM.

`client/render.js` preserva proteção, queda, salto, lágrimas e malabarismo. Regenerar as variantes, recortes e avatares com `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/prepare-cyborgs.ps1`. O script detecta limites alfa, mantém o desenho e recolore a faixa da camiseta; o original não é sobrescrito. Nenhuma regra, colisão ou mensagem de rede foi alterada. Prompt completo em `docs/CYBORG-artes.md`.

Avatares, favicon e imagem social foram atualizados. Todas as telas usam o novo caminho `raivolt-logo.png`. Capturas em `docs/evidencias/st-16` são registros históricos, não assets de release; não reutilizar como divulgação atual. O endereço histórico do repositório no README permanece válido e não aparece na interface.

## Checklist obrigatório antes de cada release pública

Registrar versão/commit, data, responsável, evidências e pendências na revisão da release.

- [ ] Conferir nome RAIVOLT em PT/EN, título, acessibilidade, metadados e imagem social.
- [ ] Buscar nomes de franquias e nomes antigos em `client`, `public`, `index.html` e build; revisar texto dentro de imagens também.
- [ ] Inspecionar menu, lobby, arena nas quatro direções, derrota, vitória e empate; conferir todos os avatares.
- [ ] Conferir carga parada, alerta, chute, lançamento, malabarismo e ícones de itens.
- [ ] Conferir legibilidade em desktop/mobile e se a arte cabe nas células e canvases.
- [ ] Registrar autoria, origem e licença de novas imagens, fontes, músicas e efeitos. Áudio preexistente não teve sua procedência auditada pela ST-19.
- [ ] Rever semelhanças de silhueta, rosto, acessórios, paleta e nomes; registrar avaliação da marca RAIVOLT antes da divulgação. Redesenho não equivale a liberação jurídica do nome.
- [ ] Executar `npm test` e `npm run build`; publicar somente o build atualizado.
- [ ] Usar capturas atuais e não evidências históricas na divulgação.
- [ ] Bloquear release pública enquanto houver pendências de procedência ou revisão de marca.

## Verificação desta implementação

Revisão estática de textos da interface; inspeção dos PNGs do mascote e logo; testes de renderização de todos os slots e estados, cancelamento de animações e imutabilidade dos snapshots. Testes existentes cobrem física e regras. Abertura e galeria animada de personagens/raios inspecionadas no navegador; captura em `docs/raivolt-preview.png`. A revisão completa de uma partida e a auditoria de procedência do áudio permanecem etapas do checklist de release.

## Acabamento ilustrado do cenário e das cargas

Paredes e módulos de cobre agora usam `public/arena-props.png`, junto às cargas cilíndricas com vidro luminoso ciano e alerta rosa. Fonte, recortes, integração e prompt estão em `docs/ARENA-artes.md`. Piso fosco com juntas suaves, sem novos circuitos decorativos. A arte geométrica anterior permanece apenas como alternativa de carregamento.
