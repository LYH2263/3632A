import { expect, test } from '@playwright/test';
import { fillByTestId, gotoMerchantWeb, gotoMiniapp } from '../../helpers/runtime';
import { resetBackendData } from '../../helpers/backend';

function loginUsernameInput(page: import('@playwright/test').Page) {
  return page.getByPlaceholder('merchant_fruit');
}

function loginPasswordInput(page: import('@playwright/test').Page) {
  return page.locator('input[type="password"]').first();
}

async function createOrderByMiniapp(page: import('@playwright/test').Page): Promise<{ orderId: number; orderNo: string }> {
  await gotoMiniapp(page, '/pages/shop/detail?merchantId=1', 'api');

  const firstPlusButton = page.locator('[data-testid^="shop-plus-"]').first();
  await firstPlusButton.click();
  await firstPlusButton.click();
  await firstPlusButton.click();
  await firstPlusButton.click();
  await page.getByTestId('shop-go-checkout').click();

  await fillByTestId(page, 'checkout-receiver-name', '张三');
  await fillByTestId(page, 'checkout-receiver-phone', '13800138000');
  await fillByTestId(page, 'checkout-receiver-address', '幸福社区 8 栋');
  await page.getByTestId('checkout-submit').click();

  await expect(page).toHaveURL(/\/pages\/order\/detail\?orderId=\d+/);

  const url = new URL(page.url());
  const orderId = Number(url.searchParams.get('orderId'));
  const orderNoText = (await page.getByTestId('order-detail-order-no').textContent()) ?? '';

  return {
    orderId,
    orderNo: orderNoText.replace('订单号：', '').trim()
  };
}

async function loginMerchantWeb(page: import('@playwright/test').Page): Promise<void> {
  await gotoMerchantWeb(page, '/login', 'api');
  await loginUsernameInput(page).fill('merchant_fruit');
  await loginPasswordInput(page).fill('merchant123');
  await page.getByTestId('web-login-submit').click();
  await expect(page).toHaveURL(/\/dashboard/);
}

test.describe('FULL CHAIN API', () => {
  test.beforeEach(() => {
    resetBackendData();
  });

  test('CHAIN-001 买家下单 -> 商家推进 -> 买家同步完成', async ({ page }) => {
    const { orderId, orderNo } = await createOrderByMiniapp(page);

    await loginMerchantWeb(page);
    const row = page.locator('.el-table__row').filter({ hasText: orderNo });
    await expect(row).toBeVisible();

    await page.getByTestId(`web-order-status-${orderId}-confirmed`).click();
    await page.getByTestId(`web-order-status-${orderId}-delivering`).click();
    await page.getByTestId(`web-order-status-${orderId}-completed`).click();

    await page.goto(`http://127.0.0.1:4173/pages/order/detail?orderId=${orderId}`);
    await expect(page.getByTestId('order-status-completed')).toBeVisible();
  });

  test('CHAIN-002 买家取消 pending 后商家侧同步 canceled 且不可推进', async ({ page }) => {
    const { orderId, orderNo } = await createOrderByMiniapp(page);

    await page.getByTestId('order-detail-cancel-btn').click();
    await expect(page.getByTestId('order-status-canceled')).toBeVisible();

    await loginMerchantWeb(page);
    const row = page.locator('.el-table__row').filter({ hasText: orderNo });
    await expect(row).toContainText('已取消');
    await expect(row.locator('[data-testid^="web-order-status-"]')).toHaveCount(0);

    await page.goto(`http://127.0.0.1:4173/pages/order/detail?orderId=${orderId}`);
    await expect(page.getByTestId('order-status-canceled')).toBeVisible();
  });
});
