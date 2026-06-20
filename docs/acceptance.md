# MVP 验收对照

## AC-CORE-001
- 要求：商家列表可选商家并查看商品列表/详情。
- 验证路径：`/pages/home/index -> /pages/shop/detail -> /pages/product/detail`。
- 证据：`apps/miniapp/src/pages/home/index.vue`、`apps/miniapp/src/pages/shop/detail.vue`、`apps/miniapp/src/pages/product/detail.vue`。

## AC-CORE-002
- 要求：满足起送价后下单，生成 pending 订单，显示线下支付与配货单/价格表。
- 验证路径：`/pages/cart/checkout` 提交订单后跳转 `/pages/order/detail`。
- 证据：`apps/miniapp/src/pages/cart/checkout.vue`、`apps/miniapp/src/pages/order/detail.vue`、`packages/shared/src/utils/order.ts`、`e2e/specs/ui/api/miniapp-api.spec.ts`（`MINIAPP-API-002`）。

## AC-CORE-003
- 要求：商家更新订单状态，买家侧同步可见。
- 验证路径：`/pages/merchant/center` 更新状态后，`/pages/order/detail` 或 `/pages/order/list` 查看。
- 证据：`apps/miniapp/src/pages/merchant/center.vue`（含订单详情卡片：配货单/价格表/收货信息）、`apps/miniapp/src/pages/order/list.vue`（含全部/进行中/已完成筛选）、`apps/miniapp/src/pages/order/detail.vue`、`e2e/specs/ui/api/merchant-web-api.spec.ts`（`WEB-API-002`）、`e2e/specs/integration/full-chain.spec.ts`（`CHAIN-001`）。

## AC-EDGE-001
- 要求：购物车已有商家 A 商品时，商家 B 加购触发单商家限制提示。
- 验证路径：在不同商家商品页点击加购。
- 证据：`apps/miniapp/src/stores/cart.ts`、`apps/miniapp/src/pages/shop/detail.vue`、`apps/miniapp/src/pages/product/detail.vue`。

## AC-ERROR-001
- 要求：数量非法（<=0）或超库存时阻断下单。
- 验证路径：结算提交前校验 + 后端创建订单校验。
- 证据：`packages/shared/src/utils/validator.ts`、`apps/backend/orders/views.py`、`apps/backend/orders/tests.py`。

## AC-USABILITY-001
- 要求：重启后购物车恢复。
- 验证路径：刷新页面后进入商家页/结算页。
- 证据：`apps/miniapp/src/data/storage.ts`、`apps/miniapp/src/data/mock-db.ts`、`apps/miniapp/src/stores/cart.ts`、`e2e/specs/ui/mock/miniapp-shop.spec.ts`（`SHOP-MOCK-006`）。

## P1（简化实现）补充验收
- 要求：支持简化版商家入驻、商品 CRUD、角色边界。
- 验证路径：商家端登录页提交入驻表单后自动登录并进入仪表盘；可继续执行商品新增/编辑/上下架与订单推进。
- 证据：`apps/merchant-web/src/views/LoginView.vue`、`apps/merchant-web/src/services/merchant-service.ts`、`apps/backend/users/views.py`（密码使用 `make_password`/`check_password` 哈希存储）、`e2e/specs/api/backend/auth.spec.ts`（`API-AUTH-003`）、`e2e/specs/ui/mock/merchant-web-dashboard.spec.ts`（`WEB-DASH-MOCK-003`、`WEB-DASH-MOCK-004`）。

## 补充功能
- 订单列表筛选：`apps/miniapp/src/pages/order/list.vue` 支持全部/进行中/已完成三种筛选。
- 商家端订单详情：`apps/miniapp/src/pages/merchant/center.vue` 订单表格新增"详情"按钮，展开配货单、价格表与收货信息。
- 密码安全：后端密码使用 Django `make_password`/`check_password` 哈希存储，不再明文保存。
