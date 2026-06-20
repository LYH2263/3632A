FROM node:20 AS builder

WORKDIR /app
RUN corepack enable

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/shared/package.json packages/shared/package.json
COPY apps/merchant-web/package.json apps/merchant-web/package.json

RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @community-store/shared build
RUN pnpm --filter merchant-web build

FROM nginx:stable
COPY apps/merchant-web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/apps/merchant-web/dist /usr/share/nginx/html

EXPOSE 80
