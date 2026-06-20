<template>
	<view class="app-header" data-testid="miniapp-header">
		<view>
			<view class="header-title">
				社区版网上商店
				<!-- <u-tag text="uView" type="primary" plain size="mini" /> -->
			</view>
			<view class="header-subtitle">买家下单 + 商家履约（线下支付）</view>
		</view>
		<view class="header-message" data-testid="header-message-btn" @click="jumpToMessage">
			<text class="message-icon">💬</text>
			<view v-if="unreadCount > 0" class="message-badge" data-testid="message-badge">
				{{ unreadCount > 99 ? '99+' : unreadCount }}
			</view>
		</view>
	</view>

	<view class="app-nav" data-testid="miniapp-nav">
		<button class="secondary" data-testid="nav-home" @click="jumpTo('pages/home/index')">商家列表</button>
		<button class="secondary" data-testid="nav-favorite-list" @click="jumpTo('pages/favorite/list')">我的收藏</button>
		<button class="secondary" data-testid="nav-order-list" @click="jumpTo('pages/order/list')">我的订单</button>
		<button class="secondary" data-testid="nav-address-list" @click="jumpTo('pages/address/list')">收货地址</button>
	</view>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { getDataSource } from '../services/data-source';
import { useSessionStore } from '../stores/session';

const dataSource = getDataSource();
const sessionStore = useSessionStore();
const unreadCount = ref(0);

const buyerId = computed(() => sessionStore.state.user.id);

async function loadUnreadCount(): Promise<void> {
  try {
    unreadCount.value = await dataSource.getUnreadMessageCount(buyerId.value);
  } catch (e) {
    // ignore
  }
}

function jumpTo(path: string): void {
	const url = `/${path}`
	if (path === 'pages/home/index') {
		uni.reLaunch({ url })
		return
	}
	uni.navigateTo({ url })
}

function jumpToMessage(): void {
  uni.navigateTo({ url: '/pages/message/list' });
}

onMounted(() => {
  loadUnreadCount();
});

onShow(() => {
  loadUnreadCount();
});
</script>

<style scoped>
.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header-message {
  position: relative;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.message-icon {
  font-size: 22px;
}

.message-badge {
  position: absolute;
  top: 2px;
  right: 2px;
  min-width: 16px;
  height: 16px;
  background: #ff4d4f;
  color: #fff;
  font-size: 10px;
  line-height: 16px;
  text-align: center;
  border-radius: 8px;
  padding: 0 4px;
  font-weight: 500;
}
</style>
