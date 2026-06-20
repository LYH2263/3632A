<template>
  <view class="app-shell" data-testid="miniapp-shell">
    <AppTopBar />

    <view class="page-body">
      <section data-testid="message-list-page">
        <article class="card message-list-header" data-testid="message-list-header">
          <view class="message-title-row">
            <h2 class="message-list-title" data-testid="message-list-title">消息中心</h2>
            <view class="unread-badge" v-if="unreadCount > 0" data-testid="message-unread-badge">
              {{ unreadCount }} 条未读
            </view>
          </view>
          <view class="message-actions">
            <button
              class="secondary"
              :disabled="unreadCount === 0"
              data-testid="message-mark-all-read"
              @click="handleMarkAllRead"
            >
              全部已读
            </button>
            <button class="secondary" data-testid="message-list-refresh" @click="loadMessages">
              刷新
            </button>
          </view>
        </article>

        <article
          v-for="msg in messages"
          :key="msg.id"
          class="card message-card"
          :class="{ 'message-unread': !msg.is_read }"
          :data-testid="`message-list-item-${msg.id}`"
          @click="handleMessageClick(msg)"
        >
          <view class="message-card-head">
            <view class="message-icon" data-testid="message-icon">
              📦
            </view>
            <view class="message-card-info">
              <view class="message-card-title" :data-testid="`message-title-${msg.id}`">
                {{ msg.title }}
              </view>
              <view class="muted message-card-time" :data-testid="`message-time-${msg.id}`">
                {{ formatDate(msg.created_at) }}
              </view>
            </view>
            <view v-if="!msg.is_read" class="message-dot" data-testid="message-unread-dot"></view>
          </view>
          <view class="message-card-content" :data-testid="`message-content-${msg.id}`">
            {{ msg.content }}
          </view>
          <view class="message-card-footer">
            <text class="muted">订单号：{{ msg.order_id }}</text>
            <button
              class="text-btn"
              v-if="!msg.is_read"
              :data-testid="`message-mark-read-${msg.id}`"
              @click.stop="handleMarkRead(msg.id)"
            >
              标为已读
            </button>
          </view>
        </article>

        <div v-if="!messages.length && !loading" class="empty-box" data-testid="message-list-empty">
          <p class="empty-icon">💬</p>
          <p class="muted">暂无消息</p>
        </div>

        <view v-if="hasMore && !loading" class="load-more" data-testid="message-load-more">
          <button class="secondary" @click="loadMore">加载更多</button>
        </view>

        <view v-if="loading" class="loading-box" data-testid="message-loading">
          <text class="muted">加载中...</text>
        </view>
      </section>
    </view>
  </view>
</template>

<script setup lang="ts">
import type { Message } from '@community-store/shared';
import { computed, ref } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import AppTopBar from '../../components/AppTopBar.vue';
import { getDataSource } from '../../services/data-source';
import { useSessionStore } from '../../stores/session';
import { navigateTo } from '../../utils/navigation';

const dataSource = getDataSource();
const sessionStore = useSessionStore();

const messages = ref<Message[]>([]);
const loading = ref(false);
const page = ref(1);
const pageSize = 20;
const total = ref(0);
const unreadCount = ref(0);

const buyerId = computed(() => sessionStore.state.user.id);

const hasMore = computed(() => {
  return page.value * pageSize < total.value;
});

function formatDate(raw: string): string {
  return raw.replace('T', ' ').slice(0, 19);
}

async function loadMessages(): Promise<void> {
  loading.value = true;
  try {
    const result = await dataSource.listMessages(buyerId.value, 1, pageSize);
    messages.value = result.items;
    total.value = result.total;
    unreadCount.value = result.unread_count;
    page.value = 1;
  } finally {
    loading.value = false;
  }
}

async function loadMore(): Promise<void> {
  if (loading.value || !hasMore.value) return;
  loading.value = true;
  try {
    const nextPage = page.value + 1;
    const result = await dataSource.listMessages(buyerId.value, nextPage, pageSize);
    messages.value = [...messages.value, ...result.items];
    total.value = result.total;
    unreadCount.value = result.unread_count;
    page.value = nextPage;
  } finally {
    loading.value = false;
  }
}

async function handleMarkRead(messageId: number): Promise<void> {
  await dataSource.markMessageRead(messageId);
  const msg = messages.value.find((m) => m.id === messageId);
  if (msg) {
    msg.is_read = true;
    unreadCount.value = Math.max(0, unreadCount.value - 1);
  }
}

async function handleMarkAllRead(): Promise<void> {
  await dataSource.markAllMessagesRead(buyerId.value);
  messages.value.forEach((m) => {
    m.is_read = true;
  });
  unreadCount.value = 0;
}

function handleMessageClick(msg: Message): void {
  if (!msg.is_read) {
    handleMarkRead(msg.id);
  }
  navigateTo('pages/order/detail', {
    orderId: msg.order_id
  });
}

onShow(() => {
  loadMessages();
});
</script>

<style scoped>
.message-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.message-list-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.unread-badge {
  background: #ff4d4f;
  color: #fff;
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 10px;
}

.message-actions {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}

.message-actions button {
  flex: 1;
  font-size: 13px;
  padding: 6px 0;
  min-height: auto;
}

.message-card {
  cursor: pointer;
  transition: background 0.2s;
}

.message-unread {
  background: #f0f7ff;
}

.message-card-head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
  position: relative;
}

.message-icon {
  font-size: 24px;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f5f5;
  border-radius: 8px;
}

.message-card-info {
  flex: 1;
  min-width: 0;
}

.message-card-title {
  font-size: 15px;
  font-weight: 500;
  color: #333;
}

.message-card-time {
  font-size: 12px;
  margin-top: 2px;
}

.message-dot {
  width: 8px;
  height: 8px;
  background: #ff4d4f;
  border-radius: 50%;
  flex-shrink: 0;
}

.message-card-content {
  font-size: 13px;
  color: #666;
  line-height: 1.5;
  margin-bottom: 10px;
}

.message-card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
  border-top: 1px solid #f0f0f0;
  padding-top: 8px;
}

.text-btn {
  background: none;
  border: none;
  color: #1890ff;
  font-size: 12px;
  padding: 0;
  margin: 0;
  line-height: 1;
}

.text-btn::after {
  border: none;
}

.load-more {
  text-align: center;
  padding: 12px 0;
}

.load-more button {
  width: 60%;
  font-size: 13px;
  padding: 6px 0;
  min-height: auto;
}

.loading-box {
  text-align: center;
  padding: 20px 0;
}
</style>
