# Blast Room

A server-authoritative, real-time Bomberman-style game for up to four people. Create a room, share its link, and start a match; empty or disconnected seats are controlled by bots.

## Run locally

Requires Node.js 22+ and pnpm.

```sh
pnpm install
pnpm dev
```

Open `http://localhost:3000`. The same command runs the Vite client and the Node/WebSocket server.

## Verify

```sh
pnpm test
pnpm build
```

The project includes a multi-stage Dockerfile and a Render Blueprint. Set `PUBLIC_ORIGIN` to the final HTTPS origin so social share cards use an absolute image URL.
