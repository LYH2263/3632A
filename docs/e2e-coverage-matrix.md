# E2E Coverage Matrix（全页面 + 全分支 + 全边界）

> 说明：每条分支/边界都映射到至少 1 个用例 ID。UI 无法直接触达的异常路径由 `api-only` 套件补齐。

## 1. miniapp 页面

| 页面 | 分支/边界 | 用例 ID |
|---|---|---|
| `/pages/home/index` | 商家列表渲染、有营业/休息状态 | `HOME-MOCK-001` |
| `/pages/home/index` | 休息商家进店按钮禁用 | `HOME-MOCK-001` |
| `/pages/home/index` | 搜索无结果空态 | `HOME-MOCK-002` |
| `/pages/shop/detail` | 商家存在渲染 | `SHOP-MOCK-002` |
| `/pages/shop/detail` | 商家不存在 | `SHOP-MOCK-001` |
| `/pages/shop/detail` | 商品搜索命中/无结果 | `SHOP-MOCK-002` |
| `/pages/shop/detail` | 加减购、数量与金额联动 | `SHOP-MOCK-003` |
| `/pages/shop/detail` | 页面重载后购物车恢复与金额正确 | `SHOP-MOCK-006` |
| `/pages/shop/detail` | 跨商家冲突弹窗-取消 | `SHOP-MOCK-004` |
| `/pages/shop/detail` | 跨商家冲突弹窗-确认并切换 | `SHOP-MOCK-004` |
| `/pages/shop/detail` | 库存=-1（不限） | `SHOP-MOCK-002` |
| `/pages/shop/detail` | 超库存提示 | `SHOP-MOCK-005` |
| `/pages/product/detail` | 商品存在渲染 | `PRODUCT-MOCK-002` |
| `/pages/product/detail` | 商品不存在 | `PRODUCT-MOCK-001` |
| `/pages/product/detail` | 数量<=0 守卫 | `PRODUCT-MOCK-002` |
| `/pages/product/detail` | 超库存提示 | `PRODUCT-MOCK-003` |
| `/pages/product/detail` | 加入购物车成功 | `PRODUCT-MOCK-004` |
| `/pages/product/detail` | 跨商家冲突弹窗取消/确认 | `PRODUCT-MOCK-004` |
| `/pages/cart/checkout` | 商家缺失分支 | `CHECKOUT-MOCK-001`, `MINIAPP-API-001` |
| `/pages/cart/checkout` | 购物车空/非空 | `CHECKOUT-MOCK-002`, `CHECKOUT-MOCK-004` |
| `/pages/cart/checkout` | 姓名空/手机号空/手机号格式错/地址空 | `CHECKOUT-MOCK-002` |
| `/pages/cart/checkout` | 未达起送价 | `CHECKOUT-MOCK-003`, `API-CART-003` |
| `/pages/cart/checkout` | 越库存阻断下单 | `CHECKOUT-MOCK-005`, `API-CART-003` |
| `/pages/cart/checkout` | 提交成功跳转订单详情 | `CHECKOUT-MOCK-004`, `MINIAPP-API-002` |
| `/pages/order/list` | 有订单/无订单 | `ORDER-MOCK-002`, `ORDER-MOCK-001`, `MINIAPP-API-001` |
| `/pages/order/list` | 刷新与时间排序稳定 | `ORDER-MOCK-002` |
| `/pages/order/detail` | 订单存在渲染（配货单/价格表） | `CHECKOUT-MOCK-004`, `MINIAPP-API-002`, `CHAIN-001` |
| `/pages/order/detail` | 订单不存在 | `ORDER-MOCK-003`, `MINIAPP-API-001` |
| `/pages/order/detail` | 买家取消入口与取消成功 | `ORDER-MOCK-004`, `MINIAPP-API-002`, `CHAIN-002` |
| `/pages/order/detail` | 商家操作入口与状态推进成功 | `ORDER-MOCK-005`, `CHAIN-001` |
| `/pages/order/detail` | completed/canceled 无后继状态 | `ORDER-MOCK-005`, `CHAIN-002` |
| `/pages/order/detail` | 非法状态迁移 | `API-ORDER-005` |
| `/pages/merchant/center` | 未登录展示登录表单 | `CENTER-MOCK-001` |
| `/pages/merchant/center` | 登录失败 | `CENTER-MOCK-002` |
| `/pages/merchant/center` | 非商家账号登录分支 | `CENTER-MOCK-002` |
| `/pages/merchant/center` | 店铺信息保存 | `CENTER-MOCK-003` |
| `/pages/merchant/center` | 商品新增/编辑/上下架 | `CENTER-MOCK-003` |
| `/pages/merchant/center` | 商品名空/价格<0 | `CENTER-MOCK-003` |
| `/pages/merchant/center` | 商家订单推进 | `CENTER-MOCK-004` |
| `/pages/merchant/center` | merchant_id 缺失边界 | `CENTER-MOCK-005` |
| `App.vue` | buyer/merchant 角色切换 | `APP-MOCK-001` |
| `App.vue` | merchantId 非法回退 | `APP-MOCK-002` |

