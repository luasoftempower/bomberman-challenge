import express from "express";
import { randomBytes } from "node:crypto";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { WebSocketServer } from "ws";
import { makeCode, Room, startRoomLoop } from "./room.js";

const app = express();
const server = createServer(app);
const port = Number(process.env.PORT || 3000);
const rooms = new Map();
const webSockets = new WebSocketServer({ noServer: true, maxPayload: 4096 });

app.use(express.json({ limit: "8kb" }));

app.post("/api/rooms", (_request, response) => {
  let code;
  do code = makeCode(); while (rooms.has(code));
  const hostToken = randomBytes(16).toString("hex");
  rooms.set(code, new Room(code, hostToken));
  response.status(201).json({ roomCode: code, hostToken, path: `/r/${code}` });
});

app.get("/api/rooms/:code", (request, response) => {
  const room = rooms.get(String(request.params.code).toUpperCase());
  if (!room) return response.status(404).json({ exists: false });
  response.json({ exists: true, phase: room.phase, humans: room.humanCount() });
});

if (process.env.NODE_ENV === "production") {
  const publicOrigin = String(process.env.PUBLIC_ORIGIN || "").replace(/\/$/, "");
  let indexHtml = await readFile("dist/index.html", "utf8");
  indexHtml = publicOrigin
    ? indexHtml.replaceAll("__PUBLIC_ORIGIN__", publicOrigin)
    : indexHtml.replace(/\s*<meta data-public-origin[^>]+>/g, "");
  app.use(express.static("dist"));
  app.get(["/", "/r/:code"], (_request, response) => response.type("html").send(indexHtml));
} else {
  const { createServer: createViteServer } = await import("vite");
  const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
  app.use(vite.middlewares);
}

server.listen(port, "0.0.0.0", () => {
  console.log(`Bomberlan ready at http://localhost:${port}`);
});

server.on("upgrade", (request, socket, head) => {
  const url = new URL(request.url, `http://${request.headers.host || "localhost"}`);
  if (url.pathname !== "/ws") return socket.destroy();
  webSockets.handleUpgrade(request, socket, head, (webSocket) => webSockets.emit("connection", webSocket));
});

webSockets.on("connection", (socket) => {
  let room;
  let playerId;
  const joinTimeout = setTimeout(() => socket.close(1008, "Join required"), 5_000);

  socket.on("message", (raw) => {
    let message;
    try {
      message = JSON.parse(raw.toString());
    } catch {
      return socket.close(1003, "Invalid JSON");
    }

    if (message.type === "ping") {
      if (socket.readyState === 1) socket.send(JSON.stringify({ type: "pong", clientTime: message.clientTime, serverTime: Date.now() }));
      return;
    }

    if (!playerId) {
      if (message.type !== "join") return socket.close(1008, "Join required");
      room = rooms.get(String(message.roomCode || "").toUpperCase());
      if (!room) {
        socket.send(JSON.stringify({ type: "error", code: "ROOM_NOT_FOUND", message: "Não encontramos essa sala." }));
        return socket.close(1008, "Room not found");
      }
      const result = room.addHuman(socket, message);
      if (result.error) {
        socket.send(JSON.stringify({ type: "error", ...result.error }));
        return socket.close(1008, result.error.code);
      }
      playerId = result.id;
      clearTimeout(joinTimeout);
      return;
    }

    if (message.type === "input") room.updateInput(playerId, message);
    else if (message.type === "ready") room.setReady(playerId, message.ready);
    else if (message.type === "botDifficulty") room.setBotDifficulty(playerId, message.difficulty);
    else if (message.type === "gameMode") room.setGameMode(playerId, message.mode);
    else if (message.type === "start") room.start(playerId);
    else if (message.type === "rematch") room.rematch(playerId);
  });

  socket.on("close", () => {
    clearTimeout(joinTimeout);
    if (room && playerId) room.disconnect(playerId);
  });
});

startRoomLoop(rooms);
