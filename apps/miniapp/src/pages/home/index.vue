<template>
	<view class="app-shell" data-testid="miniapp-shell">
		<AppTopBar />

		<view class="page-body">
			<section data-testid="home-page">
				<div class="search-bar">
					<label class="sr-only" for="home-search-input">搜索商家名称</label>
					<input id="home-search-input" v-model="keyword" data-testid="home-search-input" placeholder="搜索商家名称" />
				</div>

				<article
					v-for="merchant in filteredMerchants"
					:key="merchant.id"
					class="card merchant-card"
					:data-testid="`home-merchant-card-${merchant.id}`"
				>
					<div class="card-head">
						<h3 class="merchant-card-title">{{ merchant.name }}</h3>
						<span
							class="status-tag"
							:class="merchant.is_open ? 'status-completed' : 'status-canceled'"
							:data-testid="`home-merchant-status-${merchant.id}`"
						>
							{{ merchant.is_open ? '营业中' : '休息中' }}
						</span>
					</div>
					<div class="merchant-info">
						<p class="muted">📍 {{ merchant.address }}</p>
						<p class="muted">🚚 {{ merchant.delivery_note }}</p>
					</div>
					<div class="merchant-pricing">
						<span>起送 <strong class="price">{{ formatMoney(merchant.min_order_amount) }}</strong></span>
						<span class="divider">|</span>
						<span>配送费 <strong class="price">{{ formatMoney(merchant.delivery_fee) }}</strong></span>
					</div>
					<button
						class="primary"
						:data-testid="`home-enter-merchant-${merchant.id}`"
						:disabled="!merchant.is_open"
						@click="goMerchant(merchant.id)"
					>
						进入商家
					</button>
				</article>

				<div v-if="!filteredMerchants.length" class="empty-box" data-testid="home-empty">
					<p class="empty-icon">🏪</p>
					<p class="muted">暂无匹配商家</p>
				</div>
			</section>
		</view>
	</view>
</template>

<script setup lang="ts">
import type { Merchant } from '@community-store/shared'
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import AppTopBar from '../../components/AppTopBar.vue'
import { formatMoney } from '../../services/format'
import { getDataSource } from '../../services/data-source'

const dataSource = getDataSource()
const merchants = ref<Merchant[]>([])
const keyword = ref('')

const filteredMerchants = computed(() => {
	const normalized = keyword.value.trim().toLowerCase()
	if (!normalized) {
		return merchants.value
	}
	return merchants.value.filter((item) => item.name.toLowerCase().includes(normalized))
})

async function loadData(): Promise<void> {
	merchants.value = await dataSource.listMerchants()
}

function goMerchant(merchantId: number): void {
	uni.navigateTo({
		url: `/pages/shop/detail?merchantId=${merchantId}`,
	})
}

onShow(loadData)
</script>
