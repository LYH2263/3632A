import type { OrderStatus, Weekday } from './types';

export const STORAGE_KEYS = {
  merchants: 'community_store_merchants',
  categories: 'community_store_categories',
  products: 'community_store_products',
  orders: 'community_store_orders',
  cart: 'community_store_cart',
  users: 'community_store_users',
  auth: 'community_store_auth',
  addresses: 'community_store_addresses',
  favorites: 'community_store_favorites',
  messages: 'community_store_messages',
  settlements: 'community_store_settlements'
} as const;

export const WEEKDAY_ORDER: Weekday[] = [1, 2, 3, 4, 5, 6, 0];

export const BUSINESS_HOURS_ERRORS = {
  NOT_OPEN: '商家当前非营业时段，暂无法下单',
  INVALID_HOURS: '营业时间配置错误'
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
