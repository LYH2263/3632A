import { expect, test, type Page } from '@playwright/test';
import { gotoMiniapp, setStorageJSON } from '../../../helpers/runtime';
import { STORAGE_KEYS } from '../../../helpers/keys';

type OrderStatus = 'pending' | 'confirmed' | 'delivering' | 'completed' | 'canceled';

function buildOrder(id: number, status: OrderStatus, createdAt: string) {
  return {
    id,
    order_no: `CS20250225${id}`,
    buyer_id: 1,
    merchant_id: 1,
    status,
    pay_method: 'offline',
    receiver_name: '张三',
    receiver_phone: '13800138000',
    receiver_address: '幸福社区 8 栋',
    remark: '测试订单',
    items_amount: 27.2,
    delivery_fee: 3,
    total_amount: 30.2,
    items_snapshot: [
      {
        product_id: 1001,
        name: '红富士苹果',
        unit: '斤',
        price: 6.8,
        quantity: 4,
        subtotal: 27.2
      }
    ],
    created_at: createdAt,
    updated_at: createdAt
  };
}

async function setBuyerAuth(page: Page): Promise<void> {
  await setStorageJSON(page, STORAGE_KEYS.authMiniapp, {
    id: 1,
    username: 'buyer',
    role: 'buyer',
    nickname: '社区住户',
    phone: '13800138000'
  });
}

async function setMerchantAuth(page: Page): Promise<void> {
  await setStorageJSON(page, STORAGE_KEYS.authMiniapp, {
    id: 2,
    username: 'merchant_fruit',
    role: 'merchant',
    nickname: '鲜果超市店主',
    phone: '13900001111',
    merchant_id: 1
  });
}

test.describe('UI-MOCK Order Pages', () => {
  test('ORDER-MOCK-001 订单列表空态', async ({ page }) => {
    await gotoMiniapp(page, '/pages/order/list', 'mock');
    await expect(page.getByTestId('order-list-empty')).toBeVisible();
  });

  test('ORDER-MOCK-002 订单列表排序与刷新', async ({ page }) => {
    await gotoMiniapp(page, '/pages/home/index', 'mock');
    await setBuyerAuth(page);

    await setStorageJSON(page, STORAGE_KEYS.orders, [
      buildOrder(101, 'pending', '2026-02-25T08:00:00.000Z'),
      buildOrder(102, 'pending', '2026-02-25T09:00:00.000Z')
    ]);

    await page.goto('http://127.0.0.1:4173/pages/order/list');

    const firstOrderNo = page.locator('[data-testid^="order-list-order-no-"]').first();
    await expect(firstOrderNo).toContainText('CS20250225102');

    await page.getByTestId('order-list-refresh').click();
    await expect(firstOrderNo).toContainText('CS20250225102');
  });

  test('ORDER-MOCK-003 订单详情不存在分支', async ({ page }) => {
    await gotoMiniapp(page, '/pages/order/detail?orderId=99999', 'mock');
    await expect(page.getByTestId('order-detail-not-found')).toBeVisible();
  });

  test('ORDER-MOCK-004 买家取消 pending 订单', async ({ page }) => {
    await gotoMiniapp(page, '/pages/home/index', 'mock');
    await setBuyerAuth(page);
    await setStorageJSON(page, STORAGE_KEYS.orders, [
      buildOrder(201, 'pending', '2026-02-25T10:00:00.000Z')
    ]);

    await page.goto('http://127.0.0.1:4173/pages/order/detail?orderId=201');
    await expect(page.getByTestId('order-detail-cancel-btn')).toBeVisible();

    await page.getByTestId('order-detail-cancel-btn').click();
    await expect(page.getByTestId('order-status-canceled')).toBeVisible();
  });

  test('ORDER-MOCK-005 商家推进状态到 completed 后无后续状态', async ({ page }) => {
    await gotoMiniapp(page, '/pages/home/index', 'mock');
    await setMerchantAuth(page);
    await setStorageJSON(page, STORAGE_KEYS.orders, [
      buildOrder(301, 'pending', '2026-02-25T11:00:00.000Z')
    ]);

    await page.goto('http://127.0.0.1:4173/pages/order/detail?orderId=301');

    await page.getByTestId('order-detail-status-confirmed').click();
    await expect(page.getByTestId('order-status-confirmed')).toBeVisible();

    await page.getByTestId('order-detail-status-delivering').click();
    await expect(page.getByTestId('order-status-delivering')).toBeVisible();

    await page.getByTestId('order-detail-status-completed').click();
    await expect(page.getByTestId('order-status-completed')).toBeVisible();
    await expect(page.getByTestId('order-detail-no-next-status')).toBeVisible();
  });
});
