import { expect, test } from '@playwright/test';
import { fillByTestId, gotoMiniapp } from '../../../helpers/runtime';
import { resetBackendData } from '../../../helpers/backend';

test.describe('UI-API Miniapp', () => {
  test.beforeAll(() => {
    resetBackendData();
  });

  test('MINIAPP-API-001 全页面可达与不存在分支', async ({ page }) => {
    await gotoMiniapp(page, '/pages/home/index', 'api');
    await expect(page.locator('[data-testid^="home-merchant-card-"]').first()).toBeVisible();

    await page.goto('http://127.0.0.1:4173/pages/shop/detail?merchantId=99999');
    await expect(page.getByTestId('shop-merchant-not-found')).toBeVisible();

    await page.goto('http://127.0.0.1:4173/pages/product/detail?merchantId=1&productId=99999');
    await expect(page.getByTestId('product-not-found')).toBeVisible();

    await page.goto('http://127.0.0.1:4173/pages/cart/checkout');
    await expect(page.getByTestId('checkout-merchant-missing')).toBeVisible();

    await page.goto('http://127.0.0.1:4173/pages/order/list');
    await expect(page.getByTestId('order-list-empty')).toBeVisible();
  });

  test('MINIAPP-API-002 下单成功并取消 pending 订单', async ({ page }) => {
    await gotoMiniapp(page, '/pages/shop/detail?merchantId=1', 'api');

    const firstPlusButton = page.locator('[data-testid^="shop-plus-"]').first();
    await firstPlusButton.click();
    await firstPlusButton.click();
    await firstPlusButton.click();
    await firstPlusButton.click();

    await page.getByTestId('shop-go-checkout').click();
    await expect(page.getByTestId('checkout-page')).toBeVisible();

    await fillByTestId(page, 'checkout-receiver-name', '张三');
    await fillByTestId(page, 'checkout-receiver-phone', '13800138000');
    await fillByTestId(page, 'checkout-receiver-address', '幸福社区 8 栋');
    await page.getByTestId('checkout-submit').click();

    await expect(page).toHaveURL(/\/pages\/order\/detail\?orderId=\d+/);
    await expect(page.getByTestId('order-status-pending')).toBeVisible();
    await expect(page.getByTestId('order-detail-shipment-table')).toBeVisible();
    await expect(page.getByTestId('order-detail-price-table')).toBeVisible();

    await page.getByTestId('order-detail-cancel-btn').click();
    await expect(page.getByTestId('order-status-canceled')).toBeVisible();
  });
});
