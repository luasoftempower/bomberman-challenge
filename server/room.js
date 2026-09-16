import { randomBytes } from "node:crypto";
import { decideBotInput } from "../shared/bots.js";
import {
  GAME_MODES,
  ROOM_CAPACITY,
  TICK_RATE,
} from "../shared/constants.js";

import {
  createMatch,
  createSuddenDeathOrder,
  dropDeathBlock,
  snapshot,
  step,
} from "../shared/sim.js";

// ============================================================
// CONFIGURAÇÕES DA SALA
// ============================================================

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const MATCH_COUNTDOWN_MS = 4420;
const NETWORK_RATE = 30;
const SNAPSHOT_INTERVAL_MS = 1000 / NETWORK_RATE;
const MAX_SNAPSHOT_BACKLOG_BYTES = 16 * 1024;
const MAX_CATCH_UP_STEPS = 8;

// ============================================================
// DIREÇÕES
// ============================================================

const DIRECTION_VECTORS = {
  left: {
    dx: -1,
    dy: 0,
  },

  right: {
    dx: 1,
    dy: 0,
  },

  up: {
    dx: 0,
    dy: -1,
  },

  down: {
    dx: 0,
    dy: 1,
  },
};

// ============================================================
// TEMPOS DA PARTIDA
// ============================================================

export const MATCH_DURATION_MS = 90_000;
export const SUPER_MATCH_DURATION_MS = 180_000;
export const SUDDEN_DEATH_REMAINING_MS = 45_000;
export const DEATH_BLOCK_INTERVAL_MS = 500;

// ============================================================
// CONFIGURAÇÕES DOS BOTS
// ============================================================

const BOT_DIFFICULTIES = new Set([
  "easy",
  "normal",
  "hard",
]);

const BOT_PROFILES = {
  easy: {
    minDelay: 240,
    maxDelay: 390,
    urgentDelay: 55,
  },

  normal: {
    minDelay: 90,
    maxDelay: 180,
    urgentDelay: 1000 / TICK_RATE,
  },

  hard: {
    minDelay: 45,
    maxDelay: 85,
    urgentDelay: 1000 / TICK_RATE,
  },
};

// ============================================================
// FUNÇÕES AUXILIARES
// ============================================================

/**
 * Gera o código de 6 caracteres utilizado pela sala.
 */
export function makeCode() {
  const bytes = randomBytes(6);

  return [...bytes]
    .map(
      (byte) =>
        CODE_ALPHABET[
          byte % CODE_ALPHABET.length
        ],
    )
    .join("");
}

/**
 * Envia uma mensagem para um jogador conectado.
 */
const send = (
  socket,
  message,
  volatile = false,
) => {
  if (socket?.readyState !== 1) {
    return false;
  }

  if (
    volatile &&
    (socket.bufferedAmount || 0) >
      MAX_SNAPSHOT_BACKLOG_BYTES
  ) {
    return false;
  }

  socket.send(
    JSON.stringify(message),
  );

  return true;
};

// ============================================================
// CLASSE ROOM
// ============================================================

export class Room {
  constructor(code, hostToken) {
    this.code = code;
    this.hostToken = hostToken;

    this.hostId = null;

    this.phase = "lobby";

    /*
     * A quantidade máxima de jogadores é definida
     * por ROOM_CAPACITY em shared/constants.js.
     *
     * Para a nova versão:
     *
     * ROOM_CAPACITY = 6
     *
     * Portanto serão criados apenas os slots:
     * 0, 1, 2, 3, 4 e 5.
     */
    this.slots = Array.from(
      {
        length: ROOM_CAPACITY,
      },
      (_, slot) => ({
        slot,
        kind: "empty",
      }),
    );

    this.inputs = {};
    this.inputSequences = {};
    this.directionSequences = {};

    this.botPlans = {};

    this.state = null;

    this.startsAt = 0;
    this.endsAt = 0;

    this.endAnnounced = false;
    this.endReason = null;

    this.trophies = new Map();

    this.botDifficulty = "normal";

    this.gameMode = GAME_MODES.CLASSIC;

    this.suddenDeathQueue = [];
    this.nextDeathBlockAt = 0;

    this.emptySince = null;

    this.nextSimulationAt = 0;
    this.nextSnapshotAt = 0;
  }


  // ==========================================================
  // JOGADORES
  // ==========================================================

