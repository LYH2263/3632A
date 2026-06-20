import { ORDER_STATUS_LABELS, type OrderStatus } from '@community-store/shared';

export function formatMoney(value: number): string {
  return `¥${value.toFixed(2)}`;
}

export function statusLabel(status: OrderStatus): string {
  return ORDER_STATUS_LABELS[status] ?? status;
}
