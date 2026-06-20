import { expect, test } from '@playwright/test';
import { gotoMiniapp, setStorageJSON } from '../../../helpers/runtime';
import { STORAGE_KEYS } from '../../../helpers/keys';

test.describe('UI-MOCK App Shell', () => {
  test('APP-MOCK-001 角色切换 buyer/merchant', async ({ page }) => {
    await gotoMiniapp(page, '/pages/home/index', 'mock');

    const roleSelect = page.getByTestId('app-role-select');
    await expect(roleSelect).toHaveValue('buyer');

    await roleSelect.selectOption('merchant');
    await expect(page.getByTestId('app-merchant-select')).toBeVisible();

    await roleSelect.selectOption('buyer');
    await expect(page.getByTestId('app-merchant-select')).toHaveCount(0);
  });

  test('APP-MOCK-002 merchantId 非法时回退到首个商家', async ({ page }) => {
    await gotoMiniapp(page, '/pages/home/index', 'mock');

    await setStorageJSON(page, STORAGE_KEYS.authMiniapp, {
      id: 2,
      username: 'merchant_fruit',
      role: 'merchant',
      nickname: '测试商家',
      phone: '13900000000',
      merchant_id: 999
    });

    await page.reload();

    await expect(page.getByTestId('app-role-select')).toHaveValue('merchant');
    await expect(page.getByTestId('app-merchant-select')).toHaveValue('1');
  });
});
