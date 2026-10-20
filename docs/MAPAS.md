# Mapas e Map Studio

No lobby de **RAIVOLT Overdrive (modo Super)**, o anfitrião escolhe o mapa da próxima rodada. Os convidados veem a seleção e não podem alterá-la.

## Mapas padrão

- **Reator original:** mantém a arte e a geração aleatória existentes.
- **Plasma neon:** seis variações com módulos multicoloridos.
- **Circuito esmeralda:** seis variações de circuitos verdes com blocos lima.
- **Fornalha de plasma:** seis variações de módulos âmbar e paredes cobre.
- **Jardim de íons:** seis variações de jardins energéticos verdes.
- **Templo voltaico:** seis variações de piso rubro, paredes douradas e módulos ciano.
- **Estação de carga:** seis variações de campos verdes e módulos de carga.

A coleção tem **37 mapas padrão**: o original e 36 adaptações das referências, em seis famílias com seis variações cada. As arenas mantêm o tema de energia do Raivolt; os padrões de blocos são adaptados para as dimensões do jogo, sem reutilizar as imagens como texturas.

Todos os mapas padrão usam a arena 13 × 11 para até quatro participantes e a arena 23 × 15 para cinco ou seis, com posições iniciais seguras.

## Seleção compacta no lobby

O lobby tem apenas três opções:

- **Padrão:** seleciona o mapa original.
- **Aleatório:** sorteia um dos 37 mapas padrão no servidor ao iniciar cada partida, incluindo as revanches. Um sorteio pode repetir o mapa anterior; mapas personalizados não entram no sorteio.
- **Escolher mapa:** abre uma janela separada com previews, filtros por família e a biblioteca pessoal. Clicar em um mapa o seleciona e fecha a janela. Convidados podem consultar a coleção, mas somente o anfitrião pode selecionar, editar ou criar.

O botão **Criar mapa** fica dentro dessa janela. A coleção não ocupa espaço no lobby. Todos os jogadores recebem a mesma seleção e o mesmo mapa sorteado.

## Editor

Dentro de **Escolher mapa**, **Criar mapa** abre o Map Studio. É possível escolher qualquer um dos 37 modelos, dar um nome de até 32 caracteres, mudar a atmosfera, pintar paredes, blocos destrutíveis ou piso e usar seis cores de energia. Clique ou arraste para pintar; Tab e Espaço permitem editar pelo teclado. Desfazer e refazer funcionam por traço de pintura.

Mapas personalizados sempre têm 23 × 15 células e seis posições iniciais fixas, mesmo quando a sala tem menos participantes. A borda, as posições iniciais e suas saídas são protegidas. A validação exige que todas as células jogáveis se conectem, considerando que os blocos destrutíveis podem ser removidos durante a partida. Paredes não podem fechar áreas isoladas.

**Salvar e usar na sala** salva o mapa na biblioteca deste navegador e o seleciona para a sala. A biblioteca permite até 12 mapas, com edição e exclusão. Não existe conta ou armazenamento em nuvem: limpar os dados do navegador remove a biblioteca. Excluir da biblioteca não apaga o mapa já enviado à sala.

Ao selecionar um mapa personalizado, sua configuração é enviada ao servidor e compartilhada no lobby e na partida. Nenhum convidado precisa baixar ou cadastrar o mapa. A seleção permanece nas revanches. No modo Clássico o servidor sempre usa o mapa original; ao voltar ao Super, a seleção anterior é restaurada.

## Implementação e validação

- `shared/maps.js`: modelos, paletas, células protegidas e validação usada no cliente e no servidor.
- `server/room.js`: autorização do anfitrião, seleção e sincronização da sala.
- `client/components/map-picker.js`: menu compacto, janela da coleção, seleção e biblioteca.
- `client/components/map-studio.js`: editor visual.
- `client/map-art.js`: arte em pixels desenhada por Canvas, compartilhada entre previews e arenas.
- `client/render.js`: cache estático inclui tema e cores, evitando redesenhar toda a arena a cada frame.
- `test/maps.test.js`: arenas para 4/5/6 participantes, validação, permissões, modo Clássico e persistência.

Execute `npm test` e `npm run build` para verificar. Para experimentar, execute `npm run dev`, crie uma sala e selecione **Overdrive**.

O comando `npm run dev` reinicia automaticamente o servidor quando os módulos do servidor ou da simulação mudam. Se o jogo já estava rodando antes desta atualização, encerre essa execução antiga uma vez e execute o comando novamente. Atualizar apenas a página não atualiza o processo Node que controla as salas.
