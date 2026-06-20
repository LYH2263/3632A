import { expect, test } from '@playwright/test';
import { seedProducts } from '@community-store/shared';
import {
  clearDialogs,
  gotoMiniapp,
  queueConfirmResponse,
  setStorageJSON
} from '../../../helpers/runtime';
import { expectLatestDialogContains } from '../../../helpers/assertions';
import { STORAGE_KEYS } from '../../../helpers/keys';

test.describe('UI-MOCK Product Detail', () => {
  test('PRODUCT-MOCK-001 商品不存在分支', async ({ page }) => {
    await gotoMiniapp(page, '/pages/product/detail?merchantId=1&productId=99999', 'mock');
    await expect(page.getByTestId('product-not-found')).toBeVisible();
  });

  test('PRODUCT-MOCK-002 数量下限守卫', async ({ page }) => {
    await gotoMiniapp(page, '/pages/product/detail?merchantId=1&productId=1001', 'mock');
    await page.getByTestId('product-minus').click();
    await expect(page.getByTestId('product-quantity')).toHaveText('1');
  });

  test('PRODUCT-MOCK-003 超库存边界提示', async ({ page }) => {
    await gotoMiniapp(page, '/pages/product/detail?merchantId=1&productId=1001', 'mock');

    const patched = seedProducts.map((item) =>
      item.id === 1001 ? { ...item, stock: 1 } : item
    );
    await setStorageJSON(page, STORAGE_KEYS.products, patched);
    await page.reload();

    await page.getByTestId('product-plus').click();
    await expectLatestDialogContains(page, '超过库存上限');
  });

  test('PRODUCT-MOCK-004 加购成功与跨商家冲突双分支', async ({ page }) => {
    await gotoMiniapp(page, '/pages/product/detail?merchantId=1&productId=1001', 'mock');
    await page.getByTestId('product-add-cart').click();
    await expectLatestDialogContains(page, '已加入购物车');

    await page.goto('http://127.0.0.1:4173/pages/product/detail?merchantId=2&productId=2001');

    await queueConfirmResponse(page, false);
    await clearDialogs(page);
    await page.getByTestId('product-add-cart').click();
    await expectLatestDialogContains(page, '订单仅支持单商家', 'confirm');

    await queueConfirmResponse(page, true);
    await clearDialogs(page);
    await page.getByTestId('product-add-cart').click();
    await expectLatestDialogContains(page, '订单仅支持单商家', 'confirm');
    await expectLatestDialogContains(page, '已加入购物车', 'alert');
  });
});
