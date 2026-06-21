export const STORAGE_KEYS = {
  merchants: 'community_store_merchants',
  products: 'community_store_products',
  orders: 'community_store_orders',
  cart: 'community_store_cart',
  users: 'community_store_users',
  addresses: 'community_store_addresses',
  authMiniapp: 'community_store_auth_miniapp',
  authMerchantWeb: 'community_store_auth_merchant_web'
} as const;

export const DEFAULT_MOCK_ADDRESS = {
  id: 1,
  buyer_id: 1,
  receiver_name: '张三',
  receiver_phone: '13800138000',
  receiver_address: '幸福社区 8 栋',
  latitude: 39.9042,
  longitude: 116.4074,
  is_default: true,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z'
} as const;
