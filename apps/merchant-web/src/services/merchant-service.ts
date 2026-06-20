import {
  canTransitionStatus,
  seedMerchants,
  seedProducts,
  seedUsers,
  STORAGE_KEYS,
  type LoginPayload,
  type Merchant,
  type Order,
  type OrderStatus,
  type Product,
  type User
} from '@community-store/shared';
import { request } from './http';
import { getRuntimeConfig } from './runtime-env';
import { readJSON, removeValue, writeJSON } from './storage';

const AUTH_KEY = `${STORAGE_KEYS.auth}_merchant_web`;

interface AuthSession {
  token: string;
  user: Omit<User, 'password'>;
}

export interface RegisterMerchantPayload {
  username: string;
  password: string;
  nickname: string;
  phone: string;
  merchant_name: string;
  address: string;
  delivery_note?: string;
  min_order_amount?: number;
  delivery_fee?: number;
  is_open?: boolean;
}

function normalizeAuthSession(raw: unknown): AuthSession | null {
  if (raw && typeof raw === 'object' && 'user' in raw && 'token' in raw) {
    const session = raw as Partial<AuthSession>;
    if (
      session.user &&
      typeof session.token === 'string' &&
      session.token.trim()
    ) {
      return session as AuthSession;
    }
  }

  if (raw && typeof raw === 'object' && 'id' in raw) {
    const user = raw as Omit<User, 'password'>;
    return {
      token: `django-token-${user.id}`,
      user
    };
  }

  return null;
}

function readAuthSession(): AuthSession | null {
  const raw = readJSON<unknown>(AUTH_KEY, null);
  return normalizeAuthSession(raw);
}

function writeAuthSession(session: AuthSession): void {
  writeJSON(AUTH_KEY, session);
}

const MOCK_DB_VERSION = 2;
const VERSION_KEY = 'community_store_mock_db_version';

function ensureMockStorage(): void {
  const storedVersion = readJSON<number>(VERSION_KEY, 0);
  if (storedVersion < MOCK_DB_VERSION) {
    writeJSON(STORAGE_KEYS.merchants, seedMerchants);
    writeJSON(STORAGE_KEYS.products, seedProducts);
    writeJSON(STORAGE_KEYS.users, seedUsers);
    writeJSON(VERSION_KEY, MOCK_DB_VERSION);
  }

  const merchants = readJSON<Merchant[] | null>(STORAGE_KEYS.merchants, null);
  if (!merchants) {
    writeJSON(STORAGE_KEYS.merchants, seedMerchants);
  }

  const products = readJSON<Product[] | null>(STORAGE_KEYS.products, null);
  if (!products) {
    writeJSON(STORAGE_KEYS.products, seedProducts);
  }

  const users = readJSON<User[] | null>(STORAGE_KEYS.users, null);
  if (!users) {
    writeJSON(STORAGE_KEYS.users, seedUsers);
  }

  const orders = readJSON<Order[] | null>(STORAGE_KEYS.orders, null);
  if (!orders) {
    writeJSON(STORAGE_KEYS.orders, [] as Order[]);
  }
}

function readMerchants(): Merchant[] {
  ensureMockStorage();
  return readJSON(STORAGE_KEYS.merchants, seedMerchants);
}

function writeMerchants(value: Merchant[]): void {
  writeJSON(STORAGE_KEYS.merchants, value);
}

function readProducts(): Product[] {
  ensureMockStorage();
  return readJSON(STORAGE_KEYS.products, seedProducts);
}

function writeProducts(value: Product[]): void {
  writeJSON(STORAGE_KEYS.products, value);
}

function readOrders(): Order[] {
  ensureMockStorage();
  return readJSON(STORAGE_KEYS.orders, [] as Order[]);
}

function writeOrders(value: Order[]): void {
  writeJSON(STORAGE_KEYS.orders, value);
}

function readUsers(): User[] {
  ensureMockStorage();
  return readJSON(STORAGE_KEYS.users, seedUsers);
}

function nextId(items: Array<{ id: number }>): number {
  return items.length ? Math.max(...items.map((item) => item.id)) + 1 : 1;
}

class MerchantService {
  private readonly config = getRuntimeConfig();

  getAuthUser(): Omit<User, 'password'> | null {
    return readAuthSession()?.user ?? null;
  }

  getAuthToken(): string | null {
    return readAuthSession()?.token ?? null;
  }

  logout(): void {
    removeValue(AUTH_KEY);
  }

  async login(payload: LoginPayload): Promise<Omit<User, 'password'>> {
    if (this.config.dataMode === 'api') {
      const result = await request<{ token: string; user: Omit<User, 'password'> }>(
        '/auth/login',
        {
          method: 'POST',
          body: JSON.stringify(payload)
        }
      );
      writeAuthSession({
        token: result.token,
        user: result.user
      });
      return result.user;
    }

    const user = readUsers().find(
      (item) =>
        item.username === payload.username &&
        item.password === payload.password &&
        item.role === 'merchant'
    );

    if (!user) {
      throw new Error('账号或密码错误');
    }

    const authUser: Omit<User, 'password'> = {
      id: user.id,
      username: user.username,
      role: user.role,
      merchant_id: user.merchant_id,
      nickname: user.nickname,
      phone: user.phone
    };
    writeAuthSession({
      token: `mock-token-${authUser.id}`,
      user: authUser
    });
    return authUser;
  }

