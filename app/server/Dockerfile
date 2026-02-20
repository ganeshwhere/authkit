FROM node:20-alpine AS build

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@8.15.8 --activate

COPY app/server/package.json ./package.json
COPY app/server/tsconfig.json ./tsconfig.json
COPY app/server/drizzle.config.ts ./drizzle.config.ts
COPY app/server/src ./src

RUN pnpm install
RUN pnpm run build

FROM node:20-alpine AS runtime

WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist

EXPOSE 3001

CMD ["node", "dist/main.js"]
