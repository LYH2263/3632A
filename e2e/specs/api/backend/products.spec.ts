import { expect, test } from '@playwright/test';
import { apiGet, apiPatch, apiPost, resetBackendData, tokenOf } from '../../../helpers/backend';
import { expectApiError, expectApiSuccess } from '../../../helpers/assertions';

test.describe('API-ONLY /products', () => {
  test.beforeAll(() => {
    resetBackendData();
  });

  test('API-PRODUCT-001 列表过滤成功（merchant + keyword）', async ({ request }) => {
    const byMerchant = await expectApiSuccess<Array<{ merchant_id: number }>>(
      await apiGet(request, '/products?merchant_id=1')
    );
    expect(byMerchant.every((item) => item.merchant_id === 1)).toBe(true);

    const byKeyword = await expectApiSuccess<Array<{ name: string }>>(
      await apiGet(request, '/products?merchant_id=1&keyword=苹果')
    );
    expect(byKeyword.length).toBeGreaterThan(0);
    expect(byKeyword.every((item) => item.name.includes('苹果'))).toBe(true);
  });

  test('API-PRODUCT-002 创建商品成功', async ({ request }) => {
    const created = await expectApiSuccess<{ id: number; merchant_id: number; name: string }>(
      await apiPost(
        request,
        '/products',
        {
          merchant_id: 1,
          name: `API商品-${Date.now()}`,
          price: 9.9,
          unit: '份',
          stock: 20,
          is_active: true,
          image_url: '/static/images/products/default.jpg',
          description: 'API 创建商品'
        },
        { token: tokenOf(2) }
      ),
      201
    );

    expect(created.id).toBeGreaterThan(0);
    expect(created.merchant_id).toBe(1);
  });

  test('API-PRODUCT-003 创建商品失败：商家不存在 404 + 字段校验 400', async ({ request }) => {
    await expectApiError(
      await apiPost(request, '/products', {
        merchant_id: 99999,
        name: '无效商家商品',
        price: 1,
        unit: '份',
        stock: 1,
        is_active: true,
        image_url: '/static/images/products/default.jpg',
        description: 'x'
      }, { token: tokenOf(2) }),
      404,
      '商家不存在'
    );

    const validationResponse = await apiPost(request, '/products', {
      merchant_id: 1,
      price: 1,
      unit: '份',
      stock: 1,
      is_active: true,
      image_url: '/static/images/products/default.jpg',
      description: 'x'
    }, { token: tokenOf(2) });
    expect(validationResponse.status()).toBe(400);
    const validationPayload = (await validationResponse.json()) as Record<string, unknown>;
    expect(Object.keys(validationPayload)).toContain('name');
  });

  test('API-PRODUCT-004 商品详情存在与不存在分支', async ({ request }) => {
    const product = await expectApiSuccess<{ id: number }>(
      await apiGet(request, '/products/1')
    );
    expect(product.id).toBe(1);

    const missing = await expectApiSuccess<null>(
      await apiGet(request, '/products/99999')
    );
    expect(missing).toBeNull();
  });

  test('API-PRODUCT-005 商品更新成功 + 商品不存在 + merchant_id 非法', async ({ request }) => {
    const updated = await expectApiSuccess<{ name: string }>(
      await apiPatch(request, '/products/1', {
        name: 'API 更新苹果'
      }, { token: tokenOf(2) })
    );
    expect(updated.name).toBe('API 更新苹果');

    await expectApiError(
      await apiPatch(request, '/products/99999', {
        name: '不存在商品'
      }, { token: tokenOf(2) }),
      404,
      '商品不存在'
    );

    await expectApiError(
      await apiPatch(request, '/products/1', {
        merchant_id: 99999
      }, { token: tokenOf(2) }),
      404,
      '商家不存在'
    );
  });
});
