import { STATUS_TRANSITIONS } from '../constants';
import type {
  Cart,
  CartItem,
  CartValidationResult,
  CheckoutPayload,
  Merchant,
  OrderStatus,
  Product
} from '../types';
import { toMoney } from './number';

export function isValidPhone(phone: string): boolean {
  return /^1[3-9]\d{9}$/.test(phone);
}

export function canTransitionStatus(
  current: OrderStatus,
  next: OrderStatus
): boolean {
  return STATUS_TRANSITIONS[current].includes(next);
}

export function buildProductMap(products: Product[]): Map<number, Product> {
  return new Map(products.map((product) => [product.id, product]));
}

export function calculateItemsAmount(
  cartItems: CartItem[],
  productMap: Map<number, Product>
): number {
  const amount = cartItems.reduce((sum, item) => {
    const product = productMap.get(item.product_id);
    if (!product) {
      return sum;
    }
    return sum + product.price * item.quantity;
  }, 0);
  return toMoney(amount);
}

function validateCartItems(
  cartItems: CartItem[],
  productMap: Map<number, Product>
): string[] {
  const errors: string[] = [];

  cartItems.forEach((item) => {
    const product = productMap.get(item.product_id);
    if (!product) {
      errors.push(`商品 ${item.product_id} 不存在`);
      return;
    }

    if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
      errors.push(`${product.name} 数量必须是正整数`);
      return;
    }

    if (product.stock !== -1 && item.quantity > product.stock) {
      errors.push(`${product.name} 超过库存限制`);
    }

    if (!product.is_active) {
      errors.push(`${product.name} 已下架`);
    }
  });

  return errors;
}

export function validateCartForCheckout(
  cart: Cart,
  merchant: Merchant,
  products: Product[]
): CartValidationResult {
  const productMap = buildProductMap(products);
  const errors: string[] = [];

  if (!cart.items.length) {
    errors.push('购物车为空');
  }

  if (cart.merchant_id !== merchant.id) {
    errors.push('购物车商家与当前商家不一致');
  }

  errors.push(...validateCartItems(cart.items, productMap));

  const itemsAmount = calculateItemsAmount(cart.items, productMap);
  if (itemsAmount < merchant.min_order_amount) {
    errors.push(`未达到起送价：¥${merchant.min_order_amount.toFixed(2)}`);
  }

  return {
    valid: errors.length === 0,
    errors,
    items_amount: itemsAmount,
    total_amount: toMoney(itemsAmount + merchant.delivery_fee)
  };
}

export function validateCheckoutPayload(payload: CheckoutPayload): string[] {
  const errors: string[] = [];

  if (!payload.receiver_name?.trim()) {
    errors.push('收货人姓名必填');
  }

  if (!payload.receiver_phone?.trim()) {
    errors.push('手机号必填');
  } else if (!isValidPhone(payload.receiver_phone)) {
    errors.push('手机号格式错误');
  }

  if (!payload.receiver_address?.trim()) {
    errors.push('收货地址必填');
  }

  return errors;
}
