import type {
  Cart,
  CheckoutPayload,
  Merchant,
  Order,
  OrderSnapshotItem,
  Product
} from '../types';
import { toMoney } from './number';
import {
  buildProductMap,
  calculateItemsAmount,
  validateCartForCheckout,
  validateCheckoutPayload
} from './validator';

export function generateOrderNo(now = new Date()): string {
  const iso = now.toISOString().replace(/[-:TZ.]/g, '');
  const random = Math.floor(Math.random() * 9000) + 1000;
  return `CS${iso}${random}`;
}

export function buildOrderSnapshot(
  cart: Cart,
  productMap: Map<number, Product>
): OrderSnapshotItem[] {
  return cart.items.map((item) => {
    const product = productMap.get(item.product_id);
    if (!product) {
      throw new Error(`商品 ${item.product_id} 不存在`);
    }

    return {
      product_id: product.id,
      name: product.name,
      unit: product.unit,
      price: product.price,
      quantity: item.quantity,
      subtotal: toMoney(product.price * item.quantity)
    };
  });
}

interface CreateOrderParams {
  orderId: number;
  buyerId: number;
  payload: CheckoutPayload;
  merchant: Merchant;
  cart: Cart;
  products: Product[];
}

export function createOrderFromCart(params: CreateOrderParams): Order {
  const checkoutErrors = validateCheckoutPayload(params.payload);
  if (checkoutErrors.length) {
    throw new Error(checkoutErrors.join('；'));
  }

  const cartValidation = validateCartForCheckout(
    params.cart,
    params.merchant,
    params.products
  );
  if (!cartValidation.valid) {
    throw new Error(cartValidation.errors.join('；'));
  }

  const now = new Date().toISOString();
  const productMap = buildProductMap(params.products);
  const itemsSnapshot = buildOrderSnapshot(params.cart, productMap);
  const itemsAmount = calculateItemsAmount(params.cart.items, productMap);
  const totalAmount = toMoney(itemsAmount + params.merchant.delivery_fee);

  return {
    id: params.orderId,
    order_no: generateOrderNo(),
    buyer_id: params.buyerId,
    merchant_id: params.merchant.id,
    status: 'pending',
    pay_method: 'offline',
    receiver_name: params.payload.receiver_name,
    receiver_phone: params.payload.receiver_phone,
    receiver_address: params.payload.receiver_address,
    remark: params.payload.remark ?? '',
    items_amount: itemsAmount,
    delivery_fee: params.merchant.delivery_fee,
    total_amount: totalAmount,
    items_snapshot: itemsSnapshot,
    created_at: now,
    updated_at: now
  };
}
