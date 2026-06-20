import { expect, test } from '@playwright/test';
import { seedProducts } from '@community-store/shared';
import {
  clearDialogs,
  fillByTestId,
  gotoMiniapp,
  queueConfirmResponse,
  setStorageJSON
} from '../../../helpers/runtime';
import { expectLatestDialogContains } from '../../../helpers/assertions';
import { STORAGE_KEYS } from '../../../helpers/keys';

test.describe('UI-MOCK Shop Detail', () => {
  test('SHOP-MOCK-001 商家不存在分支', async ({ page }) => {
    await gotoMiniapp(page, '/pages/shop/detail?merchantId=999', 'mock');
    await expect(page.getByTestId('shop-merchant-not-found')).toBeVisible();
  });

  test('SHOP-MOCK-002 搜索命中/无结果 + 不限库存边界', async ({ page }) => {
    await gotoMiniapp(page, '/pages/shop/detail?merchantId=2', 'mock');

    await expect(page.getByTestId('shop-product-stock-2002')).toContainText('不限');

    await fillByTestId(page, 'shop-search-input', '牛奶');
    await expect(page.getByTestId('shop-product-card-2001')).toBeVisible();

    await fillByTestId(page, 'shop-search-input', '不存在的商品');
    await expect(page.getByTestId('shop-products-empty')).toBeVisible();
  });

  test('SHOP-MOCK-003 加减购与金额汇总', async ({ page }) => {
    await gotoMiniapp(page, '/pages/shop/detail?merchantId=1', 'mock');

    await page.getByTestId('shop-plus-1001').click();
    await expect(page.getByTestId('shop-quantity-1001')).toHaveText('1');
    await expect(page.getByTestId('shop-total-count')).toContainText('1 件');

    await page.getByTestId('shop-minus-1001').click();
    await expect(page.getByTestId('shop-quantity-1001')).toHaveText('0');
    await expect(page.getByTestId('shop-total-count')).toContainText('0 件');
  });

  test('SHOP-MOCK-006 页面重载后购物车恢复与金额正确', async ({ page }) => {
    await gotoMiniapp(page, '/pages/shop/detail?merchantId=1', 'mock');

    await page.getByTestId('shop-plus-1001').click();
    await page.getByTestId('shop-plus-1002').click();
    await expect(page.getByTestId('shop-total-count')).toContainText('2 件');

    const amountBeforeReload = await page.getByTestId('shop-total-amount').innerText();

    await page.reload();

    await expect(page.getByTestId('shop-quantity-1001')).toHaveText('1');
    await expect(page.getByTestId('shop-quantity-1002')).toHaveText('1');
    await expect(page.getByTestId('shop-total-count')).toContainText('2 件');
    await expect(page.getByTestId('shop-total-amount')).toHaveText(amountBeforeReload);
  });

  test('SHOP-MOCK-004 跨商家冲突弹窗取消/确认双分支', async ({ page }) => {
    await gotoMiniapp(page, '/pages/shop/detail?merchantId=1', 'mock');
    await page.getByTestId('shop-plus-1001').click();
    await expect(page.getByTestId('shop-quantity-1001')).toHaveText('1');

    await page.goto('http://127.0.0.1:4173/pages/shop/detail?merchantId=2');

    await queueConfirmResponse(page, false);
    await page.getByTestId('shop-plus-2001').click();
    await expectLatestDialogContains(page, '订单仅支持单商家', 'confirm');
    await expect(page.getByTestId('shop-quantity-2001')).toHaveText('0');

    await clearDialogs(page);
    await queueConfirmResponse(page, true);
    await page.getByTestId('shop-plus-2001').click();
    await expectLatestDialogContains(page, '订单仅支持单商家', 'confirm');
    await expect(page.getByTestId('shop-quantity-2001')).toHaveText('1');

    await page.goto('http://127.0.0.1:4173/pages/shop/detail?merchantId=1');
    await expect(page.getByTestId('shop-quantity-1001')).toHaveText('0');
  });

  test('SHOP-MOCK-005 超库存边界', async ({ page }) => {
    await gotoMiniapp(page, '/pages/shop/detail?merchantId=1', 'mock');

    const patched = seedProducts.map((item) =>
      item.id === 1001 ? { ...item, stock: 1 } : item
    );

    await setStorageJSON(page, STORAGE_KEYS.products, patched);
    await page.reload();

    await page.getByTestId('shop-plus-1001').click();
    await clearDialogs(page);
    await page.getByTestId('shop-plus-1001').click();

    await expectLatestDialogContains(page, '超过库存上限');
  });
});
