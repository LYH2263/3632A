<template>
	<view class="app-header" data-testid="miniapp-header">
		<view>
			<view class="header-title">
				社区版网上商店
				<!-- <u-tag text="uView" type="primary" plain size="mini" /> -->
			</view>
			<view class="header-subtitle">买家下单 + 商家履约（线下支付）</view>
		</view>

	</view>

	<view class="app-nav" data-testid="miniapp-nav">
		<button class="secondary" data-testid="nav-home" @click="jumpTo('pages/home/index')">商家列表</button>
		<button class="secondary" data-testid="nav-order-list" @click="jumpTo('pages/order/list')">我的订单</button>
	</view>
</template>

<script setup lang="ts">
function jumpTo(path: string): void {
	const url = `/${path}`
	if (path === 'pages/home/index') {
		uni.reLaunch({ url })
		return
	}
	uni.navigateTo({ url })
}
</script>
