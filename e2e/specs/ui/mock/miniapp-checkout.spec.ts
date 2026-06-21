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
import { DEFAULT_MOCK_ADDRESS, STORAGE_KEYS } from '../../../helpers/keys';

async function seedMockCheckoutAddress(page: Page): Promise<void> {
  await setStorageJSON(page, STORAGE_KEYS.addresses, [DEFAULT_MOCK_ADDRESS]);
}

async function openCheckoutWithCart(
  page: Page,
  cartItems: Array<{ product_id: number; quantity: number }>,
  merchantId = 1
): Promise<void> {
  await gotoMiniapp(page, '/pages/home/index', 'mock');
  await seedMockCheckoutAddress(page);

  await setStorageJSON(page, STORAGE_KEYS.cart, {
    merchant_id: merchantId,
    items: cartItems,
    updated_at: new Date().toISOString()
  });

  await page.goto(`${MINIAPP_BASE_URL}/pages/cart/checkout?merchantId=${merchantId}`);
}

async function fillCheckoutRemark(page: Page): Promise<void> {
  await fillByTestId(page, 'checkout-remark', 'E2E 备注');
}

test.describe('UI-MOCK Checkout', () => {
  test('CHECKOUT-MOCK-001 商家缺失分支', async ({ page }) => {
    await gotoMiniapp(page, '/pages/cart/checkout', 'mock');
    await expect(page.getByTestId('checkout-merchant-missing')).toBeVisible();
  });

  test('CHECKOUT-MOCK-002 空购物车与地址校验边界', async ({ page }) => {
    await openCheckoutWithCart(page, [], 1);
    await expect(page.getByTestId('checkout-cart-empty')).toBeVisible();

    await page.getByTestId('checkout-submit').click();
    await expectLatestDialogContains(page, '购物车为空');

    await setStorageJSON(page, STORAGE_KEYS.addresses, []);
    await page.reload();
    await expect(page.getByTestId('checkout-address-empty')).toBeVisible();

    await page.getByTestId('checkout-submit').click();
    await expectLatestDialogContains(page, '请选择收货地址');
  });

  test('CHECKOUT-MOCK-003 未达起送价阻断下单', async ({ page }) => {
    await openCheckoutWithCart(page, [{ product_id: 1001, quantity: 1 }], 1);
    await fillCheckoutRemark(page);

    await page.getByTestId('checkout-submit').click();
    await expectLatestDialogContains(page, '未达到起送价');
    await expect(page).toHaveURL(/\/pages\/cart\/checkout/);
  });

  test('CHECKOUT-MOCK-004 成功下单跳转详情', async ({ page }) => {
    await openCheckoutWithCart(page, [{ product_id: 1001, quantity: 4 }], 1);
    await expect(page.getByTestId('checkout-selected-name')).toHaveText('张三');
    await fillCheckoutRemark(page);

    await page.getByTestId('checkout-submit').click();

    await expect(page).toHaveURL(/\/pages\/order\/detail\?orderId=\d+/);
    await expect(page.getByTestId('order-detail-page')).toBeVisible();
    await expect(page.getByTestId('order-status-pending')).toBeVisible();
  });

  test('CHECKOUT-MOCK-005 越库存阻断下单', async ({ page }) => {
    await gotoMiniapp(page, '/pages/home/index', 'mock');
    await seedMockCheckoutAddress(page);

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
    await fillCheckoutRemark(page);

    await page.getByTestId('checkout-submit').click();
    await expectLatestDialogContains(page, '超过库存限制');
    await expect(page).toHaveURL(/\/pages\/cart\/checkout/);
  });
});
