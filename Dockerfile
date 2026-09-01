FROM node:22-alpine AS build
WORKDIR /app

# Copia os manifestos e arquivos de configuração
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml* .npmrc* ./

# Configura a permissão do esbuild no .npmrc e no pnpm-workspace.yaml
RUN echo "only-built-dependencies=esbuild" >> .npmrc && \
    echo "onlyBuiltDependencies:" > pnpm-workspace.yaml && \
    echo "  - esbuild" >> pnpm-workspace.yaml

RUN corepack enable && pnpm install --no-frozen-lockfile

COPY . .
RUN pnpm build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml* .npmrc* ./

RUN echo "only-built-dependencies=esbuild" >> .npmrc && \
    echo "onlyBuiltDependencies:" > pnpm-workspace.yaml && \
    echo "  - esbuild" >> pnpm-workspace.yaml

RUN corepack enable && pnpm install --prod --no-frozen-lockfile

COPY --from=build /app/dist ./dist
COPY --from=build /app/server ./server
COPY --from=build /app/shared ./shared

EXPOSE 3000
CMD ["node", "server/index.js"]