  /**
   * Retorna quantos jogadores humanos
   * estão conectados na sala.
   */
  humanCount() {
    return this.slots.filter(
      (slot) =>
        slot.kind === "human" &&
        slot.socket?.readyState === 1,
    ).length;
  }


  /**
   * Adiciona um jogador humano à sala.
   */
  addHuman(
    socket,
    {
      name,
      hostToken,
    },
  ) {
    if (this.phase !== "lobby") {
      return {
        error: {
          code: "MATCH_IN_PROGRESS",
          message:
            "Esta partida já começou.",
        },
      };
    }

    /*
     * Procura um dos slots disponíveis.
     *
     * Como this.slots possui ROOM_CAPACITY posições,
     * quando ROOM_CAPACITY = 6 o sétimo jogador
     * não encontrará uma vaga.
     */
    const open = this.slots.find(
      (slot) =>
        slot.kind === "empty",
    );

    if (!open) {
      return {
        error: {
          code: "ROOM_FULL",
          message:
            "Esta sala está cheia. Crie outra sala e convide sua equipe.",
        },
      };
    }

    const id =
      randomBytes(8).toString(
        "hex",
      );

    const cleanName =
      String(name || "Jogador")
        .trim()
        .slice(0, 16) ||
      "Jogador";

    Object.assign(open, {
      id,
      name: cleanName,
      kind: "human",
      ready: false,
      socket,
    });

    if (
      !this.hostId ||
      hostToken === this.hostToken
    ) {
      this.hostId = id;
    }

    this.emptySince = null;

    this.inputs[id] = {
      dx: 0,
      dy: 0,
      drop: false,
      detonate: false,
      special: false,
    };

    this.inputSequences[id] = -1;

    this.directionSequences[id] = -1;

    this.trophies.set(
      id,
      0,
    );

    send(socket, {
      type: "joined",
      playerId: id,
      slot: open.slot,
      roomCode: this.code,
      isHost:
        id === this.hostId,
    });

    this.broadcastLobby();

    return {
      id,
    };
  }


  // ==========================================================
  // COMUNICAÇÃO
  // ==========================================================

  /**
   * Envia uma mensagem para todos
   * os jogadores humanos.
   */
  broadcast(message) {
    const volatile =
      message.type === "snapshot";

    for (const slot of this.slots) {
      if (slot.kind === "human") {
        send(
          slot.socket,
          message,
          volatile,
        );
      }
    }
  }


  /**
   * Dados enviados para montar o lobby.
   */
  lobbyPayload() {
    return {
      type: "lobby",

      hostId: this.hostId,

      botDifficulty:
        this.botDifficulty,

      gameMode:
        this.gameMode,

      slots: this.slots.map(
        ({
          slot,
          id,
          name,
          ready,
          kind,
        }) => ({
          slot,
          id,
          name,

          ready:
            Boolean(ready),

          kind,

          trophies:
            this.trophies.get(id) ||
            0,
        }),
      ),
    };
  }


  /**
   * Dados utilizados na classificação
   * depois da partida.
   */
  standingsPayload() {
    return this.slots
      .filter(
        (slot) =>
          slot.kind !== "empty",
      )
      .map(
        ({
          slot,
          id,
          name,
          kind,
        }) => ({
          slot,
          id,
          name,
          kind,

          trophies:
            this.trophies.get(id) ||
            0,
        }),
      );
  }


  /**
   * Atualiza o lobby para todos.
   */
  broadcastLobby() {
    this.broadcast(
      this.lobbyPayload(),
    );
  }


  // ==========================================================
  // CONFIGURAÇÕES DO LOBBY
  // ==========================================================

  setReady(
    playerId,
    ready,
  ) {
    const slot =
      this.slots.find(
        (candidate) =>
          candidate.id ===
            playerId &&
          candidate.kind ===
            "human",
      );

    if (!slot) {
      return;
    }

    slot.ready =
      Boolean(ready);

    this.broadcastLobby();
  }

