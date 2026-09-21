FROM node:20-slim AS base
WORKDIR /app

COPY shared/package.json ./shared/
COPY server/package.json ./server/
COPY package.json package-lock.json ./
RUN npm ci

COPY shared/ ./shared/
COPY server/ ./server/

RUN cd shared && npm run build
RUN cd server && npm run build

FROM node:20-slim AS production
WORKDIR /app

COPY --from=base /app/shared/package.json ./shared/
COPY --from=base /app/shared/dist ./shared/dist/
COPY --from=base /app/server/package.json ./server/
COPY --from=base /app/server/dist ./server/dist/
COPY --from=base /app/server/src/levels ./server/dist/levels/
COPY --from=base /app/node_modules ./node_modules/
COPY package.json package-lock.json ./

ENV NODE_ENV=production
EXPOSE 3001

CMD ["node", "server/dist/index.js"]
