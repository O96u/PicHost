# syntax=docker/dockerfile:1

FROM node:22-alpine AS build

WORKDIR /app

# package-lock.json 由 npm 11 生成；镜像自带 npm 10，需对齐后再 npm ci
RUN npm install -g npm@11.12.1

COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci

COPY . .
RUN npm run build

FROM node:22-alpine

WORKDIR /app

ENV NODE_ENV=production \
    NITRO_PORT=6892 \
    DATA_DIR=/data

COPY --from=build /app/.output ./.output
COPY server/cli/reset-password.mjs ./server/cli/reset-password.mjs
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

EXPOSE 6892
VOLUME /data

ENTRYPOINT ["/docker-entrypoint.sh"]
