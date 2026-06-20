import { expect, test } from '@playwright/test';
import { gotoMerchantWeb } from '../../../helpers/runtime';
import { apiPost, resetBackendData } from '../../../helpers/backend';
import { expectApiSuccess, expectLatestToastContains } from '../../../helpers/assertions';

function loginUsernameInput(page: import('@playwright/test').Page) {
  return page.getByPlaceholder('merchant_fruit');
}

function loginPasswordInput(page: import('@playwright/test').Page) {
  return page.locator('input[type="password"]').first();
}

test.describe('UI-API Merchant Web', () => {
  test.beforeAll(() => {
    resetBackendData();
  });

  test('WEB-API-001 非商家账号登录分支', async ({ page }) => {
    await gotoMerchantWeb(page, '/login', 'api');

    await loginUsernameInput(page).fill('buyer');
    await loginPasswordInput(page).fill('buyer123');
    await page.getByTestId('web-login-submit').click();

    await expectLatestToastContains(page, '当前账号不是商家角色');
    await expect(page).toHaveURL(/\/login/);
  });

  test('WEB-API-002 商家登录并推进订单状态', async ({ page, request }) => {
    const order = await expectApiSuccess<{ id: number; order_no: string }>(
      await apiPost(request, '/orders', {
        buyer_id: 1,
        merchant_id: 1,
        receiver_name: '张三',
        receiver_phone: '13800138000',
        receiver_address: '幸福社区 8 栋',
        remark: 'UI API 测试',
        cart_items: [{ product_id: 1, quantity: 4 }]
      }),
      201
    );

    await gotoMerchantWeb(page, '/login', 'api');

    await loginUsernameInput(page).fill('merchant_fruit');
    await loginPasswordInput(page).fill('merchant123');
    await page.getByTestId('web-login-submit').click();

    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.locator('.el-table__row').filter({ hasText: order.order_no })).toBeVisible();

    await page.getByTestId(`web-order-status-${order.id}-confirmed`).click();
    await expectLatestToastContains(page, '订单状态已更新');
    await expect(page.getByTestId(`web-order-status-${order.id}-delivering`)).toBeVisible();
  });
});
