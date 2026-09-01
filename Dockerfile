FROM node:22-alpine AS build
WORKDIR /app

# Desativa a trava de scripts do pnpm v10+
ENV NPM_CONFIG_ONLY_BUILT_DEPENDENCIES=""
ENV PNPM_CONFIG_IGNORE_SCRIPTS=false

COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --no-frozen-lockfile

COPY . .
RUN pnpm build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV PNPM_CONFIG_IGNORE_SCRIPTS=false

COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --prod --no-frozen-lockfile

COPY --from=build /app/dist ./dist
COPY --from=build /app/server ./server
COPY --from=build /app/shared ./shared

EXPOSE 3000
CMD ["node", "server/index.js"]
