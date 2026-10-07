# RAIVOLT — artes

Direção: arena elétrica em ciano, violeta e branco; metais azul-marinho, ciborgues de rosto humano e descargas conectadas. Nome criativo escolhido para esta revisão; não representa pesquisa de disponibilidade de marca.

Logo: `public/raivolt-logo.png`, criado com imagegen integrado, fundo transparente, 03/10/2026. Imagem social em `public/og.png`. Não usar o gerador de retratos para substituir o logo.

Prompt utilizado:

> Create a production-ready transparent background video game logo. Exact text RAIVOLT, spelled R A I V O L T, one line only, no subtitle. High-end arcade electric arena identity, aggressive custom angular italic lettering, very readable, chunky beveled titanium letterforms with brilliant icy white faces, cyan luminous edges, deep indigo dimensional extrusion, violet underside reflections. Integrate a sharp lightning slash into the letter V. A few controlled cyan electrical arcs tightly hugging the wordmark and short violet energy shards. Strong dramatic polished illustrated game branding, visually rich not a plain font. Wide horizontal composition, word fills image, transparent padding around outer glow, no background plate, no characters, no bombs, no existing franchise references. Asset intended for dark navy game UI.

Personagens: folha ilustrada criada com imagegen integrado, descrita em `docs/CYBORG-artes.md`; variantes e retratos derivados por `scripts/prepare-cyborgs.ps1`. Cargas continuam em Canvas. Raios em `client/render.js`. As paletas atualizadas são definidas em `client/identity.js` (fonte de verdade).

## Direção visual simplificada

Ciborgues com rosto humano, cabelo castanho e camisetas coloridas, braço mecânico e implante ocular. Formas contínuas e poucos detalhes; sem bobinas ou partículas decorativas. Personagens e retratos compartilham `drawCyborg` em `client/identity.js`.

## Arena elétrica

Piso fosco liso, com variação tonal mínima. Blocos fixos em aço azul, borda contínua e um pequeno indicador estático. Módulos destrutíveis em cobre dessaturado, dois painéis e uma trava central. A leitura depende de forma e contraste, não só de cor. Circuitos repetidos, parafusos, grades e pulsos no cenário foram retirados. O maior brilho fica nas cargas e descargas perigosas. Regras e colisões inalteradas.

## Refinamento pelas referências do usuário

Referências recebidas: `images.png` (proporções humanas, cabelo, camiseta, jeans e botas) e `26167692-desenho-animado-relampago-sprite-animacao-raio-vetor.jpg` (raio fino ramificado com halo ciano e fases de dissipação). Servem como orientação visual; os arquivos de referência não são redistribuídos no jogo. Personagens agora usam a folha ilustrada; raios continuam no Canvas.

Ciclo de caminhada: quatro quadros desenhados por direção distribuídos em oito intervalos, avanço vinculado à distância percorrida, alternância de braços, elevação dos pés e oscilação vertical discreta. Perfis laterais e costas próprios. O personagem Íon usa camiseta cinza-azulada e cabelo castanho; demais personagens preservam suas identidades.

Descarga: geometria determinística variável a 24 Hz, formação rápida, ramificações, halo ciano e dissipação baseada no TTL da simulação. Recorte por célula impede que o efeito invada casas seguras. O piso atingido mantém indicação durante toda a duração do perigo. Não houve mudança de duração, alcance ou dano.

Cenário: juntas suaves no piso, superfície rebaixada nos blocos de aço e bordas iluminadas nos módulos de cobre. Sem acrescentar circuitos ou luzes decorativas repetitivas.

## Acabamento ilustrado do cenário e das cargas

Paredes e módulos de cobre agora usam `public/arena-props.png`, junto às cargas cilíndricas com vidro luminoso ciano e alerta rosa. Fonte, recortes, integração e prompt estão em `docs/ARENA-artes.md`. Piso fosco com juntas suaves, sem novos circuitos decorativos. A arte geométrica anterior permanece apenas como alternativa de carregamento.
