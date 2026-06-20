import { expect, test } from '@playwright/test';
import { apiPatch, apiPost, resetBackendData, tokenOf } from '../../../helpers/backend';
import { expectApiError, expectApiSuccess } from '../../../helpers/assertions';

test.describe('API-ONLY /cart/validate', () => {
  test.beforeAll(() => {
    resetBackendData();
  });

  test('API-CART-001 购物车校验成功', async ({ request }) => {
    const validated = await expectApiSuccess<{
      valid: boolean;
      items_snapshot: Array<{ product_id: number }>;
      total_amount: number;
    }>(
      await apiPost(request, '/cart/validate', {
        merchant_id: 1,
        cart_items: [{ product_id: 1, quantity: 4 }]
      })
    );

    expect(validated.valid).toBe(true);
    expect(validated.items_snapshot.length).toBe(1);
    expect(validated.total_amount).toBeGreaterThan(0);
  });

  test('API-CART-002 商家不存在 404', async ({ request }) => {
    await expectApiError(
      await apiPost(request, '/cart/validate', {
        merchant_id: 99999,
        cart_items: [{ product_id: 1, quantity: 1 }]
      }),
      404,
      '商家不存在'
    );
  });

  test('API-CART-003 购物车异常分支（空车/商品不存在/数量非法/超库存/下架/未达起送价）', async ({ request }) => {
    const emptyCartResponse = await apiPost(request, '/cart/validate', {
      merchant_id: 1,
      cart_items: []
    });
    expect(emptyCartResponse.status()).toBe(400);
    const emptyPayload = (await emptyCartResponse.json()) as { errors?: string[] };
    expect(emptyPayload.errors ?? []).toContain('购物车为空');

    const missingProductResponse = await apiPost(request, '/cart/validate', {
      merchant_id: 1,
      cart_items: [{ product_id: 99999, quantity: 1 }]
    });
    expect(missingProductResponse.status()).toBe(400);
    const missingPayload = (await missingProductResponse.json()) as { errors?: string[] };
    expect((missingPayload.errors ?? []).join('|')).toContain('不存在');

    const invalidQuantityResponse = await apiPost(request, '/cart/validate', {
      merchant_id: 1,
      cart_items: [{ product_id: 1, quantity: 0 }]
    });
    expect(invalidQuantityResponse.status()).toBe(400);
    const invalidQuantityPayload = (await invalidQuantityResponse.json()) as { errors?: string[] };
    expect((invalidQuantityPayload.errors ?? []).join('|')).toContain('数量必须是正整数');

    const overStockResponse = await apiPost(request, '/cart/validate', {
      merchant_id: 1,
      cart_items: [{ product_id: 1, quantity: 999 }]
    });
    expect(overStockResponse.status()).toBe(400);
    const overStockPayload = (await overStockResponse.json()) as { errors?: string[] };
    expect((overStockPayload.errors ?? []).join('|')).toContain('超过库存限制');

    await expectApiSuccess(
      await apiPatch(request, '/products/1', {
        is_active: false
      }, { token: tokenOf(2) })
    );
    const inactiveResponse = await apiPost(request, '/cart/validate', {
      merchant_id: 1,
      cart_items: [{ product_id: 1, quantity: 4 }]
    });
    expect(inactiveResponse.status()).toBe(400);
    const inactivePayload = (await inactiveResponse.json()) as { errors?: string[] };
    expect((inactivePayload.errors ?? []).join('|')).toContain('已下架');

    await expectApiSuccess(
      await apiPatch(request, '/products/1', {
        is_active: true
      }, { token: tokenOf(2) })
    );
    const minOrderResponse = await apiPost(request, '/cart/validate', {
      merchant_id: 1,
      cart_items: [{ product_id: 1, quantity: 1 }]
    });
    expect(minOrderResponse.status()).toBe(400);
    const minOrderPayload = (await minOrderResponse.json()) as { errors?: string[] };
    expect((minOrderPayload.errors ?? []).join('|')).toContain('未达到起送价');
  });
});
