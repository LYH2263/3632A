import { expect, test, type Page } from '@playwright/test';
import { seedProducts } from '@community-store/shared';
import {
  MINIAPP_BASE_URL,
  clearDialogs,
  fillByTestId,
  gotoMiniapp,
  setStorageJSON
} from '../../../helpers/runtime';
import { expectLatestDialogContains } from '../../../helpers/assertions';
import { STORAGE_KEYS } from '../../../helpers/keys';

async function openCheckoutWithCart(
  page: Page,
  cartItems: Array<{ product_id: number; quantity: number }>,
  merchantId = 1
): Promise<void> {
  await gotoMiniapp(page, '/pages/home/index', 'mock');

  await setStorageJSON(page, STORAGE_KEYS.cart, {
    merchant_id: merchantId,
    items: cartItems,
    updated_at: new Date().toISOString()
  });

  await page.goto(`${MINIAPP_BASE_URL}/pages/cart/checkout?merchantId=${merchantId}`);
}

async function fillCheckoutForm(page: Page): Promise<void> {
  await fillByTestId(page, 'checkout-receiver-name', '张三');
  await fillByTestId(page, 'checkout-receiver-phone', '13800138000');
  await fillByTestId(page, 'checkout-receiver-address', '幸福社区 8 栋');
  await fillByTestId(page, 'checkout-remark', 'E2E 备注');
}

test.describe('UI-MOCK Checkout', () => {
  test('CHECKOUT-MOCK-001 商家缺失分支', async ({ page }) => {
    await gotoMiniapp(page, '/pages/cart/checkout', 'mock');
    await expect(page.getByTestId('checkout-merchant-missing')).toBeVisible();
  });

  test('CHECKOUT-MOCK-002 空购物车与表单校验边界', async ({ page }) => {
    await openCheckoutWithCart(page, [], 1);
    await expect(page.getByTestId('checkout-cart-empty')).toBeVisible();

    await page.getByTestId('checkout-submit').click();
    await expectLatestDialogContains(page, '收货人姓名必填');

    await fillByTestId(page, 'checkout-receiver-name', '张三');
    await clearDialogs(page);
    await page.getByTestId('checkout-submit').click();
    await expectLatestDialogContains(page, '手机号必填');

    await fillByTestId(page, 'checkout-receiver-phone', '123');
    await clearDialogs(page);
    await page.getByTestId('checkout-submit').click();
    await expectLatestDialogContains(page, '手机号格式错误');

    // 重开页面避免 uni-input 在同一用例内多次覆写值时出现平台差异。
    await openCheckoutWithCart(page, [], 1);
    await fillByTestId(page, 'checkout-receiver-name', '张三');
    await fillByTestId(page, 'checkout-receiver-phone', '13800138000');
    await clearDialogs(page);
    await page.getByTestId('checkout-submit').click();
    await expectLatestDialogContains(page, '收货地址必填');
  });

  test('CHECKOUT-MOCK-003 未达起送价阻断下单', async ({ page }) => {
    await openCheckoutWithCart(page, [{ product_id: 1001, quantity: 1 }], 1);
    await fillCheckoutForm(page);

    await page.getByTestId('checkout-submit').click();
    await expectLatestDialogContains(page, '未达到起送价');
    await expect(page).toHaveURL(/\/pages\/cart\/checkout/);
  });

  test('CHECKOUT-MOCK-004 成功下单跳转详情', async ({ page }) => {
    await openCheckoutWithCart(page, [{ product_id: 1001, quantity: 4 }], 1);
    await fillCheckoutForm(page);

    await page.getByTestId('checkout-submit').click();

    await expect(page).toHaveURL(/\/pages\/order\/detail\?orderId=\d+/);
    await expect(page.getByTestId('order-detail-page')).toBeVisible();
    await expect(page.getByTestId('order-status-pending')).toBeVisible();
  });

  test('CHECKOUT-MOCK-005 越库存阻断下单', async ({ page }) => {
    await gotoMiniapp(page, '/pages/home/index', 'mock');

    const patchedProducts = seedProducts.map((item) =>
      item.id === 1001 ? { ...item, stock: 1 } : item
    );
    await setStorageJSON(page, STORAGE_KEYS.products, patchedProducts);

    await setStorageJSON(page, STORAGE_KEYS.cart, {
      merchant_id: 1,
      items: [{ product_id: 1001, quantity: 2 }],
      updated_at: new Date().toISOString()
    });

    await page.goto(`${MINIAPP_BASE_URL}/pages/cart/checkout?merchantId=1`);
    await fillCheckoutForm(page);

    await page.getByTestId('checkout-submit').click();
    await expectLatestDialogContains(page, '超过库存限制');
    await expect(page).toHaveURL(/\/pages\/cart\/checkout/);
  });
});
