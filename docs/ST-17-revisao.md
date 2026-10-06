# ST-17 — Legenda lateral de poderes

A partida Super exibe o componente `client/components/power-legend.js` na barra lateral, fora da arena. Em telas pequenas ele começa recolhido e pode ser expandido por toque ou teclado. O clássico não mostra a legenda porque não oferece itens.

A lista acompanha os snapshots do jogador local: melhorias de bomba, fogo e velocidade são reconhecidas pelos atributos da simulação; habilidades usam seus estados atuais. O colete desaparece ao expirar e a eliminação limpa a lista. Fogo cheio substitui a entrada de fogo comum e considera as dimensões reais da arena.

Remoto mostra E e o botão REMOTO; luva mostra Q e o botão LUVA. Chute explica o movimento contra uma bomba, pois a mecânica atual não exige uma tecla adicional. Todos os textos do componente usam as traduções PT/EN da ST-16, inclusive quando o idioma muda durante a partida.

## Validação

- `node --test`: 72 testes passaram, incluindo coleta dos dez itens, expiração, eliminação, nova rodada, fogo cheio na arena maior e instruções em ambos os idiomas.
- `npm run build`: passou.
- Prévia visual conferida em desktop, 390 × 844 e 844 × 390; expansão e troca de idioma verificadas no navegador.

## Revisão manual

Execute `npm run dev` e abra `http://localhost:3000/test/power-legend-preview.html`. A prévia usa a simulação, o renderizador e o componente reais com poderes já ativos. Os botões permitem expirar o colete, eliminar o jogador e trocar PT/EN. Esta página de teste não faz parte do build de produção.

Para conferir a integração, crie uma sala no jogo, selecione Super Bomberlan, inicie a partida e colete itens. A lista deve exibir somente os poderes do seu personagem, preservando a expansão escolhida enquanto os snapshots chegam.
