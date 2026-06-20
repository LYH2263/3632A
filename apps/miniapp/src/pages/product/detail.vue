<template>
  <view class="app-shell" data-testid="miniapp-shell">
    <AppTopBar />

    <view class="page-body">
      <section v-if="product && merchant" data-testid="product-detail-page">
        <article class="card product-detail-card" data-testid="product-detail-card">
          <image
            class="product-hero-image"
            :src="product.image_url || defaultProductImage"
            mode="aspectFill"
            data-testid="product-image"
          />
          <div class="product-detail-body">
            <h2 class="product-detail-title" data-testid="product-name">{{ product.name }}</h2>
            <div class="product-detail-price-row">
              <p class="price" data-testid="product-price">{{ formatMoney(product.price) }}<span class="unit">/{{ product.unit }}</span></p>
              <p class="muted stock-label" data-testid="product-stock">库存：{{ product.stock === -1 ? '不限' : product.stock }}</p>
            </div>
            <p class="muted product-detail-desc" data-testid="product-description">{{ product.description || '暂无描述' }}</p>

            <div class="product-detail-quantity">
              <span class="muted">购买数量</span>
              <div class="counter">
                <button data-testid="product-minus" @click="changeQuantity(-1)">-</button>
                <span class="counter-value" data-testid="product-quantity">{{ quantity }}</span>
                <button class="primary" data-testid="product-plus" @click="changeQuantity(1)">+</button>
              </div>
            </div>

            <div class="flex-row mt-md">
              <button class="secondary" data-testid="product-back" @click="goBack">返回商品列表</button>
              <button class="primary" data-testid="product-add-cart" @click="addToCart">加入购物车</button>
            </div>
          </div>
        </article>
      </section>
      <p v-else class="muted" data-testid="product-not-found">商品不存在。</p>
    </view>
  </view>
</template>

<script setup lang="ts">
import type { Merchant, Product } from '@community-store/shared';
import { ref } from 'vue';
import { onLoad, onShow } from '@dcloudio/uni-app';
import AppTopBar from '../../components/AppTopBar.vue';
import { useCartStore } from '../../stores/cart';
import { getDataSource } from '../../services/data-source';
import { formatMoney } from '../../services/format';
import { confirmAction, showMessage } from '../../utils/ui';
import { numberOption, redirectTo } from '../../utils/navigation';

const cartStore = useCartStore();
const dataSource = getDataSource();

const product = ref<Product | null>(null);
const merchant = ref<Merchant | null>(null);
const quantity = ref(1);
const defaultProductImage = '/static/images/products/default.jpg';

const productId = ref(0);
const merchantId = ref(0);

function changeQuantity(step: number): void {
  const next = quantity.value + step;
  if (next <= 0) {
    return;
  }
  if (product.value && product.value.stock !== -1 && next > product.value.stock) {
    showMessage('超过库存上限');
    return;
  }
  quantity.value = next;
}

async function addToCart(): Promise<void> {
  if (!product.value || !merchant.value) {
    return;
  }
  const result = await cartStore.addItem(
    product.value,
    merchant.value.id,
    quantity.value
  );
  if (result.conflict) {
    const shouldSwitch = await confirmAction(
      '订单仅支持单商家。是否清空当前购物车并切换到当前商家？'
    );
    if (!shouldSwitch) {
      return;
    }
    await cartStore.addItem(product.value, merchant.value.id, quantity.value, true);
  }
  showMessage('已加入购物车');
}

function goBack(): void {
  redirectTo('pages/shop/detail', {
    merchantId: merchantId.value
  });
}

onLoad((options) => {
  productId.value = numberOption(options, 'productId', 0);
  merchantId.value = numberOption(options, 'merchantId', 0);
});

onShow(async () => {
  await cartStore.ensureLoaded();
  quantity.value = 1;
  product.value = await dataSource.getProduct(productId.value);
  merchant.value = await dataSource.getMerchant(merchantId.value);
});
</script>
