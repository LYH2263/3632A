<template>
  <view class="app-shell" data-testid="miniapp-shell">
    <AppTopBar />

    <view class="page-body">
      <section data-testid="address-list-page">
        <article class="card address-list-header" data-testid="address-list-header">
          <h2 class="address-list-title" data-testid="address-list-title">收货地址</h2>
          <p class="muted" data-testid="address-list-count">共 {{ addresses.length }} 个地址</p>
          <button class="primary mt-sm" data-testid="address-add-btn" @click="goAdd">
            + 新增地址
          </button>
        </article>

        <article
          v-for="addr in addresses"
          :key="addr.id"
          class="card address-card"
          :class="{ 'address-card-selectable': selectMode }"
          :data-testid="`address-list-item-${addr.id}`"
          @click="handleSelectAddress(addr.id)"
          @tap="handleSelectAddress(addr.id)"
        >
          <div class="address-card-head">
            <span class="address-receiver" :data-testid="`address-receiver-${addr.id}`">
              {{ addr.receiver_name }}
            </span>
            <span class="address-phone" :data-testid="`address-phone-${addr.id}`">
              {{ addr.receiver_phone }}
            </span>
            <u-tag
              v-if="addr.is_default"
              text="默认"
              type="primary"
              size="mini"
              class="address-default-tag"
            />
            <span v-if="selectMode && addr.is_default" class="address-selected-icon">✓</span>
          </div>
          <p class="address-detail muted" :data-testid="`address-detail-${addr.id}`">
            {{ addr.receiver_address }}
          </p>
          <div class="address-card-actions" @click.stop @tap.stop>
            <button
              v-if="!addr.is_default && !selectMode"
              class="secondary"
              :data-testid="`address-set-default-${addr.id}`"
              @click="handleSetDefault(addr.id)"
            >
              设为默认
            </button>
            <button
              class="secondary"
              :data-testid="`address-edit-${addr.id}`"
              @click="goEdit(addr.id)"
            >
              编辑
            </button>
            <button
              class="secondary danger"
              :data-testid="`address-delete-${addr.id}`"
              @click="handleDelete(addr.id)"
            >
              删除
            </button>
          </div>
        </article>

        <div v-if="!addresses.length" class="empty-box" data-testid="address-list-empty">
          <p class="empty-icon">📍</p>
          <p class="muted">暂无收货地址</p>
          <button class="primary mt-sm" data-testid="address-empty-add-btn" @click="goAdd">
            添加收货地址
          </button>
        </div>
      </section>
    </view>
  </view>
</template>

<script setup lang="ts">
import type { Address } from '@community-store/shared';
import { ref } from 'vue';
import { onLoad, onShow } from '@dcloudio/uni-app';
import AppTopBar from '../../components/AppTopBar.vue';
import { getDataSource } from '../../services/data-source';
import { useSessionStore } from '../../stores/session';
import { navigateTo, numberOption } from '../../utils/navigation';
import { showMessage } from '../../utils/ui';

const dataSource = getDataSource();
const sessionStore = useSessionStore();

const addresses = ref<Address[]>([]);
const selectMode = ref(false);

async function loadAddresses(): Promise<void> {
  try {
    addresses.value = await dataSource.listAddresses(sessionStore.state.user.id);
  } catch (error) {
    showMessage((error as Error).message || '加载地址失败');
  }
}

function goAdd(): void {
  navigateTo('pages/address/edit');
}

function goEdit(addressId: number): void {
  navigateTo('pages/address/edit', { addressId });
}

async function handleSetDefault(addressId: number): Promise<void> {
  try {
    await dataSource.setDefaultAddress(addressId);
    showMessage('已设为默认地址');
    await loadAddresses();
  } catch (error) {
    showMessage((error as Error).message || '设置失败');
  }
}

async function handleSelectAddress(addressId: number): Promise<void> {
  if (!selectMode.value) {
    return;
  }
  try {
    await dataSource.setDefaultAddress(addressId);
    uni.navigateBack();
  } catch (error) {
    showMessage((error as Error).message || '选择失败');
  }
}

async function handleDelete(addressId: number): Promise<void> {
  uni.showModal({
    title: '确认删除',
    content: '确定要删除这个地址吗？',
    success: async (res) => {
      if (res.confirm) {
        try {
          await dataSource.deleteAddress(addressId);
          showMessage('删除成功');
          await loadAddresses();
        } catch (error) {
          showMessage((error as Error).message || '删除失败');
        }
      }
    }
  });
}

onLoad((options) => {
  const mode = options?.mode;
  if (mode === 'select') {
    selectMode.value = true;
  }
});

onShow(loadAddresses);
</script>

<style scoped>
.address-list-header {
  display: flex;
  flex-direction: column;
}

.address-list-title {
  margin: 0 0 4px 0;
  font-size: 18px;
  font-weight: 600;
}

.address-card {
  margin-bottom: 12px;
  transition: all 0.2s ease;
}

.address-card-selectable {
  cursor: pointer;
}

.address-card-selectable:active {
  transform: scale(0.98);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.address-card-head {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.address-receiver {
  font-size: 16px;
  font-weight: 600;
}

.address-phone {
  color: #64748b;
  font-size: 14px;
}

.address-default-tag {
  margin-left: 4px;
}

.address-selected-icon {
  margin-left: auto;
  color: #2563eb;
  font-size: 18px;
  font-weight: 700;
}

.address-detail {
  margin: 0 0 12px 0;
  font-size: 14px;
  line-height: 1.5;
}

.address-card-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.danger {
  color: #ef4444;
}

.empty-box {
  text-align: center;
  padding: 40px 20px;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 12px;
}
</style>