  async registerMerchant(
    payload: RegisterMerchantPayload
  ): Promise<Omit<User, 'password'>> {
    if (this.config.dataMode === 'api') {
      const result = await request<{ token: string; user: Omit<User, 'password'> }>(
        '/auth/register-merchant',
        {
          method: 'POST',
          body: JSON.stringify(payload)
        }
      );
      writeAuthSession({
        token: result.token,
        user: result.user
      });
      return result.user;
    }

    const merchants = readMerchants();
    const users = readUsers();

    if (users.some((item) => item.username === payload.username)) {
      throw new Error('用户名已存在');
    }

    const merchant: Merchant = {
      id: nextId(merchants),
      name: payload.merchant_name,
      phone: payload.phone,
      address: payload.address,
      delivery_note: payload.delivery_note?.trim() || '请联系商家协商配送',
      min_order_amount: Number(payload.min_order_amount ?? 0),
      delivery_fee: Number(payload.delivery_fee ?? 0),
      is_open: payload.is_open ?? true
    };
    merchants.push(merchant);
    writeMerchants(merchants);

    const createdUser: User = {
      id: nextId(users),
      username: payload.username,
      password: payload.password,
      role: 'merchant',
      merchant_id: merchant.id,
      nickname: payload.nickname,
      phone: payload.phone
    };
    users.push(createdUser);
    writeJSON(STORAGE_KEYS.users, users);

    const authUser: Omit<User, 'password'> = {
      id: createdUser.id,
      username: createdUser.username,
      role: createdUser.role,
      merchant_id: createdUser.merchant_id,
      nickname: createdUser.nickname,
      phone: createdUser.phone
    };

    writeAuthSession({
      token: `mock-token-${authUser.id}`,
      user: authUser
    });
    return authUser;
  }

  async getMerchant(merchantId: number): Promise<Merchant | null> {
    if (this.config.dataMode === 'api') {
      const merchants = await request<Merchant[]>('/merchants');
      return merchants.find((item) => item.id === merchantId) ?? null;
    }
    return readMerchants().find((item) => item.id === merchantId) ?? null;
  }

  async updateMerchant(
    merchantId: number,
    payload: Partial<Merchant>
  ): Promise<Merchant> {
    if (this.config.dataMode === 'api') {
      return request<Merchant>(`/merchants/${merchantId}`, {
        method: 'PATCH',
        body: JSON.stringify(payload)
      });
    }

    const merchants = readMerchants();
    const target = merchants.find((item) => item.id === merchantId);
    if (!target) {
      throw new Error('商家不存在');
    }

    Object.assign(target, payload);
    writeMerchants(merchants);
    return target;
  }

  async listProducts(merchantId: number): Promise<Product[]> {
    if (this.config.dataMode === 'api') {
      return request<Product[]>(`/products?merchant_id=${merchantId}`);
    }

    return readProducts().filter((item) => item.merchant_id === merchantId);
  }

  async createProduct(payload: Omit<Product, 'id'>): Promise<Product> {
    if (this.config.dataMode === 'api') {
      return request<Product>('/products', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
    }

    const products = readProducts();
    const created: Product = {
      ...payload,
      id: nextId(products)
    };
    products.push(created);
    writeProducts(products);
    return created;
  }

  async updateProduct(
    productId: number,
    payload: Partial<Product>
  ): Promise<Product> {
    if (this.config.dataMode === 'api') {
      return request<Product>(`/products/${productId}`, {
        method: 'PATCH',
        body: JSON.stringify(payload)
      });
    }

    const products = readProducts();
    const target = products.find((item) => item.id === productId);
    if (!target) {
      throw new Error('商品不存在');
    }

    Object.assign(target, payload);
    writeProducts(products);
    return target;
  }

  async listOrdersByMerchant(merchantId: number): Promise<Order[]> {
    if (this.config.dataMode === 'api') {
      return request<Order[]>(`/orders?merchant_id=${merchantId}`);
    }

    return readOrders()
      .filter((item) => item.merchant_id === merchantId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }

  async updateOrderStatus(orderId: number, status: OrderStatus): Promise<Order> {
    if (this.config.dataMode === 'api') {
      return request<Order>(`/orders/${orderId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status })
      });
    }

    const orders = readOrders();
    const target = orders.find((item) => item.id === orderId);
    if (!target) {
      throw new Error('订单不存在');
    }

    if (!canTransitionStatus(target.status, status)) {
      throw new Error('状态不可逆或非法迁移');
    }

    target.status = status;
    target.updated_at = new Date().toISOString();
    writeOrders(orders);
    return target;
  }
}

export const merchantService = new MerchantService();
