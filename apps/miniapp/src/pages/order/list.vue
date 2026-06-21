<template>
  <view class="app-shell" data-testid="miniapp-shell">
    <AppTopBar />

    <view class="page-body">
      <section data-testid="order-list-page">
        <article class="card order-list-header" data-testid="order-list-header">
          <h2 class="order-list-title" data-testid="order-list-title">我的订单</h2>
          <p class="muted" data-testid="order-list-buyer">当前展示买家 {{ buyerId }} 的订单记录</p>

          <view class="filter-section">
            <view class="field">
              <text class="field-label">订单状态</text>
              <picker :range="statusOptions" range-key="label" @change="onStatusChange">
                <view class="filter-picker" :class="{ 'filter-picker-active': !!filters.status }" data-testid="order-filter-status">
                  {{ activeStatusLabel }}
                </view>
              </picker>
            </view>
            <view class="field">
              <text class="field-label">起始日期</text>
              <picker mode="date" @change="onDateStartChange" :value="filters.date_start || ''">
                <view class="filter-picker" :class="{ 'filter-picker-active': !!filters.date_start }" data-testid="order-filter-date-start">
                  {{ filters.date_start || '不限' }}
                </view>
              </picker>
            </view>
            <view class="field">
              <text class="field-label">截止日期</text>
              <picker mode="date" @change="onDateEndChange" :value="filters.date_end || ''">
                <view class="filter-picker" :class="{ 'filter-picker-active': !!filters.date_end }" data-testid="order-filter-date-end">
                  {{ filters.date_end || '不限' }}
                </view>
              </picker>
            </view>
            <view class="field">
              <text class="field-label">订单号</text>
              <input
                class="filter-input"
                v-model="orderNoInput"
                placeholder="模糊搜索"
                placeholder-class="filter-input-placeholder"
                data-testid="order-filter-order-no"
                @confirm="applyOrderNo"
              />
            </view>
            <view class="filter-actions">
              <button class="primary" data-testid="order-filter-search" @click="loadOrders">筛选</button>
              <button class="secondary" data-testid="order-filter-reset" @click="resetFilters">重置</button>
              <button class="secondary" data-testid="order-list-refresh" @click="loadOrders">刷新</button>
            </view>
          </view>
        </article>

        <article v-for="order in orders" :key="order.id" class="card order-card" :data-testid="`order-list-item-${order.id}`">
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

        <div v-if="!orders.length && !loading" class="empty-box" data-testid="order-list-empty">
          <p class="empty-icon">📋</p>
          <p class="muted">{{ hasActiveFilters ? '没有符合条件的订单，请调整筛选条件' : '暂无订单' }}</p>
        </div>
      </section>
    </view>
  </view>
</template>

<script setup lang="ts">
import type { Order, OrderFilterParams, OrderStatus } from '@community-store/shared';
import { ORDER_STATUS_LABELS } from '@community-store/shared';
import { computed, reactive, ref } from 'vue';
import { onLoad, onShow } from '@dcloudio/uni-app';
import AppTopBar from '../../components/AppTopBar.vue';
import OrderStatusTag from '../../components/OrderStatusTag.vue';
import { getDataSource } from '../../services/data-source';
import { formatMoney } from '../../services/format';
import { useSessionStore } from '../../stores/session';
import { navigateTo } from '../../utils/navigation';

const statusOptions: { label: string; value: OrderStatus | '' }[] = [
  { label: '全部', value: '' },
  { label: '待确认', value: 'pending' },
  { label: '待配送', value: 'confirmed' },
  { label: '配送中', value: 'delivering' },
  { label: '已完成', value: 'completed' },
  { label: '已取消', value: 'canceled' }
];

const dataSource = getDataSource();
const sessionStore = useSessionStore();

const orders = ref<Order[]>([]);
const loading = ref(false);
const orderNoInput = ref('');
const filters = reactive<OrderFilterParams>({});

const buyerId = computed(() => sessionStore.state.user.id);

const activeStatusLabel = computed(() => {
  if (!filters.status) return '全部';
  return ORDER_STATUS_LABELS[filters.status];
});

const hasActiveFilters = computed(() => {
  return !!(filters.status || filters.date_start || filters.date_end || filters.order_no);
});

function onStatusChange(e: { detail: { value: number } }): void {
  const idx = e.detail.value;
  filters.status = statusOptions[idx].value as OrderStatus | undefined;
  if (!filters.status) {
    delete filters.status;
  }
}

function onDateStartChange(e: { detail: { value: string } }): void {
  filters.date_start = e.detail.value || undefined;
  if (!filters.date_start) {
    delete filters.date_start;
  }
}

function onDateEndChange(e: { detail: { value: string } }): void {
  filters.date_end = e.detail.value || undefined;
  if (!filters.date_end) {
    delete filters.date_end;
  }
}

function applyOrderNo(): void {
  const trimmed = orderNoInput.value.trim();
  filters.order_no = trimmed || undefined;
  if (!filters.order_no) {
    delete filters.order_no;
  }
}

function resetFilters(): void {
  delete filters.status;
  delete filters.date_start;
  delete filters.date_end;
  delete filters.order_no;
  orderNoInput.value = '';
  loadOrders();
}

function formatDate(raw: string): string {
  return raw.replace('T', ' ').slice(0, 19);
}

async function loadOrders(): Promise<void> {
  applyOrderNo();
  loading.value = true;
  try {
    const params: OrderFilterParams = {};
    if (filters.status) params.status = filters.status;
    if (filters.date_start) params.date_start = filters.date_start;
    if (filters.date_end) params.date_end = filters.date_end;
    if (filters.order_no) params.order_no = filters.order_no;
    orders.value = await dataSource.listOrdersByBuyer(buyerId.value, params);
  } finally {
    loading.value = false;
  }
}

function goDetail(orderId: number): void {
  navigateTo('pages/order/detail', {
    orderId
  });
}

onLoad((options) => {
  if (options?.status) {
    filters.status = options.status as OrderStatus;
  }
  if (options?.date_start) {
    filters.date_start = options.date_start;
  }
  if (options?.date_end) {
    filters.date_end = options.date_end;
  }
  if (options?.order_no) {
    filters.order_no = options.order_no;
    orderNoInput.value = options.order_no;
  }
});

onShow(loadOrders);
</script>

<style scoped>
.filter-section {
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.filter-section .field {
  margin-bottom: 0;
}

.field-label {
  display: block;
  margin-bottom: 4px;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
}

.filter-picker {
  min-height: 44px;
  border: 1.5px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 0 14px;
  background: var(--bg);
  font-size: 14px;
  color: var(--text);
  display: flex;
  align-items: center;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.filter-picker-active {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(79, 110, 247, 0.1);
  background: #fff;
}

.filter-input {
  min-height: 44px;
  border: 1.5px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 0 14px;
  background: var(--bg);
  font-size: 14px;
  color: var(--text);
  width: 100%;
  box-sizing: border-box;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.filter-input:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(79, 110, 247, 0.1);
  background: #fff;
  outline: none;
}

.filter-input-placeholder {
  color: var(--muted);
  font-size: 13px;
}

.filter-actions {
  display: flex;
  gap: 8px;
  margin-top: 4px;
}

.filter-actions button {
  flex: 1;
  font-size: 14px;
  font-weight: 600;
  padding: 0;
  min-height: 44px;
}
</style>
