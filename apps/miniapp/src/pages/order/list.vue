<template>
  <view class="app-shell" data-testid="miniapp-shell">
    <AppTopBar />

    <view class="page-body">
      <section data-testid="order-list-page">
        <article class="card order-list-header" data-testid="order-list-header">
          <h2 class="order-list-title" data-testid="order-list-title">我的订单</h2>
          <p class="muted" data-testid="order-list-buyer">当前展示买家 {{ buyerId }} 的订单记录</p>
          <div class="flex-row-wrap mt-sm">
            <button
              v-for="tab in filterTabs"
              :key="tab.value"
              :class="activeFilter === tab.value ? 'primary' : 'secondary'"
              :data-testid="`order-list-filter-${tab.value}`"
              @click="activeFilter = tab.value"
            >
              {{ tab.label }}
            </button>
            <button class="secondary" data-testid="order-list-refresh" @click="loadOrders">刷新</button>
          </div>
        </article>

        <article v-for="order in filteredOrders" :key="order.id" class="card order-card" :data-testid="`order-list-item-${order.id}`">
          <div class="card-head">
            <div class="order-card-header">
              <div class="order-no" :data-testid="`order-list-order-no-${order.id}`">订单号：{{ order.order_no }}</div>
              <div class="muted order-time" :data-testid="`order-list-created-at-${order.id}`">
                {{ formatDate(order.created_at) }}
              </div>
            </div>
            <OrderStatusTag :status="order.status" />
          </div>
          <div class="order-card-info">
            <p class="muted">商家 ID：{{ order.merchant_id }}</p>
            <p class="price order-total">{{ formatMoney(order.total_amount) }}</p>
          </div>
          <button class="primary" :data-testid="`order-list-detail-${order.id}`" @click="goDetail(order.id)">
            查看详情
          </button>
        </article>

        <div v-if="!filteredOrders.length" class="empty-box" data-testid="order-list-empty">
          <p class="empty-icon">📋</p>
          <p class="muted">暂无订单</p>
        </div>
      </section>
    </view>
  </view>
</template>

<script setup lang="ts">
import type { Order, OrderStatus } from '@community-store/shared';
import { computed, ref } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import AppTopBar from '../../components/AppTopBar.vue';
import OrderStatusTag from '../../components/OrderStatusTag.vue';
import { getDataSource } from '../../services/data-source';
import { formatMoney } from '../../services/format';
import { useSessionStore } from '../../stores/session';
import { navigateTo } from '../../utils/navigation';

type FilterValue = 'all' | 'active' | 'done';

const filterTabs: { label: string; value: FilterValue }[] = [
  { label: '全部', value: 'all' },
  { label: '进行中', value: 'active' },
  { label: '已完成', value: 'done' }
];

const activeStatuses: OrderStatus[] = ['pending', 'confirmed', 'delivering'];
const doneStatuses: OrderStatus[] = ['completed', 'canceled'];

const dataSource = getDataSource();
const sessionStore = useSessionStore();

const orders = ref<Order[]>([]);
const activeFilter = ref<FilterValue>('all');
const buyerId = computed(() => sessionStore.state.user.id);

const filteredOrders = computed(() => {
  if (activeFilter.value === 'all') {
    return orders.value;
  }
  const statuses = activeFilter.value === 'active' ? activeStatuses : doneStatuses;
  return orders.value.filter((order) => statuses.includes(order.status));
});

function formatDate(raw: string): string {
  return raw.replace('T', ' ').slice(0, 19);
}

async function loadOrders(): Promise<void> {
  orders.value = await dataSource.listOrdersByBuyer(buyerId.value);
}

function goDetail(orderId: number): void {
  navigateTo('pages/order/detail', {
    orderId
  });
}

onShow(loadOrders);
</script>
