import { expect, test } from '@playwright/test';
import { apiGet, apiPatch, apiPost, resetBackendData, tokenOf } from '../../../helpers/backend';
import { expectApiError, expectApiSuccess } from '../../../helpers/assertions';

async function createPendingOrder(request: import('@playwright/test').APIRequestContext) {
  return expectApiSuccess<{ id: number; order_no: string; status: string; pay_method: string; items_snapshot: unknown[] }>(
    await apiPost(request, '/orders', {
      buyer_id: 1,
      merchant_id: 1,
      receiver_name: '张三',
      receiver_phone: '13800138000',
      receiver_address: '幸福社区 8 栋',
      remark: 'API 订单测试',
      cart_items: [{ product_id: 1, quantity: 4 }]
    }),
    201
  );
}

test.describe('API-ONLY /orders', () => {
  test.beforeAll(() => {
    resetBackendData();
  });

  test('API-ORDER-001 创建订单成功（pending + offline + snapshot）', async ({ request }) => {
    const order = await createPendingOrder(request);

    expect(order.id).toBeGreaterThan(0);
    expect(order.status).toBe('pending');
    expect(order.pay_method).toBe('offline');
    expect(order.items_snapshot.length).toBeGreaterThan(0);
  });

  test('API-ORDER-002 创建订单失败（买家不存在/商家不存在/cart 校验失败）', async ({ request }) => {
    await expectApiError(
      await apiPost(request, '/orders', {
        buyer_id: 99999,
        merchant_id: 1,
        receiver_name: '张三',
        receiver_phone: '13800138000',
        receiver_address: '幸福社区 8 栋',
        cart_items: [{ product_id: 1, quantity: 4 }]
      }),
      404,
      '买家不存在'
    );

    await expectApiError(
      await apiPost(request, '/orders', {
        buyer_id: 1,
        merchant_id: 99999,
        receiver_name: '张三',
        receiver_phone: '13800138000',
        receiver_address: '幸福社区 8 栋',
        cart_items: [{ product_id: 1, quantity: 4 }]
      }),
      404,
      '商家不存在'
    );

    const cartInvalidResponse = await apiPost(request, '/orders', {
      buyer_id: 1,
      merchant_id: 1,
      receiver_name: '张三',
      receiver_phone: '13800138000',
      receiver_address: '幸福社区 8 栋',
      cart_items: [{ product_id: 1, quantity: 0 }]
    });

    expect(cartInvalidResponse.status()).toBe(400);
    const payload = (await cartInvalidResponse.json()) as { message?: string; errors?: string[] };
    expect(payload.message).toContain('下单失败');
    expect((payload.errors ?? []).join('|')).toContain('数量必须是正整数');
  });

  test('API-ORDER-003 订单列表 buyer/merchant 过滤', async ({ request }) => {
    await createPendingOrder(request);

    const buyerOrders = await expectApiSuccess<Array<{ buyer_id: number }>>(
      await apiGet(request, '/orders?buyer_id=1')
    );
    expect(buyerOrders.length).toBeGreaterThan(0);
    expect(buyerOrders.every((item) => item.buyer_id === 1)).toBe(true);

    const merchantOrders = await expectApiSuccess<Array<{ merchant_id: number }>>(
      await apiGet(request, '/orders?merchant_id=1', { token: tokenOf(2) })
    );
    expect(merchantOrders.length).toBeGreaterThan(0);
    expect(merchantOrders.every((item) => item.merchant_id === 1)).toBe(true);
  });

  test('API-ORDER-004 订单详情存在/不存在分支', async ({ request }) => {
    const created = await createPendingOrder(request);

    const detail = await expectApiSuccess<{ id: number }>(
      await apiGet(request, `/orders/${created.id}`)
    );
    expect(detail.id).toBe(created.id);

    const missing = await expectApiSuccess<null>(
      await apiGet(request, '/orders/99999')
    );
    expect(missing).toBeNull();
  });

  test('API-ORDER-005 状态流转：合法、幂等、不存在、非法迁移', async ({ request }) => {
    const created = await createPendingOrder(request);

    const confirmed = await expectApiSuccess<{ status: string }>(
      await apiPatch(request, `/orders/${created.id}/status`, {
        status: 'confirmed'
      }, { token: tokenOf(2) })
    );
    expect(confirmed.status).toBe('confirmed');

    const idempotent = await expectApiSuccess<{ status: string }>(
      await apiPatch(request, `/orders/${created.id}/status`, {
        status: 'confirmed'
      }, { token: tokenOf(2) })
    );
    expect(idempotent.status).toBe('confirmed');

    await expectApiError(
      await apiPatch(request, '/orders/99999/status', {
        status: 'confirmed'
      }, { token: tokenOf(2) }),
      404,
      '订单不存在'
    );

    await expectApiError(
      await apiPatch(request, `/orders/${created.id}/status`, {
        status: 'completed'
      }, { token: tokenOf(2) }),
      400,
      '状态不可逆或非法迁移'
    );
  });
});
