# 社区版网上商店 MVP（双端分离 + Django 后端）

本仓库实现：

- 买家端：`apps/miniapp`（Vue3 + Vite，按 uniapp 页面路径组织）
- 商家端：`apps/merchant-web`（Vue3 + Element Plus）
- 后端：`apps/backend`（Django + DRF + MySQL/Redis）
- 共享业务层：`packages/shared`（类型、订单状态机、校验规则）

## 原始需求

> 帮我开发一个社区版网上商店，可以让社区周边商店入驻上架商品，社区用户可以通过app购买选定商家的商品，商品选定好后生成配货单和价格表后由商家提供配送，结算支持线下支付(暂不支持线上支付)
> app: uniapp+ uview
> 前端：element plus
> 后端：python3+django+mysql8.0+redis
> backend 后台管理后端
> frontend 后台管理前端
> uniapp app小程序

## 1. 环境要求

- Node.js 22+
- pnpm 10+
- Python 3.12+
- Docker / Docker Compose（可选）

## 2. 安装依赖

```bash
pnpm install
pnpm backend:setup
```

## 3. 本地运行

### 3.1 构建买家端并启动商家端（默认 mock）

```bash
# 买家端（微信小程序构建产物）
pnpm --filter miniapp build:mp-weixin

# 商家端（浏览器）
pnpm --filter merchant-web dev
```

使用方式：

- 买家端：先执行 `pnpm install`，再运行 `pnpm --filter miniapp build:mp-weixin`，然后使用微信开发者工具打开 `apps/miniapp/dist/build/mp-weixin`
- 买家端补充说明：仓库默认只保留正式构建产物 `dist/build/mp-weixin`，不保留 `dist/dev/mp-weixin`
- 商家端：<http://localhost:5174>

### 3.2 启动后端（API 模式）

```bash
cd apps/backend
./.venv/bin/python manage.py migrate
./.venv/bin/python manage.py seed_mvp_data
./.venv/bin/python manage.py runserver 0.0.0.0:8000
```

后端地址：<http://localhost:8000>

### 3.3 切换前端到 API 模式

在各自调试环境中设置运行时配置后刷新：

```js
// 买家端（微信开发者工具调试环境）
globalThis.__COMMUNITY_STORE_RUNTIME__ = {
	dataMode: 'api',
	apiBaseUrl: 'http://localhost:8000/api/v1',
}

// 商家端（浏览器控制台）
window.__COMMUNITY_STORE_WEB_RUNTIME__ = {
	dataMode: 'api',
	apiBaseUrl: 'http://localhost:8000/api/v1',
}
```

## 4. Docker 启动

```bash
cp .env.example .env
docker compose up -d --build
```

说明：

- Docker 编排包含后端、商家端、买家端 H5、MySQL、Redis。
- 买家端 **微信小程序**（`build:mp-weixin`）仍须单独构建，用微信开发者工具打开；Docker 提供的是 **浏览器 H5 版** 便于演示与 API 联调。
- 买家端 H5 容器启动时会写入 `runtime-config.js`，默认 `api` 模式并指向 `http://localhost:8000/api/v1`（浏览器侧访问宿主机端口）。

Docker 启动后可访问：

- backend: `8000`
- merchant-web: `8081`
- miniapp (H5): `8082`
- mysql: `3306`
- redis: `6379`

对应访问地址：

- 买家端 H5：<http://localhost:8082/pages/home/index>
- 商家端：<http://localhost:8081>
- 后端接口示例：<http://localhost:8000/api/v1/merchants>

买家端 H5 运行时配置（可选，写入 `.env`）：

```env
MINIAPP_DATA_MODE=api
MINIAPP_API_BASE_URL=http://localhost:8000/api/v1
```

若部署到非本机域名，请将 `MINIAPP_API_BASE_URL` 改为浏览器可访问的后端公网地址。

#### 种子数据与测试账号

执行 `seed_mvp_data` 后会初始化以下示例数据：

- 买家账号：`buyer` / `buyer123`（角色为 `buyer`，用于买家端接口联调）
- 商家账号：`merchant_fruit` / `merchant123`（绑定“鲜果超市”，可登录商家端）
- 商家账号：`merchant_market` / `merchant123`（绑定“便民小超”，可登录商家端）
- 示例业务数据：2 个商家、4 个商品

补充说明：

