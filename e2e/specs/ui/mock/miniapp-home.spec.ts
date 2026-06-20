import { expect, test } from '@playwright/test';
import { seedMerchants } from '@community-store/shared';
import { fillByTestId, gotoMiniapp, setStorageJSON } from '../../../helpers/runtime';
import { STORAGE_KEYS } from '../../../helpers/keys';

test.describe('UI-MOCK Home', () => {
  test('HOME-MOCK-001 商家列表与休息中不可进店分支', async ({ page }) => {
    await gotoMiniapp(page, '/pages/home/index', 'mock');

    await expect(page.getByTestId('home-merchant-card-1')).toBeVisible();
    await expect(page.getByTestId('home-merchant-card-2')).toBeVisible();

    const patched = seedMerchants.map((item) =>
      item.id === 2 ? { ...item, is_open: false } : { ...item }
    );

    await setStorageJSON(page, STORAGE_KEYS.merchants, patched);
    await page.reload();

    await expect(page.getByTestId('home-merchant-status-2')).toContainText('休息中');
    const restButton = page.getByTestId('home-enter-merchant-2');
    await expect
      .poll(async () =>
        restButton.evaluate((element) => {
          const attrDisabled = element.getAttribute('disabled');
          const ariaDisabled = element.getAttribute('aria-disabled');
          const className = element.getAttribute('class') ?? '';
          return attrDisabled !== null || ariaDisabled === 'true' || className.includes('disabled');
        })
      )
      .toBeTruthy();

    await restButton.click({ timeout: 1_000 }).catch(() => undefined);
    await expect(page).toHaveURL(/\/pages\/home\/index/);
  });

  test('HOME-MOCK-002 搜索无结果分支', async ({ page }) => {
    await gotoMiniapp(page, '/pages/home/index', 'mock');

    await fillByTestId(page, 'home-search-input', '不存在的商家');
    await expect(page.getByTestId('home-empty')).toBeVisible();
  });
});
