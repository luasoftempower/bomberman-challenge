# Ciborgues ilustrados — RAIVOLT

Atualização de 04/10/2026. A referência `images.png` enviada pelo usuário orientou cabelo, rosto, camiseta, jeans, botas e proporções. A folha foi criada pela ferramenta **imagegen integrada**. O original recebido não é distribuído como asset.

- Fonte com transparência: `public/cyborg-master.png` (1254 × 1254).
- Variantes de roupa: `public/cyborg-1.png` a `public/cyborg-8.png`.
- Avatares: `public/player-avatar-1.png` a `public/player-avatar-8.png`.
- Recortes medidos pelo canal alfa: `client/cyborg-atlas-data.js`.
- Integração de animações: `client/cyborg-atlas.js`.
- Preparação reproduzível: `scripts/prepare-cyborgs.ps1`.
- Prévia interativa: `docs/raivolt-preview.html`, via servidor de desenvolvimento.

A folha é organizada em quatro linhas: frente, direita, costas e vitória. Cada linha tem quatro quadros. A esquerda é espelhada. Oito intervalos do ciclo existente selecionam os quatro quadros desenhados e aplicam um pequeno movimento vertical. O tamanho permanece constante, com âncora nos pés; recortes não mudam colisões. Derrota mantém inclinação/lágrimas e nocaute mantém o corpo deitado. A variação atual é de roupa, com o mesmo rosto e cabelo para todos os slots.

O script de preparação mantém o original e sua transparência; extrai limites por célula, deriva variantes de cor da camiseta e produz retratos. Não executar o antigo exportador geométrico diretamente sobre os avatares. `generate-identity.ps1` já chama o novo preparador.

## Prompt final enviado ao imagegen

Create a production-ready game sprite sheet using the attached image as the main style and anatomy reference. Exactly 4 columns by 4 rows, sixteen equally sized cells, square overall canvas. Each character centered horizontally in its cell, same baseline, same scale, generous transparent gutters, never overlap cell borders. NO text, labels, grid lines or background. Row 1: front-facing walk cycle four successive poses. Row 2: facing RIGHT walk cycle four successive poses. Row 3: back-facing walk cycle four successive poses. Row 4: front-facing celebration four poses with raised arms. All sixteen sprites depict the SAME charming young adult male cyborg: tousled layered brown hair, expressive large blue human eyes, warm peach skin, muted teal short-sleeved shirt, navy blue fitted trousers, brown leather boots, subtle silver mechanical LEFT forearm and tiny cyan temple implant. Mostly human, no helmet, no giant armor, no antenna. VERY close to reference aesthetic: beautifully hand-pixeled indie RPG sprite, organic stepped silhouette, curved cheeks through careful pixel clusters, detailed flowing hair, soft cloth folds, thoughtfully placed highlights. Avoid rigid rectangular faces, square torsos, stick limbs, crude primitive rectangles, uniform slabs of color. Character roughly 2.8 heads tall like reference. Pixel art consistent pixel sizes, polished shading using restrained palette, charming warm human character. Each sprite full body, facing exactly its row's direction, natural bent knees and arms in four-frame walking cycle. Technical: square 1024x1024 canvas, exact 256x256 cells, sprite in each cell occupies centered inner 160x224 area, head around y=16 and boots end around y=240 within each cell. True alpha transparent background.

O tamanho retornado foi 1254 × 1254; o integrador mede as células da imagem real, sem assumir o tamanho solicitado.
