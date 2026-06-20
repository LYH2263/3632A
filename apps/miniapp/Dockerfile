FROM node:20 AS builder

WORKDIR /app
RUN corepack enable

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/shared/package.json packages/shared/package.json
COPY apps/miniapp/package.json apps/miniapp/package.json

RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @community-store/shared build
RUN pnpm --filter miniapp build:h5

FROM nginx:stable
COPY apps/miniapp/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/apps/miniapp/dist/build/h5 /usr/share/nginx/html
COPY apps/miniapp/docker/docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

EXPOSE 80
ENTRYPOINT ["/docker-entrypoint.sh"]
