import { expect, test } from '@playwright/test';
import { apiGet, apiPatch, resetBackendData, tokenOf } from '../../../helpers/backend';
import { expectApiError, expectApiSuccess } from '../../../helpers/assertions';

test.describe('API-ONLY /merchants', () => {
  test.beforeAll(() => {
    resetBackendData();
  });

  test('API-MERCHANT-001 获取商家列表成功', async ({ request }) => {
    const merchants = await expectApiSuccess<Array<{ id: number; name: string }>>(
      await apiGet(request, '/merchants')
    );

    expect(merchants.length).toBeGreaterThanOrEqual(2);
    expect(merchants.some((item) => item.name === '鲜果超市')).toBe(true);
  });

  test('API-MERCHANT-002 更新商家成功', async ({ request }) => {
    const updated = await expectApiSuccess<{ delivery_note: string }>(
      await apiPatch(request, '/merchants/1', {
        delivery_note: 'API E2E 更新配送说明'
      }, { token: tokenOf(2) })
    );

    expect(updated.delivery_note).toBe('API E2E 更新配送说明');
  });

  test('API-MERCHANT-003 商家不存在返回 404', async ({ request }) => {
    await expectApiError(
      await apiPatch(request, '/merchants/99999', {
        delivery_note: '不会成功'
      }, { token: tokenOf(2) }),
      404,
      '商家不存在'
    );
  });
});
