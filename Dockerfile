FROM node:20-slim AS base
WORKDIR /app

# Install dependencies
COPY shared/package.json ./shared/
COPY server/package.json ./server/
COPY package.json ./
RUN npm install

# Copy source
COPY shared/ ./shared/
COPY server/ ./server/

# Build shared types
RUN cd shared && npm run build

# Build server
RUN cd server && npm run build

# Production image
FROM node:20-slim AS production
WORKDIR /app

COPY --from=base /app/shared/package.json ./shared/
COPY --from=base /app/shared/dist ./shared/dist/
COPY --from=base /app/server/package.json ./server/
COPY --from=base /app/server/dist ./server/dist/
COPY --from=base /app/server/src/levels ./server/dist/levels/
COPY --from=base /app/node_modules ./node_modules/
COPY --from=base /app/server/node_modules ./server/node_modules/

ENV NODE_ENV=production
EXPOSE 3001

CMD ["node", "server/dist/index.js"]
