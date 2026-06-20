<template>
  <view class="app-shell" data-testid="miniapp-shell">
    <AppTopBar />

    <view class="page-body">
      <section v-if="order" data-testid="order-detail-page">
        <article class="card order-detail-header" data-testid="order-detail-base-card">
          <div class="card-head">
            <div>
              <h2 class="order-detail-title">订单详情</h2>
              <p class="muted order-no-text" data-testid="order-detail-order-no">{{ order.order_no }}</p>
            </div>
            <OrderStatusTag :status="order.status" />
          </div>
          <div class="order-detail-info">
            <p class="order-detail-info-item" data-testid="order-detail-pay-method"><span class="label">支付方式</span>线下支付</p>
            <p class="order-detail-info-item" data-testid="order-detail-receiver"><span class="label">收货人</span>{{ order.receiver_name }} {{ order.receiver_phone }}</p>
            <p class="order-detail-info-item" data-testid="order-detail-address"><span class="label">地址</span>{{ order.receiver_address }}</p>
            <p class="order-detail-info-item" data-testid="order-detail-remark"><span class="label">备注</span>{{ order.remark || '无' }}</p>
          </div>
        </article>

        <article class="card" data-testid="order-detail-shipment-card">
          <h3>配货单</h3>
          <div class="table-wrap">
            <view class="table" data-testid="order-detail-shipment-table">
              <view class="table-head">
                <view class="table-th table-cell-name">商品</view>
                <view class="table-th table-cell-qty">数量</view>
                <view class="table-th table-cell-unit">单位</view>
              </view>
              <view
                v-for="item in order.items_snapshot"
                :key="item.product_id"
                class="table-row"
                :data-testid="`order-detail-shipment-item-${item.product_id}`"
              >
                <view class="table-td table-cell-name">{{ item.name }}</view>
                <view class="table-td table-cell-qty">{{ item.quantity }}</view>
                <view class="table-td table-cell-unit">{{ item.unit }}</view>
              </view>
            </view>
          </div>
        </article>

        <article class="card" data-testid="order-detail-price-card">
          <h3>价格表</h3>
          <div class="table-wrap">
            <view class="table" data-testid="order-detail-price-table">
              <view class="table-head">
                <view class="table-th table-cell-name">商品</view>
                <view class="table-th table-cell-price">单价</view>
                <view class="table-th table-cell-qty">数量</view>
                <view class="table-th table-cell-subtotal">小计</view>
              </view>
              <view
                v-for="item in order.items_snapshot"
                :key="`price-${item.product_id}`"
                class="table-row"
                :data-testid="`order-detail-price-item-${item.product_id}`"
              >
                <view class="table-td table-cell-name">{{ item.name }}</view>
                <view class="table-td table-cell-price">{{ formatMoney(item.price) }}</view>
                <view class="table-td table-cell-qty">{{ item.quantity }}</view>
                <view class="table-td table-cell-subtotal">{{ formatMoney(item.subtotal) }}</view>
              </view>
            </view>
          </div>
          <div class="order-summary">
            <p class="order-summary-item" data-testid="order-detail-items-amount">商品合计：<strong class="price">{{ formatMoney(order.items_amount) }}</strong></p>
            <p class="order-summary-item" data-testid="order-detail-delivery-fee">配送费：<strong class="price">{{ formatMoney(order.delivery_fee) }}</strong></p>
            <p class="order-summary-item order-total-row" data-testid="order-detail-total-amount">总金额：<strong class="price total-price">{{ formatMoney(order.total_amount) }}</strong></p>
          </div>
        </article>

        <article class="card" v-if="showCancel" data-testid="order-detail-cancel-card">
          <button class="danger" data-testid="order-detail-cancel-btn" @click="cancelOrder">取消订单</button>
        </article>
      </section>
      <p v-else class="muted" data-testid="order-detail-not-found">订单不存在。</p>
    </view>
  </view>
</template>

<script setup lang="ts">
import {
  type Order,
  type OrderStatus
} from '@community-store/shared';
import { computed, ref } from 'vue';
import { onLoad, onShow } from '@dcloudio/uni-app';
import AppTopBar from '../../components/AppTopBar.vue';
import OrderStatusTag from '../../components/OrderStatusTag.vue';
import { getDataSource } from '../../services/data-source';
import { formatMoney } from '../../services/format';
import { showMessage } from '../../utils/ui';
import { numberOption } from '../../utils/navigation';

const dataSource = getDataSource();
const order = ref<Order | null>(null);

const orderId = ref(0);

const showCancel = computed(
  () => order.value?.status === 'pending'
);

async function loadOrder(): Promise<void> {
  order.value = await dataSource.getOrder(orderId.value);
}

async function changeStatus(nextStatus: OrderStatus): Promise<void> {
  if (!order.value) {
    return;
  }
  try {
    order.value = await dataSource.updateOrderStatus(order.value.id, nextStatus);
    showMessage('状态更新成功');
  } catch (error) {
    showMessage((error as Error).message);
  }
}

async function cancelOrder(): Promise<void> {
  if (!order.value) {
    return;
  }
  await changeStatus('canceled');
}

onLoad((options) => {
  orderId.value = numberOption(options, 'orderId', 0);
});

onShow(loadOrder);
</script>