 addBot(playerId) {
  if (
    playerId !== this.hostId ||
    this.phase !== "lobby"
  ) {
    return;
  }

  const open = this.slots.find(
    (slot) => slot.kind === "empty",
  );

  if (!open) {
    return;
  }

  const id = `bot-${this.code}-${open.slot}`;

  Object.assign(open, {
    id,
    name: `BOT ${open.slot + 1}`,
    kind: "bot",
    ready: true,
    manual: true,
  });

  this.inputs[id] = {
    dx: 0,
    dy: 0,
    drop: false,
    detonate: false,
    special: false,
  };

  this.inputSequences[id] = -1;
  this.directionSequences[id] = -1;

  if (!this.trophies.has(id)) {
    this.trophies.set(id, 0);
  }

  this.broadcastLobby();
}


removeBot(playerId) {
  if (
    playerId !== this.hostId ||
    this.phase !== "lobby"
  ) {
    return;
  }

  const bot = [...this.slots]
    .reverse()
    .find(
      (slot) =>
        slot.kind === "bot" &&
        slot.manual === true,
    );

  if (!bot) {
    return;
  }

  const botId = bot.id;
  const slotNumber = bot.slot;

  this.slots[slotNumber] = {
    slot: slotNumber,
    kind: "empty",
  };

  delete this.inputs[botId];
  delete this.inputSequences[botId];
  delete this.directionSequences[botId];
  delete this.botPlans[botId];

  this.trophies.delete(botId);

  this.broadcastLobby();
  }
  
  setBotDifficulty(
    playerId,
    difficulty,
  ) {
    if (
      playerId !== this.hostId ||
      this.phase !== "lobby" ||
      this.humanCount() !== 1
    ) {
      return;
    }

    if (
      !BOT_DIFFICULTIES.has(
        difficulty,
      )
    ) {
      return;
    }

    this.botDifficulty =
      difficulty;

    this.broadcastLobby();
  }


  setGameMode(
    playerId,
    mode,
  ) {
    if (
      playerId !== this.hostId ||
      this.phase !== "lobby"
    ) {
      return;
    }

    if (
      !Object.values(
        GAME_MODES,
      ).includes(mode)
    ) {
      return;
    }

    this.gameMode = mode;

    this.broadcastLobby();
  }


  // ==========================================================
  // INPUT DOS JOGADORES
  // ==========================================================

  updateInput(
    playerId,
    input,
  ) {
    if (!this.inputs[playerId]) {
      return;
    }

    const sequence =
      Number.isSafeInteger(
        input.sequence,
      )
        ? input.sequence
        : null;

    if (
      sequence !== null &&
      sequence <=
        (
          this.inputSequences[
            playerId
          ] ?? -1
        )
    ) {
      return;
    }

    if (sequence !== null) {
      this.inputSequences[
        playerId
      ] = sequence;
    }

    const previous =
      this.inputs[playerId];

    let intent =
      previous.intent || null;

    const directionSequence =
      Number.isSafeInteger(
        input.directionSequence,
      )
        ? input.directionSequence
        : null;

    if (
      directionSequence !== null &&
      directionSequence >
        (
          this.directionSequences[
            playerId
          ] ?? -1
        )
    ) {
      this.directionSequences[
        playerId
      ] =
        directionSequence;

      intent =
        DIRECTION_VECTORS[
          input.direction
        ]
          ? {
              ...DIRECTION_VECTORS[
                input.direction
              ],
            }
          : intent;
    }

    this.inputs[playerId] = {
      dx:
        [-1, 0, 1].includes(
          input.dx,
        )
          ? input.dx
          : 0,

      dy:
        [-1, 0, 1].includes(
          input.dy,
        )
          ? input.dy
          : 0,

      drop:
        Boolean(input.drop),

      detonate:
        Boolean(
          input.detonate,
        ),

      special:
        Boolean(
          input.special,
        ),

      intent,
    };
  }


  // ==========================================================
  // INÍCIO DA PARTIDA
  // ==========================================================

