<template>
  <view class="app-shell" data-testid="miniapp-shell">
    <AppTopBar />

    <view class="page-body">
      <section data-testid="favorite-list-page">
        <view class="favorite-header">
          <h2 class="favorite-title">我的收藏</h2>
          <text class="muted favorite-count">共 {{ total }} 件商品</text>
        </view>

        <view v-if="!isLoggedIn" class="empty-box" data-testid="favorite-not-login">
          <p class="empty-icon">🔒</p>
          <p class="empty-text">请先登录后查看收藏</p>
        </view>

        <view v-else-if="loading && items.length === 0" class="empty-box">
          <p class="empty-text">加载中...</p>
        </view>

        <view v-else-if="items.length === 0" class="empty-box" data-testid="favorite-empty">
          <p class="empty-icon">💔</p>
          <p class="empty-text">暂无收藏商品</p>
          <p class="empty-text">去逛逛发现心仪的商品吧</p>
          <button class="primary mt-md" @click="goHome">去逛逛</button>
        </view>

        <view v-else>
          <view
            v-for="fav in items"
            :key="fav.id"
            class="favorite-item-card"
            :class="{ disabled: !fav.product?.is_active }"
            :data-testid="`favorite-item-${fav.product_id}`"
            @click="goProductDetail(fav)"
          >
            <image
              class="favorite-item-thumb"
              :src="fav.product?.image_url || '/static/images/products/default.jpg'"
              mode="aspectFill"
            />
            <view class="favorite-item-info">
              <view>
                <h3 class="favorite-item-name">{{ fav.product?.name || '商品已下架' }}</h3>
                <p class="favorite-item-shop">🏪 {{ fav.merchant?.name || '未知商家' }}</p>
                <p v-if="!fav.product?.is_active" class="muted" style="color: var(--danger); font-size: 12px;">
                  商品已下架
                </p>
              </view>
              <view class="favorite-item-bottom">
                <text class="price">
                  {{ fav.product ? formatMoney(fav.product.price) : '--' }}
                  <span class="unit" v-if="fav.product">/{{ fav.product.unit }}</span>
                </text>
                <button
                  v-if="fav.product?.is_active"
                  class="secondary"
                  style="min-height: 32px; padding: 0 12px; font-size: 13px;"
                  @click.stop="addToCart(fav)"
                  :data-testid="`favorite-add-cart-${fav.product_id}`"
                >
                  加购
                </button>
                <button
                  v-else
                  class="secondary"
                  style="min-height: 32px; padding: 0 12px; font-size: 13px; opacity: 0.5;"
                  disabled
                >
                  已下架
                </button>
              </view>
            </view>
          </view>

          <view v-if="hasMore" class="load-more-wrap">
            <button
              class="load-more-btn"
              :disabled="loading"
              @click="loadMore"
              data-testid="favorite-load-more"
            >
              {{ loading ? '加载中...' : '加载更多' }}
            </button>
          </view>
        </view>
      </section>
    </view>
  </view>
</template>

<script setup lang="ts">
import type { Favorite, Product, Merchant } from '@community-store/shared';
import { ref, computed } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import AppTopBar from '../../components/AppTopBar.vue';
import { useCartStore } from '../../stores/cart';
import { useSessionStore } from '../../stores/session';
import { getDataSource } from '../../services/data-source';
import { formatMoney } from '../../services/format';
import { confirmAction, showMessage } from '../../utils/ui';
import { navigateTo } from '../../utils/navigation';

const cartStore = useCartStore();
const sessionStore = useSessionStore();
const dataSource = getDataSource();

const items = ref<Favorite[]>([]);
const page = ref(1);
const pageSize = ref(20);
const total = ref(0);
const loading = ref(false);
const hasMore = computed(() => items.value.length < total.value);

const isLoggedIn = computed(() => {
  return !!sessionStore.state.user?.id;
});

async function loadFavorites(reset = false): Promise<void> {
  if (!isLoggedIn.value) return;

  loading.value = true;
  try {
    const currentPage = reset ? 1 : page.value;
    const result = await dataSource.listFavorites(
      sessionStore.state.user.id,
      currentPage,
      pageSize.value
    );

    if (reset) {
      items.value = result.items;
      page.value = 1;
    } else {
      items.value = [...items.value, ...result.items];
      page.value = currentPage;
    }
    total.value = result.total;
  } catch (error) {
    showMessage((error as Error).message);
  } finally {
    loading.value = false;
  }
}

function loadMore(): void {
  page.value += 1;
  loadFavorites();
}

function goProductDetail(fav: Favorite): void {
  if (!fav.product_id || !fav.product?.is_active) {
    showMessage('商品已下架');
    return;
  }
  navigateTo('pages/product/detail', {
    productId: fav.product_id,
    merchantId: fav.merchant?.id || 0
  });
}

async function addToCart(fav: Favorite): Promise<void> {
  if (!fav.product || !fav.merchant) return;
  if (!fav.product.is_active) {
    showMessage('商品已下架，无法加购');
    return;
  }

  try {
    const result = await cartStore.addItem(
      fav.product as Product,
      fav.merchant.id,
      1
    );
    if (result.conflict) {
      const shouldSwitch = await confirmAction(
        '订单仅支持单商家。是否清空当前购物车并切换到当前商家？'
      );
      if (!shouldSwitch) {
        return;
      }
      await cartStore.addItem(fav.product as Product, fav.merchant.id, 1, true);
    }
    showMessage('已加入购物车');
  } catch (error) {
    showMessage((error as Error).message);
  }
}

function goHome(): void {
  uni.reLaunch({ url: '/pages/home/index' });
}

onShow(() => {
  if (isLoggedIn.value) {
    loadFavorites(true);
  }
});
</script>
