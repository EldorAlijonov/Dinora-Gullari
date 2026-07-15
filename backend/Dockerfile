FROM node:22-bookworm-slim AS build

WORKDIR /app

COPY backend/package*.json ./
RUN npm ci

COPY backend ./
RUN npm run build && npm prune --omit=dev

FROM node:22-bookworm-slim

ENV NODE_ENV=production
WORKDIR /app

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/package*.json ./

EXPOSE 5000

CMD ["node", "dist/main.js"]