  start(playerId) {
    if (
      playerId !== this.hostId ||
      this.phase !== "lobby"
    ) {
      return;
    }

    const humans =
      this.slots.filter(
        (slot) =>
          slot.kind === "human",
      );

    /*
     * REGRA DAS ARENAS:
     *
     * 1 humano -> completa até 4 com bots
     * 2 humanos -> completa até 4 com bots
     * 3 humanos -> completa até 4 com bots
     * 4 humanos -> 4 jogadores
     *
     * Todos esses casos usam arena quadrada.
     *
     * 5 humanos -> 5 jogadores
     * 6 humanos -> 6 jogadores
     *
     * Esses casos usam arena hexagonal.
     *
     * Não completamos partidas de 5 jogadores
     * automaticamente para 6 com bot.
     */
    const activePlayers =
      this.slots.filter(
        (slot) =>
          slot.kind !== "empty",
      );

    const targetPlayerCount =
      Math.max(
        4,
        activePlayers.length,
      );

    let activeCount =
      activePlayers.length;

    for (
      const slot of this.slots
    ) {
      /*
       * Adiciona bots somente quando
       * precisamos chegar aos 4 jogadores.
       */
      if (
        slot.kind === "empty" &&
        activeCount <
          targetPlayerCount
      ) {
        Object.assign(slot, {
          id:
            `bot-${this.code}-${slot.slot}`,

          name:
            `BOT ${slot.slot + 1}`,

          kind: "bot",

          ready: true,
        });

        activeCount += 1;
      }

      if (
        slot.kind !== "empty" &&
        !this.trophies.has(
          slot.id,
        )
      ) {
        this.trophies.set(
          slot.id,
          0,
        );
      }
    }

    /*
     * Apenas slots ocupados participam
     * efetivamente da partida.
     */
    const participants =
      this.slots.filter(
        (slot) =>
          slot.kind !== "empty",
      );

    const seed =
      randomBytes(4)
        .readUInt32LE(0);

    /*
     * createMatch receberá:
     *
     * 4 jogadores -> arena quadrada
     * 5 jogadores -> arena hexagonal
     * 6 jogadores -> arena hexagonal
     */
    this.state =
      createMatch(
        seed,

        participants.map(
          ({
            id,
            slot,
            name,
            kind,
          }) => ({
            id,
            slot,
            name,
            kind,
          }),
        ),

        {
          mode:
            this.gameMode,
        },
      );

    this.inputs =
      Object.fromEntries(
        participants.map(
          ({ id }) => [
            id,
            {
              dx: 0,
              dy: 0,
              drop: false,
              detonate: false,
              special: false,
            },
          ],
        ),
      );

    this.inputSequences =
      Object.fromEntries(
        participants.map(
          ({ id }) => [
            id,
            -1,
          ],
        ),
      );

    this.directionSequences =
      Object.fromEntries(
        participants.map(
          ({ id }) => [
            id,
            -1,
          ],
        ),
      );

    this.botPlans = {};

    this.phase = "playing";

    this.startsAt =
      Date.now() +
      MATCH_COUNTDOWN_MS;

    this.nextSimulationAt =
      this.startsAt;

    this.nextSnapshotAt =
      this.startsAt;

    const durationMs =
      this.gameMode ===
      GAME_MODES.SUPER
        ? SUPER_MATCH_DURATION_MS
        : MATCH_DURATION_MS;

    this.endsAt =
      this.startsAt +
      durationMs;

    this.suddenDeathQueue =
      this.gameMode ===
      GAME_MODES.SUPER
        ? createSuddenDeathOrder(
            this.state.grid,
          )
        : [];

    this.nextDeathBlockAt =
      this.gameMode ===
      GAME_MODES.SUPER
        ? this.endsAt -
          SUDDEN_DEATH_REMAINING_MS
        : 0;

    this.endAnnounced = false;
    this.endReason = null;

    this.broadcast({
      type: "matchStart",

      seed,

      ...snapshot(
        this.state,
      ),

      countdownMs:
        MATCH_COUNTDOWN_MS,

      durationMs,

      mode:
        this.gameMode,
    });
  }


  // ==========================================================
  // REVANCHE
  // ==========================================================

  rematch(playerId) {
    if (
      playerId !== this.hostId ||
      this.phase !== "ended"
    ) {
      return;
    }

    /*
     * Remove os bots criados automaticamente
     * na rodada anterior.
     */
    for (
      let slotIndex = 0;
      slotIndex <
      this.slots.length;
      slotIndex += 1
    ) {
      const slot =
        this.slots[
          slotIndex
        ];

      if (
        slot.kind === "bot" &&
        !slot.socket
      ) {
        this.slots[
          slotIndex
        ] = {
          slot: slotIndex,
          kind: "empty",
        };
      }
    }

    this.phase = "lobby";

    this.startsAt = 0;

    this.nextSimulationAt = 0;
    this.nextSnapshotAt = 0;

    this.endsAt = 0;

    this.endReason = null;

    this.suddenDeathQueue = [];

    this.nextDeathBlockAt = 0;

    this.broadcast({
      type: "lobbyReturn",
      transitionMs: 1320,
    });

    this.broadcastLobby();
  }