## 2. merchant-web 页面

| 页面 | 分支/边界 | 用例 ID |
|---|---|---|
| `/login` | 空账号密码 | `WEB-LOGIN-MOCK-002` |
| `/login` | 错误凭证 | `WEB-LOGIN-MOCK-003` |
| `/login` | 非商家账号（API 模式） | `WEB-API-001` |
| `/login` | 登录成功 | `WEB-LOGIN-MOCK-004`, `WEB-API-002` |
| `/dashboard` | 路由守卫未登录跳转 | `WEB-LOGIN-MOCK-001` |
| `/dashboard` | 商家存在正常渲染 | `WEB-DASH-MOCK-002` |
| `/dashboard` | 商家不存在边界 | `WEB-DASH-MOCK-001` |
| `/dashboard` | 店铺保存 | `WEB-DASH-MOCK-002` |
| `/dashboard` | 商品新增/编辑/上下架 | `WEB-DASH-MOCK-003` |
| `/dashboard` | 商品名空 | `WEB-DASH-MOCK-003` |
| `/dashboard` | 订单推进 | `WEB-DASH-MOCK-004`, `WEB-API-002`, `CHAIN-001` |
| `/dashboard` | 状态非法迁移 | `API-ORDER-005` |
| `/dashboard` | 列表空态（无订单） | `MINIAPP-API-001`（创建前为空）, `WEB-DASH-MOCK-001`（商家缺失空容器） |

## 3. 后端 API（全 endpoint）

| Endpoint | 成功分支 | 异常分支 | 用例 ID |
|---|---|---|---|
| `POST /auth/login` | 买家/商家登录成功 | 账号密码错误 401 | `API-AUTH-001`, `API-AUTH-002` |
| `POST /auth/register-merchant` | 商家入驻并返回登录态 | 用户名重复 400（单测） | `API-AUTH-003` |
| `GET /merchants` | 列表成功 | - | `API-MERCHANT-001` |
| `PATCH /merchants/:id` | 更新成功 | 商家不存在 404 | `API-MERCHANT-002`, `API-MERCHANT-003` |
| `GET /products` | merchant/keyword 过滤成功 | - | `API-PRODUCT-001` |
| `POST /products` | 创建成功 | 商家不存在 404；字段校验 400 | `API-PRODUCT-002`, `API-PRODUCT-003` |
| `GET /products/:id` | 存在返回对象 | 不存在返回 `data=null` | `API-PRODUCT-004` |
| `PATCH /products/:id` | 更新成功 | 商品不存在 404；merchant_id 非法 404 | `API-PRODUCT-005` |
| `POST /cart/validate` | 校验成功 | 商家不存在、空购物车、商品不存在、数量<=0、超库存、已下架、未达起送价 | `API-CART-001`, `API-CART-002`, `API-CART-003` |
| `POST /orders` | 创建 pending + snapshot + offline | 买家不存在、商家不存在、cart 校验失败 | `API-ORDER-001`, `API-ORDER-002` |
| `GET /orders` | buyer/merchant 过滤 | - | `API-ORDER-003` |
| `GET /orders/:id` | 存在返回对象 | 不存在返回 `data=null` | `API-ORDER-004` |
| `PATCH /orders/:id/status` | 合法迁移、同状态幂等 | 订单不存在 404、非法迁移 400 | `API-ORDER-005` |

## 4. 全链路闭环

| 场景 | 用例 ID |
|---|---|
| 买家下单（API 模式）-> 商家推进 `pending -> confirmed -> delivering -> completed` -> 买家端同步 | `CHAIN-001` |
| 买家在 pending 取消 -> 商家端同步 `canceled` 且不可继续推进 | `CHAIN-002` |

## 5. 覆盖结论

- 页面覆盖：miniapp 全页面 + merchant-web 全页面。
- 分支覆盖：UI 可达分支全部 UI E2E 覆盖，UI 不可达异常分支由 API-only 补齐。
- 边界覆盖：库存、起送价、字段校验、状态机非法迁移、商家缺失、角色限制等全部落在可执行用例中。
