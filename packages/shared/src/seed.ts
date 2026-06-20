import type { Cart, Merchant, Product, User } from './types';

export const seedUsers: User[] = [
  {
    id: 1,
    username: 'buyer',
    password: 'buyer123',
    role: 'buyer',
    nickname: '社区住户',
    phone: '13800138000'
  },
  {
    id: 2,
    username: 'merchant_fruit',
    password: 'merchant123',
    role: 'merchant',
    merchant_id: 1,
    nickname: '鲜果超市店主',
    phone: '13900001111'
  },
  {
    id: 3,
    username: 'merchant_market',
    password: 'merchant123',
    role: 'merchant',
    merchant_id: 2,
    nickname: '便民小超店主',
    phone: '13900002222'
  }
];

export const seedMerchants: Merchant[] = [
  {
    id: 1,
    name: '鲜果超市',
    phone: '020-11110001',
    address: '幸福社区 1 号楼底商',
    delivery_note: '2 公里内 30 分钟配送',
    min_order_amount: 25,
    delivery_fee: 3,
    is_open: true
  },
  {
    id: 2,
    name: '便民小超',
    phone: '020-22220002',
    address: '幸福社区 3 号楼底商',
    delivery_note: '晚 10 点前配送',
    min_order_amount: 18,
    delivery_fee: 2,
    is_open: true
  }
];

export const seedProducts: Product[] = [
  {
    id: 1001,
    merchant_id: 1,
    name: '红富士苹果',
    price: 6.8,
    unit: '斤',
    stock: 100,
    is_active: true,
    image_url: '/static/images/products/apple.jpg',
    description: '当日新鲜到货，清甜爽口。'
  },
  {
    id: 1002,
    merchant_id: 1,
    name: '进口香蕉',
    price: 5.2,
    unit: '斤',
    stock: 88,
    is_active: true,
    image_url: '/static/images/products/banana.jpg',
    description: '口感软糯，适合家庭早餐。'
  },
  {
    id: 2001,
    merchant_id: 2,
    name: '纯牛奶',
    price: 12.9,
    unit: '瓶',
    stock: 50,
    is_active: true,
    image_url: '/static/images/products/milk.jpg',
    description: '1L 装，冷藏保存。'
  },
  {
    id: 2002,
    merchant_id: 2,
    name: '鸡蛋',
    price: 9.8,
    unit: '盒',
    stock: -1,
    is_active: true,
    image_url: '/static/images/products/egg.jpg',
    description: '10 枚/盒，新鲜农场蛋。'
  }
];

export const emptyCart: Cart = {
  merchant_id: null,
  items: [],
  updated_at: new Date(0).toISOString()
};
