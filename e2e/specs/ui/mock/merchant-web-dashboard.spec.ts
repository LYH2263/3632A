import { expect, test, type Page } from '@playwright/test';
import { gotoMerchantWeb, setStorageJSON } from '../../../helpers/runtime';
import { expectLatestToastContains } from '../../../helpers/assertions';
import { STORAGE_KEYS } from '../../../helpers/keys';

function loginUsernameInput(page: Page) {
  return page.getByPlaceholder('merchant_fruit');
}

function loginPasswordInput(page: Page) {
  return page.locator('input[type="password"]').first();
}

function merchantFormInput(page: Page, label: string) {
  return page
    .locator('.el-form-item')
    .filter({ hasText: label })
    .locator('input')
    .first();
}

function dialogInput(page: Page, label: string) {
  return page
    .locator('.el-dialog')
    .filter({ has: page.locator('.el-dialog__header') })
    .locator('.el-form-item')
    .filter({ hasText: label })
    .locator('input')
    .first();
}

async function loginAsMerchant(page: Page): Promise<void> {
  await gotoMerchantWeb(page, '/login', 'mock');
  await loginUsernameInput(page).fill('merchant_fruit');
  await loginPasswordInput(page).fill('merchant123');
  await page.getByTestId('web-login-submit').click();
  await expect(page.getByTestId('web-dashboard-page')).toBeVisible();
}

test.describe('UI-MOCK Merchant Web Dashboard', () => {
  test('WEB-DASH-MOCK-001 商家不存在边界', async ({ page }) => {
    await gotoMerchantWeb(page, '/login', 'mock');

    await setStorageJSON(page, STORAGE_KEYS.authMerchantWeb, {
      id: 2,
      username: 'merchant_fruit',
      role: 'merchant',
      nickname: '鲜果超市店主',
      phone: '13900001111',
      merchant_id: 999
    });

    await page.goto('http://127.0.0.1:4174/dashboard');
    await expect(page.getByTestId('web-dashboard-empty')).toBeVisible();
    await expectLatestToastContains(page, '商家不存在');
  });

  test('WEB-DASH-MOCK-002 店铺信息保存', async ({ page }) => {
    await loginAsMerchant(page);

    await merchantFormInput(page, '配送说明').fill('E2E 商家端配送说明');
    await page.getByTestId('web-merchant-save').click();

    await expectLatestToastContains(page, '店铺信息已保存');
  });

  test('WEB-DASH-MOCK-003 商品新增/编辑/上下架与校验', async ({ page }) => {
    await loginAsMerchant(page);

    await page.getByTestId('web-product-open-create').click();
    await page.getByTestId('web-product-save').click();
    await expectLatestToastContains(page, '商品名不能为空');

    const productName = `WEB-E2E-${Date.now()}`;
    await dialogInput(page, '商品名').fill(productName);
    await dialogInput(page, '价格').fill('12.5');
    await dialogInput(page, '单位').fill('份');
    await dialogInput(page, '库存').fill('10');
    await page.getByTestId('web-product-save').click();
    await expectLatestToastContains(page, '商品已新增');

    const row = page.locator('.el-table__row').filter({ hasText: productName });
    await expect(row).toBeVisible();
    await row.getByRole('button', { name: '编辑' }).click();

    await dialogInput(page, '商品名').fill(`${productName}-改`);
    await page.getByTestId('web-product-save').click();
    await expectLatestToastContains(page, '商品已更新');

    const updatedRow = page.locator('.el-table__row').filter({ hasText: `${productName}-改` });
    await expect(updatedRow).toBeVisible();
    await updatedRow.getByRole('button', { name: '下架' }).click();
    await expectLatestToastContains(page, '商品状态已更新');
  });

  test('WEB-DASH-MOCK-004 订单推进状态', async ({ page }) => {
    await loginAsMerchant(page);

    await setStorageJSON(page, STORAGE_KEYS.orders, [
      {
        id: 8801,
        order_no: 'CS202502258801',
        buyer_id: 1,
        merchant_id: 1,
        status: 'pending',
        pay_method: 'offline',
        receiver_name: '张三',
        receiver_phone: '13800138000',
        receiver_address: '幸福社区 8 栋',
        remark: '商家端推进测试',
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
        created_at: '2026-02-25T12:30:00.000Z',
        updated_at: '2026-02-25T12:30:00.000Z'
      }
    ]);

    await page.reload();

    await page.getByTestId('web-order-status-8801-confirmed').click();
    await expectLatestToastContains(page, '订单状态已更新');
    await expect(page.getByTestId('web-order-status-8801-delivering')).toBeVisible();
  });
});