  // ==========================================================
  // LOOP DA PARTIDA
  // ==========================================================

  tick(now = Date.now()) {
    if (
      this.phase !== "playing" ||
      !this.state
    ) {
      return;
    }

    if (
      this.startsAt &&
      now < this.startsAt
    ) {
      return;
    }

    this.startsAt = 0;

    const alivePlayers =
      this.state.players.filter(
        (player) =>
          player.alive,
      ).length;

    const timeoutReached =
      this.endsAt > 0 &&
      now >= this.endsAt &&
      alivePlayers >= 2;


    // --------------------------------------------------------
    // FIM POR TEMPO
    // --------------------------------------------------------

    if (timeoutReached) {
      this.state.status =
        "ended";

      this.state.winnerSlot =
        null;

      this.endReason =
        "timeout";
    }


    // --------------------------------------------------------
    // PARTIDA EM ANDAMENTO
    // --------------------------------------------------------

    else {
      /*
       * Sudden Death do modo Super.
       */
      if (
        this.gameMode ===
          GAME_MODES.SUPER &&
        now >=
          this.nextDeathBlockAt &&
        this.suddenDeathQueue.length
      ) {
        let scheduledThisTick = 0;

        while (
          now >=
            this.nextDeathBlockAt &&
          this.suddenDeathQueue.length &&
          scheduledThisTick < 4
        ) {
          const tile =
            this.suddenDeathQueue.shift();

          dropDeathBlock(
            this.state,
            tile.x,
            tile.y,
          );

          this.nextDeathBlockAt +=
            DEATH_BLOCK_INTERVAL_MS;

          scheduledThisTick += 1;
        }
      }


      // ------------------------------------------------------
      // SIMULAÇÃO
      // ------------------------------------------------------

      const stepDuration =
        1000 / TICK_RATE;

      if (
        !this.nextSimulationAt
      ) {
        this.nextSimulationAt =
          now;
      }

      /*
       * Recupera pequenos atrasos do event loop
       * sem permitir um catch-up infinito.
       */
      this.nextSimulationAt =
        Math.max(
          this.nextSimulationAt,

          now -
            stepDuration *
              (
                MAX_CATCH_UP_STEPS -
                1
              ),
        );

      let simulated = 0;

      while (
        now + 0.01 >=
          this.nextSimulationAt &&
        simulated <
          MAX_CATCH_UP_STEPS &&
        this.state.status ===
          "playing"
      ) {
        const simulationNow =
          this.nextSimulationAt;

        const reservedBotDestinations =
          new Set();


        // ----------------------------------------------------
        // IA DOS BOTS
        // ----------------------------------------------------

        for (
          const slot of
          this.slots
        ) {
          if (
            slot.kind !== "bot"
          ) {
            continue;
          }

          const currentPlan =
            this.botPlans[
              slot.id
            ];

          const botPlayer =
            this.state.players.find(
              (player) =>
                player.id ===
                slot.id,
            );

          const reachedTileCenter =
            !botPlayer?.moveTarget;

          if (
            !currentPlan ||
            (
              reachedTileCenter &&
              simulationNow >=
                currentPlan.nextAt
            )
          ) {
            const decision =
              decideBotInput(
                this.state,
                slot.id,
                reservedBotDestinations,
              );

            const profile =
              BOT_PROFILES[
                this.botDifficulty
              ] ||
              BOT_PROFILES.normal;

            const canDrop =
              this.botDifficulty !==
                "easy" ||
              (
                this.state.tick +
                slot.slot
              ) %
                3 ===
                0;

            this.inputs[
              slot.id
            ] =
              decision.input.drop &&
              !canDrop
                ? {
                    ...decision.input,
                    drop: false,
                  }
                : decision.input;

            const delay =
              decision.urgent
                ? profile.urgentDelay
                : profile.minDelay +
                  Math.random() *
                    (
                      profile.maxDelay -
                      profile.minDelay
                    );

            this.botPlans[
              slot.id
            ] = {
              path:
                decision.path,

              nextAt:
                simulationNow +
                delay,
            };
          }

          const nextTile =
            this.botPlans[
              slot.id
            ]?.path?.[0];

          if (nextTile) {
            reservedBotDestinations.add(
              `${nextTile.x},${nextTile.y}`,
            );
          }
        }


        // Executa um passo da simulação.
        step(
          this.state,
          this.inputs,
        );

        simulated += 1;

        this.nextSimulationAt +=
          stepDuration;
      }

      if (
        this.state.status ===
        "ended"
      ) {
        this.endReason =
          "elimination";
      }
    }


    // --------------------------------------------------------
    // ENVIO DOS SNAPSHOTS
    // --------------------------------------------------------

    const remainingMs =
      Math.max(
        0,
        this.endsAt - now,
      );

    const snapshotDue =
      now + 0.01 >=
        this.nextSnapshotAt ||
      this.state.status ===
        "ended";

    if (snapshotDue) {
      this.broadcast({
        type: "snapshot",

        ...snapshot(
          this.state,
        ),

        remainingMs,

        serverTime: now,

        networkRate:
          NETWORK_RATE,
      });

      if (
        this.state.status !==
        "ended"
      ) {
        do {
          this.nextSnapshotAt +=
            SNAPSHOT_INTERVAL_MS;
        } while (
          this.nextSnapshotAt <=
          now
        );
      }
    }


    // --------------------------------------------------------
    // FINALIZAÇÃO
    // --------------------------------------------------------

    if (
      this.state.status ===
        "ended" &&
      !this.endAnnounced
    ) {
      this.phase = "ended";

      this.endAnnounced = true;

      const winner =
        this.state.players.find(
          (player) =>
            player.slot ===
            this.state.winnerSlot,
        );

      if (winner) {
        this.trophies.set(
          winner.id,

          (
            this.trophies.get(
              winner.id,
            ) || 0
          ) + 1,
        );
      }

      this.broadcast({
        type: "matchEnd",

        winnerSlot:
          this.state.winnerSlot,

        reason:
          this.endReason,

        standings:
          this.standingsPayload(),
      });
    }
  }


