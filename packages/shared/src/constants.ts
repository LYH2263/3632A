import type { OrderStatus } from './types';

export const STORAGE_KEYS = {
  merchants: 'community_store_merchants',
  products: 'community_store_products',
  orders: 'community_store_orders',
  cart: 'community_store_cart',
  users: 'community_store_users',
  auth: 'community_store_auth'
} as const;

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: '待确认',
  confirmed: '待配送',
  delivering: '配送中',
  completed: '已完成',
  canceled: '已取消'
};

export const STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ['confirmed', 'canceled'],
  confirmed: ['delivering'],
  delivering: ['completed'],
  completed: [],
  canceled: []
};

export const OFFLINE_PAYMENT_TEXT = '线下支付（货到付款或到店支付）';
