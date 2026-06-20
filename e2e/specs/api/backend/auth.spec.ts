import { expect, test } from '@playwright/test';
import { apiPost, resetBackendData } from '../../../helpers/backend';
import { expectApiError, expectApiSuccess } from '../../../helpers/assertions';

test.describe('API-ONLY /auth/login', () => {
  test.beforeAll(() => {
    resetBackendData();
  });

  test('API-AUTH-001 买家与商家登录成功', async ({ request }) => {
    const buyer = await expectApiSuccess<{ token: string; user: { role: string } }>(
      await apiPost(request, '/auth/login', {
        username: 'buyer',
        password: 'buyer123'
      })
    );
    expect(buyer.token).toContain('django-token-');
    expect(buyer.user.role).toBe('buyer');

    const merchant = await expectApiSuccess<{ token: string; user: { role: string } }>(
      await apiPost(request, '/auth/login', {
        username: 'merchant_fruit',
        password: 'merchant123'
      })
    );
    expect(merchant.user.role).toBe('merchant');
  });

  test('API-AUTH-002 错误凭证返回 401', async ({ request }) => {
    await expectApiError(
      await apiPost(request, '/auth/login', {
        username: 'buyer',
        password: 'wrong-password'
      }),
      401,
      '账号或密码错误'
    );
  });

  test('API-AUTH-003 商家入驻成功', async ({ request }) => {
    const username = `merchant_e2e_${Date.now()}`;
    const registered = await expectApiSuccess<{ user: { role: string; username: string } }>(
      await apiPost(request, '/auth/register-merchant', {
        username,
        password: 'merchant123',
        nickname: 'E2E 新商家',
        phone: '13900009999',
        merchant_name: `E2E 店铺 ${Date.now()}`,
        address: '幸福社区 9 号楼',
        delivery_note: '测试配送说明',
        min_order_amount: 20,
        delivery_fee: 3
      }),
      201
    );
    expect(registered.user.role).toBe('merchant');
    expect(registered.user.username).toBe(username);
  });
});