- Docker 启动后，后端容器会自动执行 `migrate` 和 `seed_mvp_data`，通常无需手动重复初始化
- 种子脚本使用幂等写入方式，重复执行不会重复创建同名商家、商品和账号

停止：

```bash
docker compose down -v
```

## 5. 质量验证

```bash
pnpm lint
pnpm test
pnpm build
pnpm e2e
```

E2E 分组执行：

```bash
pnpm e2e:api
pnpm e2e:ui
pnpm e2e:report
```

详见：

- `docs/e2e-runbook.md`
- `docs/e2e-coverage-matrix.md`

## 6. 核心能力说明

- 单商家购物车限制（跨商家加购会提示是否清空并切换）
- 下单仅支持线下支付（`offline`）
- 下单生成商品快照（配货单 + 价格表）
- 商家端可推进订单状态：`pending -> confirmed -> delivering -> completed`
- 支持简化版商家入驻（商家端提交入驻信息后自动登录）
- 非法数量/越库存会阻止下单
- 购物车持久化（浏览器刷新后可恢复）
- 小程序结算提交支持稳定反馈（`tap/click` 双触发 + 页面内反馈 + Toast 提示）
- 下单成功后使用 `redirectTo` 进入订单详情，返回时回到商品列表页（不回结算页）

## 7. 目录说明

```text
apps/
  miniapp/         买家端
  merchant-web/    商家端
  backend/         Django 后端
packages/
  shared/          共享类型与业务规则
docs/
  acceptance.md    验收对照
  assumptions.md   默认假设
```

## 8. 代码架构

### 8.1 Monorepo 分层

- `apps/miniapp`：买家端小程序
- `apps/merchant-web`：商家管理端（登录、店铺信息、商品管理、订单推进）。
- `apps/backend`：Django REST API 与数据模型，实现业务校验与状态机约束。
- `packages/shared`：跨端共享类型、常量、校验工具与订单状态规则，避免双端规则漂移。

### 8.2 前后端交互与数据源策略

- 前端统一通过 `DataSource` 抽象访问数据。
- 默认 `mock` 模式用于本地快速闭环。
- 通过运行时注入可切换为 `api` 模式（连接 Django API）。
- 小程序端通过 `globalThis` 读取运行时配置，避免直接访问 `process / process.env`。

### 8.3 业务核心流

- 买家流：商家浏览 -> 商品浏览/加购 -> 结算下单（offline）-> 订单详情查看（返回回商品列表页）。
- 商家流：登录 -> 店铺信息维护 -> 商品 CRUD -> 订单状态推进。
- 全链路同步：订单状态由后端统一裁决，买家端刷新后可见最新状态。

## 9. 技术细节

### 9.1 订单状态机

- 合法链路：`pending -> confirmed -> delivering -> completed`。
- `pending` 可取消到 `canceled`，其余状态不可逆回退。
- 前端与后端双重校验，后端作为最终裁决层。

### 9.2 校验与容错

- 下单前校验：数量合法、库存充足、起送价达标、单商家购物车约束。
- 后端再校验：防止仅前端校验带来的越权或脏数据写入。
- 错误分支通过 API E2E 补齐（如 400/401/404/非法迁移）。

### 9.3 鉴权与会话

- 登录返回 `{ token, user }`，前端统一以该结构持久化会话。
- 商家端支持 `POST /api/v1/auth/register-merchant` 入驻并自动登录。
- 前端请求在 API 模式下自动附带 `Authorization: Bearer <token>`。
- 会话读取兼容旧格式（仅 `user`）与新格式（`token + user`）。

### 9.4 E2E 测试基建

- 基于 Playwright，分为 `ui-mock`、`ui-api`、`full-chain`、`api-only` 四层。
- 使用 `data-testid` 作为稳定测试契约，降低 UI 调整带来的测试波动。
- 每轮运行前执行后端 `reset_mvp_data`，保证数据可重复与可追溯。
- 失败留痕：`trace`、`screenshot`、`video` 自动保留失败现场。

### 9.5 部署与容器

- Docker 采用非 Alpine 镜像：
  - `python:3.12-slim`
  - `node:20`
  - `nginx:stable`
  - `mysql:8.0`
  - `redis:7.2`
- 使用 `docker-compose` 一键拉起后端、商家端、买家端 H5 与依赖中间件。
- 买家端微信小程序产物（`dist/build/mp-weixin`）不包含在 compose 中；H5 镜像见 `apps/miniapp/Dockerfile`。
