import type { Cart, Product } from '@community-store/shared';
import { reactive, readonly } from 'vue';
import { getDataSource } from '../services/data-source';

const state = reactive<{
  cart: Cart;
  loaded: boolean;
}>({
  cart: {
    merchant_id: null,
    items: [],
    updated_at: new Date().toISOString()
  },
  loaded: false
});

function itemQuantity(productId: number): number {
  return state.cart.items.find((item) => item.product_id === productId)?.quantity ?? 0;
}

export function useCartStore() {
  const dataSource = getDataSource();

  async function ensureLoaded(): Promise<void> {
    if (state.loaded) {
      return;
    }
    state.cart = await dataSource.getCart();
    state.loaded = true;
  }

  async function saveCart(cart: Cart): Promise<void> {
    state.cart = await dataSource.setCart(cart);
  }

  async function clearCart(): Promise<void> {
    state.cart = await dataSource.clearCart();
  }

  async function addItem(
    product: Product,
    merchantId: number,
    quantity = 1,
    forceSwitch = false
  ): Promise<{ conflict: boolean }> {
    await ensureLoaded();
    if (
      state.cart.merchant_id &&
      state.cart.merchant_id !== merchantId &&
      state.cart.items.length > 0
    ) {
      if (!forceSwitch) {
        return { conflict: true };
      }
      await clearCart();
    }

    const nextItems = [...state.cart.items];
    const target = nextItems.find((item) => item.product_id === product.id);
    const nextQuantity = (target?.quantity ?? 0) + quantity;

    if (nextQuantity <= 0) {
      const filtered = nextItems.filter((item) => item.product_id !== product.id);
      await saveCart({
        merchant_id: filtered.length ? merchantId : null,
        items: filtered,
        updated_at: new Date().toISOString()
      });
      return { conflict: false };
    }

    if (product.stock !== -1 && nextQuantity > product.stock) {
      throw new Error(`${product.name} 已超过库存上限`);
    }

    if (target) {
      target.quantity = nextQuantity;
    } else {
      nextItems.push({
        product_id: product.id,
        quantity
      });
    }

    await saveCart({
      merchant_id: merchantId,
      items: nextItems,
      updated_at: new Date().toISOString()
    });

    return { conflict: false };
  }

  async function setItemQuantity(
    product: Product,
    merchantId: number,
    quantity: number
  ): Promise<void> {
    const current = itemQuantity(product.id);
    await addItem(product, merchantId, quantity - current);
  }

  function totalCount(): number {
    return state.cart.items.reduce((sum, item) => sum + item.quantity, 0);
  }

  return {
    state: readonly(state),
    ensureLoaded,
    addItem,
    setItemQuantity,
    clearCart,
    totalCount,
    itemQuantity
  };
}
