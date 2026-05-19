# syntax=docker/dockerfile:1

FROM node:22-bookworm-slim AS build
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app

COPY package.json package-lock.json ./
COPY web/package.json web/package-lock.json ./web/
RUN npm ci --omit=dev && npm ci --prefix web --omit=dev

COPY . .
RUN npm run build

FROM node:22-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production \
    PORT=80

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json /app/server.js ./
COPY --from=build /app/src ./src
COPY --from=build /app/dist/web ./dist/web

RUN mkdir -p data && chown -R node:node /app
USER node
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:'+(process.env.PORT||80)+'/health',(r)=>{process.exit(r.statusCode===200?0:1)}).on('error',()=>process.exit(1))"
CMD ["node", "server.js"]
