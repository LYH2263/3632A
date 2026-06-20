import { describe, expect, it } from 'vitest';
import {
  canTransitionStatus,
  createOrderFromCart,
  emptyCart,
  seedMerchants,
  seedProducts,
  validateCartForCheckout
} from '../index';

describe('订单状态机', () => {
  it('支持 pending -> confirmed，不支持 completed -> pending', () => {
    expect(canTransitionStatus('pending', 'confirmed')).toBe(true);
    expect(canTransitionStatus('completed', 'pending')).toBe(false);
  });
});

describe('购物车校验', () => {
  it('库存不足时阻止提交', () => {
    const merchant = seedMerchants[0];
    const cart = {
      merchant_id: merchant.id,
      updated_at: new Date().toISOString(),
      items: [{ product_id: 1001, quantity: 999 }]
    };

    const validation = validateCartForCheckout(
      cart,
      merchant,
      seedProducts.filter((item) => item.merchant_id === merchant.id)
    );
    expect(validation.valid).toBe(false);
    expect(validation.errors.join('')).toContain('超过库存限制');
  });

  it('空购物车应返回错误', () => {
    const merchant = seedMerchants[0];
    const cart = {
      ...emptyCart,
      merchant_id: merchant.id
    };
    const validation = validateCartForCheckout(
      cart,
      merchant,
      seedProducts.filter((item) => item.merchant_id === merchant.id)
    );
    expect(validation.valid).toBe(false);
    expect(validation.errors).toContain('购物车为空');
  });
});

describe('下单创建', () => {
  it('起送价满足后可创建 pending 订单且支付方式为 offline', () => {
    const merchant = seedMerchants[1];
    const cart = {
      merchant_id: merchant.id,
      updated_at: new Date().toISOString(),
      items: [
        { product_id: 2001, quantity: 2 },
        { product_id: 2002, quantity: 1 }
      ]
    };

    const order = createOrderFromCart({
      orderId: 1,
      buyerId: 1,
      payload: {
        buyer_id: 1,
        merchant_id: merchant.id,
        receiver_name: '测试用户',
        receiver_phone: '13800138000',
        receiver_address: '幸福社区 8 栋',
        remark: '请尽快配送'
      },
      merchant,
      cart,
      products: seedProducts.filter((item) => item.merchant_id === merchant.id)
    });

    expect(order.status).toBe('pending');
    expect(order.pay_method).toBe('offline');
    expect(order.items_snapshot.length).toBe(2);
    expect(order.total_amount).toBeGreaterThan(order.items_amount);
  });
});
