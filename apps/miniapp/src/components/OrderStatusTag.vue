<template>
  <span class="status-tag" :class="`status-${status}`" :data-testid="`order-status-${status}`">{{ label }}</span>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { OrderStatus } from '@community-store/shared';
import { statusLabel } from '../services/format';

const props = defineProps<{
  status: OrderStatus;
}>();

const label = computed(() => statusLabel(props.status));
</script>
