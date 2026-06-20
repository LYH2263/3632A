<template>
  <view class="app-shell" data-testid="miniapp-shell">
    <AppTopBar />

    <view class="page-body">
      <section v-if="merchant" data-testid="shop-page">
        <article class="card shop-header-card" data-testid="shop-merchant-card">
          <h2 class="shop-header-title" data-testid="shop-merchant-name">{{ merchant.name }}</h2>
          <div class="shop-header-meta">
            <p class="muted" data-testid="shop-merchant-phone">📞 {{ merchant.phone }}</p>
            <p class="muted" data-testid="shop-merchant-note">🚚 {{ merchant.delivery_note }}</p>
          </div>
        </article>

        <div class="search-bar">
          <label class="sr-only" for="shop-search-input">搜索商品</label>
          <input
            id="shop-search-input"
            v-model="keyword"
            data-testid="shop-search-input"
            placeholder="搜索商品"
          />
        </div>

        <article
          v-for="product in displayProducts"
          :key="product.id"
          class="card product-card"
          :data-testid="`shop-product-card-${product.id}`"
        >
          <div class="product-card-top">
            <image
              class="product-thumb"
              :src="product.image_url || '/static/images/products/default.jpg'"
              mode="aspectFill"
              :data-testid="`shop-product-image-${product.id}`"
            />
            <div class="product-card-info">
              <h3 class="product-card-title" :data-testid="`shop-product-name-${product.id}`">{{ product.name }}</h3>
              <p class="muted product-desc">{{ product.description || '暂无描述' }}</p>
              <div class="product-card-price-row">
                <div class="price">{{ formatMoney(product.price) }}<span class="unit">/{{ product.unit }}</span></div>
                <span class="muted stock-label" :data-testid="`shop-product-stock-${product.id}`">
                  库存：{{ product.stock === -1 ? '不限' : product.stock }}
                </span>
              </div>
            </div>
          </div>

          <div class="product-card-actions">
            <button class="secondary" :data-testid="`shop-detail-${product.id}`" @click="goDetail(product.id)">
              查看详情
            </button>
            <div class="counter">
              <button :data-testid="`shop-minus-${product.id}`" @click="changeQuantity(product, -1)">-</button>
              <span class="counter-value" :data-testid="`shop-quantity-${product.id}`">{{ cartStore.itemQuantity(product.id) }}</span>
              <button class="primary" :data-testid="`shop-plus-${product.id}`" @click="changeQuantity(product, 1)">
                +
              </button>
            </div>
          </div>
        </article>

        <div v-if="!displayProducts.length" class="empty-box" data-testid="shop-products-empty">
          <p class="empty-icon">📦</p>
          <p class="muted">暂无匹配商品</p>
        </div>

        <div class="checkout-bar" data-testid="shop-checkout-bar">
          <div class="checkout-bar-info">
            <strong data-testid="shop-total-count">共 {{ totalCount }} 件</strong>
            <div class="price" data-testid="shop-total-amount">{{ formatMoney(itemsAmount) }}</div>
          </div>
          <button class="primary" data-testid="shop-go-checkout" @click="goCheckout">去结算</button>
        </div>
      </section>

      <p v-else class="muted" data-testid="shop-merchant-not-found">商家不存在。</p>
    </view>
  </view>
</template>

<script setup lang="ts">
import type { Merchant, Product } from '@community-store/shared';
import { computed, ref } from 'vue';
import { onLoad, onShow } from '@dcloudio/uni-app';
import AppTopBar from '../../components/AppTopBar.vue';
import { useCartStore } from '../../stores/cart';
import { getDataSource } from '../../services/data-source';
import { formatMoney } from '../../services/format';
import { confirmAction, showMessage } from '../../utils/ui';
import { navigateTo, numberOption } from '../../utils/navigation';

const cartStore = useCartStore();
const dataSource = getDataSource();

const merchant = ref<Merchant | null>(null);
const products = ref<Product[]>([]);
const keyword = ref('');
const merchantId = ref(0);

const displayProducts = computed(() => {
  const normalized = keyword.value.trim().toLowerCase();
  const activeProducts = products.value.filter((item) => item.is_active);
  if (!normalized) {
    return activeProducts;
  }
  return activeProducts.filter((item) =>
    item.name.toLowerCase().includes(normalized)
  );
});

const totalCount = computed(() => cartStore.totalCount());

const itemsAmount = computed(() => {
  const productMap = new Map(products.value.map((item) => [item.id, item]));
  return cartStore.state.cart.items.reduce((sum, item) => {
    const product = productMap.get(item.product_id);
    if (!product) {
      return sum;
    }
    return sum + product.price * item.quantity;
  }, 0);
});

async function loadData(): Promise<void> {
  await cartStore.ensureLoaded();
  merchant.value = await dataSource.getMerchant(merchantId.value);
  if (!merchant.value) {
    products.value = [];
    return;
  }
  products.value = await dataSource.listProducts(merchant.value.id, keyword.value);
}

async function changeQuantity(product: Product, step: number): Promise<void> {
  if (!merchant.value) {
    return;
  }
  try {
    const result = await cartStore.addItem(product, merchant.value.id, step);
    if (result.conflict) {
      const shouldSwitch = await confirmAction(
        '订单仅支持单商家。是否清空当前购物车并切换到当前商家？'
      );
      if (!shouldSwitch) {
        return;
      }
      await cartStore.addItem(product, merchant.value.id, step, true);
    }
  } catch (error) {
    showMessage((error as Error).message);
  }
}

function goDetail(productId: number): void {
  navigateTo('pages/product/detail', {
    productId,
    merchantId: merchantId.value
  });
}

function goCheckout(): void {
  navigateTo('pages/cart/checkout', {
    merchantId: merchantId.value
  });
}

onLoad((options) => {
  merchantId.value = numberOption(options, 'merchantId', 0);
});

onShow(loadData);
</script>
