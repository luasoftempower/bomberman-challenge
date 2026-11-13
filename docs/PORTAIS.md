# ST-10 — Portais em terrenos específicos

Os portais são atalhos contextuais de algumas arenas do modo **Overdrive**.
Eles não alteram a codificação de paredes, caixas e piso do mapa: cada terreno
que oferece o recurso declara seus pares em metadados próprios.

## Terrenos habilitados

| Terreno | Pares | Conexões |
| --- | ---: | --- |
| Circuito esmeralda 6 | 1 | Noroeste ↔ sudeste |
| Plasma neon 4 | 1 | Nordeste ↔ sudoeste |
| Estação de carga 5 | 2 | Noroeste ↔ sudeste e nordeste ↔ sudoeste |

Os demais terrenos e todos os mapas personalizados continuam sem portais. O
servidor também remove qualquer campo `portals` recebido em um mapa
personalizado, evitando que um cliente injete destinos não validados.

## Regras de funcionamento

- Os dois pontos de um par usam a mesma letra e a mesma cor.
- As posições de origem e destino precisam estar dentro da arena, sobre piso
  livre, ser diferentes e formar uma ligação recíproca.
- Ao entrar no portal, o servidor reposiciona o jogador no centro do destino e
  encerra o movimento pendente.
- O destino precisa estar livre de parede, jogador (inclusive reserva de
  movimento), bomba, descarga elétrica e bloco de Sudden Death em queda.
- Se o destino estiver bloqueado, o jogador permanece na origem e o sistema
  tenta novamente enquanto ele continuar ali.
- Um bloqueio temporário impede o retorno instantâneo pelo portal de chegada.
  Depois que o jogador deixa a casa, aquele portal pode ser usado normalmente.
- A mudança de posição incrementa uma sequência autoritativa. O cliente usa
  essa sequência para saltar diretamente à nova posição, sem interpolar o
  personagem visualmente através das paredes.

## Comunicação visual

As cartas dos terrenos habilitados recebem o selo **PORTAIS**. Na partida, cada
ponto mostra sua letra no centro, pulsa na cor do par e produz uma expansão
breve tanto na origem quanto no destino quando ativado. A prévia do seletor de
mapas também desenha os pontos nas posições reais da arena.

## Cobertura de testes

`test/portals.test.js` verifica:

1. ativação exclusiva por terreno e adaptação às arenas quadrada e retangular;
2. pares recíprocos válidos e rejeição de posições sobrepostas, bloqueadas ou
   com destino igual à origem;
3. teleporte, limpeza do movimento e efeitos sincronizados no snapshot;
4. proteção contra retorno imediato e rearme após deixar o portal;
5. bloqueio por jogador, bomba, descarga, bloco em queda e parede;
6. remoção de metadados injetados em mapas personalizados;
7. reposicionamento instantâneo na reconciliação do cliente;
8. renderização do identificador visual dos pares sem mutar o snapshot.

Para executar somente a cobertura relacionada:

```bash
node --test test/portals.test.js test/maps.test.js test/netcode.test.js test/render.test.js
```

Os [prints e o checklist visual](evidencias/st-10/README.md) registram a
validação do seletor e de uma partida real no Circuito esmeralda 6.
