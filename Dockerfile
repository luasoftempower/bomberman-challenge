FROM node:22-alpine AS build
WORKDIR /app

COPY package.json pnpm-lock.yaml ./

# Instala tudo ignorando scripts e reconstrói o esbuild manualmente
RUN corepack enable && \
    pnpm install --no-frozen-lockfile --ignore-scripts && \
    pnpm rebuild esbuild

COPY . .

# Usa o npm nativo para rodar o build, contornando o bloqueio do pnpm
RUN npm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

COPY package.json pnpm-lock.yaml ./

RUN corepack enable && \
    pnpm install --prod --no-frozen-lockfile --ignore-scripts

COPY --from=build /app/dist ./dist
COPY --from=build /app/server ./server
COPY --from=build /app/shared ./shared

EXPOSE 3000
CMD ["node", "server/index.js"]