  // ==========================================================
  // DESCONEXÃO
  // ==========================================================

  disconnect(playerId) {
    const slot =
      this.slots.find(
        (candidate) =>
          candidate.id ===
          playerId,
      );

    if (!slot) {
      return;
    }

    /*
     * Se o jogador sair durante uma partida,
     * ele passa a ser controlado por um bot.
     */
    if (
      this.phase === "playing" ||
      this.phase === "ended"
    ) {
      slot.kind = "bot";
      slot.socket = undefined;

      const gamePlayer =
        this.state?.players.find(
          (candidate) =>
            candidate.id ===
            playerId,
        );

      if (gamePlayer) {
        gamePlayer.kind =
          "bot";
      }

      this.botPlans[
        playerId
      ] = {
        path: [],
        nextAt: 0,
      };
    }

    /*
     * Se sair ainda no lobby,
     * a vaga fica livre novamente.
     */
    else {
      const slotNumber =
        slot.slot;

      this.slots[
        slotNumber
      ] = {
        slot:
          slotNumber,

        kind:
          "empty",
      };

      delete this.inputs[
        playerId
      ];

      delete this.inputSequences[
        playerId
      ];

      delete this.directionSequences[
        playerId
      ];
    }


    // --------------------------------------------------------
    // TROCA DE ANFITRIÃO
    // --------------------------------------------------------

    if (
      this.hostId ===
      playerId
    ) {
      this.hostId =
        this.slots.find(
          (candidate) =>
            candidate.kind ===
              "human" &&
            candidate.socket
              ?.readyState === 1,
        )?.id || null;

      this.broadcast({
        type: "host",
        hostId:
          this.hostId,
      });
    }

    if (
      this.phase === "lobby"
    ) {
      this.broadcastLobby();
    }

    if (
      this.humanCount() === 0
    ) {
      this.emptySince =
        Date.now();
    }
  }
}


// ============================================================
// LOOP GLOBAL DAS SALAS
// ============================================================

export function startRoomLoop(
  rooms,
) {
  const timer =
    setInterval(
      () => {
        const now =
          Date.now();

        for (
          const [
            code,
            room,
          ] of rooms
        ) {
          room.tick(now);

          /*
           * Remove salas vazias depois de 1 minuto.
           */
          if (
            room.emptySince &&
            now -
              room.emptySince >=
              60_000
          ) {
            rooms.delete(code);
          }
        }
      },

      1000 / TICK_RATE,
    );

  timer.unref();

  return timer;
}