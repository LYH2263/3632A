import { expect, test } from '@playwright/test';
import { gotoMerchantWeb } from '../../../helpers/runtime';
import { expectLatestToastContains } from '../../../helpers/assertions';

function loginUsernameInput(page: import('@playwright/test').Page) {
  return page.getByPlaceholder('merchant_fruit');
}

function loginPasswordInput(page: import('@playwright/test').Page) {
  return page.locator('input[type="password"]').first();
}

test.describe('UI-MOCK Merchant Web Login', () => {
  test('WEB-LOGIN-MOCK-001 路由守卫：未登录访问 dashboard 跳转 login', async ({ page }) => {
    await gotoMerchantWeb(page, '/dashboard', 'mock');
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByTestId('web-login-card')).toBeVisible();
  });

  test('WEB-LOGIN-MOCK-002 空账号密码边界', async ({ page }) => {
    await gotoMerchantWeb(page, '/login', 'mock');

    await loginUsernameInput(page).fill('');
    await loginPasswordInput(page).fill('');
    await page.getByTestId('web-login-submit').click();

    await expectLatestToastContains(page, '请输入账号密码');
  });

  test('WEB-LOGIN-MOCK-003 错误凭证分支', async ({ page }) => {
    await gotoMerchantWeb(page, '/login', 'mock');

    await loginUsernameInput(page).fill('merchant_fruit');
    await loginPasswordInput(page).fill('wrong-password');
    await page.getByTestId('web-login-submit').click();

    await expectLatestToastContains(page, '账号或密码错误');
  });

  test('WEB-LOGIN-MOCK-004 登录成功', async ({ page }) => {
    await gotoMerchantWeb(page, '/login', 'mock');

    await loginUsernameInput(page).fill('merchant_fruit');
    await loginPasswordInput(page).fill('merchant123');
    await page.getByTestId('web-login-submit').click();

    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByTestId('web-dashboard-page')).toBeVisible();
  });
});
