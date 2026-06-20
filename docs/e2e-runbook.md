# E2E Runbook（Playwright 全链路）

## 1. 目标

本仓库 E2E 覆盖三层：

- `ui-mock`：前端页面分支与交互边界（不依赖后端业务数据正确性）。
- `ui-api`：前端在 API 模式下的联调能力。
- `api-only`：补齐 UI 不可达的后端异常分支。
- `full-chain`：买家端下单 -> 商家端推进 -> 买家端同步。

## 2. 运行前置

1. 安装 Node 22+、pnpm 10+、Python 3.12+。
2. 安装依赖：

```bash
pnpm install
pnpm backend:setup
```

3. 首次执行 Playwright 需安装浏览器：

```bash
pnpm exec playwright install chromium
```

## 3. 执行命令

```bash
# 全量 E2E（UI + API + 全链路）
pnpm e2e

# 仅 UI 套件（mock + api + full-chain）
pnpm e2e:ui

# 仅 API-only 套件
pnpm e2e:api

# 打开 HTML 报告
pnpm e2e:report
```

## 4. 端口与启动策略

Playwright `webServer` 自动拉起：

- backend: `http://127.0.0.1:8001`
- miniapp(H5): `http://127.0.0.1:4173`
- merchant-web: `http://127.0.0.1:4174`

后端在 E2E 启动前执行：`e2e:reset`（migrate + flush + seed）。

## 5. 失败留痕

配置已启用：

- `trace: on-first-retry`
- `screenshot: only-on-failure`
- `video: retain-on-failure`

产物目录：

- `e2e/test-results`
- `e2e/playwright-report`

## 6. 常见问题排查

1. `backend .venv` 不存在：先运行 `pnpm backend:setup`。
2. 端口占用：关闭本地已有 `4173/4174/8001` 服务后重试。
3. UI 用例找不到元素：优先检查页面是否处于正确运行时模式（mock/api）与 testid 是否变更。
4. API 分支不稳定：确认 `reset_mvp_data` 命令可执行，并检查 `apps/backend/db.sqlite3` 是否可写。

## 7. CI 门禁

- 工作流：`.github/workflows/e2e.yml`
- 门禁建议：`pnpm e2e` 全绿才允许合并。
