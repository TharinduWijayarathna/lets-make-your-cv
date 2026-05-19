# syntax=docker/dockerfile:1

FROM node:20-alpine AS build
RUN apk add --no-cache python3 make g++
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY . .

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production \
    PORT=80
COPY --from=build /app/node_modules ./node_modules
COPY package.json server.js ./
COPY src ./src
COPY public ./public
RUN mkdir -p data && chown -R node:node /app
USER node
EXPOSE 80
CMD ["node", "server.js"]
