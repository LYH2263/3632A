<template>
  <view class="app-shell" data-testid="miniapp-shell">
    <AppTopBar />

    <view class="page-body">
      <section v-if="merchant" data-testid="shop-page">
        <article class="card shop-header-card" data-testid="shop-merchant-card">
          <div class="shop-header-row">
            <h2 class="shop-header-title" data-testid="shop-merchant-name">{{ merchant.name }}</h2>
            <span
              class="status-tag"
              :class="merchantStatus.open ? 'status-completed' : 'status-canceled'"
              :data-testid="`shop-merchant-status`"
            >
              {{ merchantStatus.text }}
            </span>
          </div>
          <div class="shop-header-meta">
            <p class="muted" data-testid="shop-merchant-phone">📞 {{ merchant.phone }}</p>
            <p class="muted" data-testid="shop-merchant-note">🚚 {{ merchant.delivery_note }}</p>
            <p class="muted" v-if="merchant.delivery_radius_km > 0" data-testid="shop-merchant-radius">
              📍 配送范围：{{ merchant.delivery_radius_km }} 公里内
            </p>
            <p class="muted" data-testid="shop-merchant-fee">
              💰 配送费：{{ formatMoney(merchant.delivery_fee) }} / 起送价：{{ formatMoney(merchant.min_order_amount) }}
            </p>
            <p class="muted">🕐 今日：{{ todayHoursText }}</p>
          </div>
        </article>

        <scroll-view scroll-x class="category-tabs" data-testid="shop-category-tabs">
          <view
            :class="['category-tab', { active: selectedCategoryId === 0 }]"
            @click="selectCategory(0)"
            :data-testid="'shop-category-all'"
          >
            全部
          </view>
          <view
            v-for="cat in categories"
            :key="cat.id"
            :class="['category-tab', { active: selectedCategoryId === cat.id }]"
            @click="selectCategory(cat.id)"
            :data-testid="`shop-category-${cat.id}`"
          >
            {{ cat.name }}
            <text v-if="cat.product_count" class="tab-count">{{ cat.product_count }}</text>
          </view>
        </scroll-view>

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
              <div class="product-card-title-row">
                <h3 class="product-card-title" :data-testid="`shop-product-name-${product.id}`">{{ product.name }}</h3>
                <button
                  class="favorite-btn favorite-btn-sm"
                  :class="{ active: favoriteMap[product.id] }"
                  :data-testid="`shop-favorite-${product.id}`"
                  @click.stop="toggleProductFavorite(product.id)"
                >
                  {{ favoriteMap[product.id] ? '❤️' : '🤍' }}
                </button>
              </div>
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
import {
  isMerchantOpen,
  getMerchantStatusText,
  getTodayHours,
  formatDayHours,
  type Category,
  type Merchant,
  type Product
} from '@community-store/shared';
import { computed, ref, reactive } from 'vue';
import { onLoad, onShow } from '@dcloudio/uni-app';
import AppTopBar from '../../components/AppTopBar.vue';
import { useCartStore } from '../../stores/cart';
import { useSessionStore } from '../../stores/session';
import { getDataSource } from '../../services/data-source';
import { formatMoney } from '../../services/format';
import { confirmAction, showMessage } from '../../utils/ui';
import { navigateTo, numberOption } from '../../utils/navigation';

const cartStore = useCartStore();
const sessionStore = useSessionStore();
const dataSource = getDataSource();

const merchant = ref<Merchant | null>(null);
const categories = ref<Category[]>([]);
const products = ref<Product[]>([]);
const keyword = ref('');
const merchantId = ref(0);
const selectedCategoryId = ref<number>(0);
const favoriteMap = reactive<Record<number, boolean>>({});

const merchantStatus = computed(() => {
  if (!merchant.value) {
    return { open: false, text: '休息中' };
  }
  const open = isMerchantOpen(merchant.value.business_hours, merchant.value.is_open);
  return {
    open,
    text: getMerchantStatusText(merchant.value.business_hours, merchant.value.is_open)
  };
});

const todayHoursText = computed(() => {
  if (!merchant.value) return '';
  const todayHours = getTodayHours(merchant.value.business_hours);
  return formatDayHours(todayHours);
});

const displayProducts = computed(() => {
  const normalized = keyword.value.trim().toLowerCase();
  let result = products.value.filter((item) => item.is_active);

  if (selectedCategoryId.value > 0) {
    result = result.filter((item) => item.category_id === selectedCategoryId.value);
  }

  if (!normalized) {
    return result;
  }
  return result.filter((item) =>
    item.name.toLowerCase().includes(normalized)
  );
});

function selectCategory(categoryId: number): void {
  selectedCategoryId.value = categoryId;
}

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
    categories.value = [];
    products.value = [];
    return;
  }
  categories.value = await dataSource.listCategories(merchant.value.id);
  const catId = selectedCategoryId.value > 0 ? selectedCategoryId.value : undefined;
  products.value = await dataSource.listProducts(merchant.value.id, keyword.value, catId);
  await loadFavorites();
}

async function loadFavorites(): Promise<void> {
  const buyerId = sessionStore.state.user.id;
  try {
    const result = await dataSource.listFavorites(buyerId, 1, 100);
    Object.keys(favoriteMap).forEach((key) => {
      delete favoriteMap[Number(key)];
    });
    result.items.forEach((fav) => {
      favoriteMap[fav.product_id] = true;
    });
  } catch {
    // ignore
  }
}

async function toggleProductFavorite(productId: number): Promise<void> {
  const buyerId = sessionStore.state.user.id;
  try {
    if (favoriteMap[productId]) {
      await dataSource.removeFavorite(buyerId, productId);
      delete favoriteMap[productId];
      showMessage('已取消收藏');
    } else {
      await dataSource.addFavorite(buyerId, productId);
      favoriteMap[productId] = true;
      showMessage('已收藏');
    }
  } catch (error) {
    showMessage((error as Error).message);
  }
}

async function changeQuantity(product: Product, step: number): Promise<void> {
  if (!merchant.value) {
    return;
  }
  if (!isMerchantOpen(merchant.value.business_hours, merchant.value.is_open)) {
    showMessage('商家当前非营业时段，暂无法加购');
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
