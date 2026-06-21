import {
  canTransitionStatus,
  ensureMockStorageCommon,
  getDefaultBusinessHours,
  MOCK_DB_CURRENT_VERSION,
  MOCK_DB_VERSION_KEY,
  migrateMerchant,
  migrateMerchantList,
  ORDER_STATUS_LABELS,
  seedCategories,
  seedMerchants,
  seedProducts,
  seedUsers,
  STORAGE_KEYS,
  type Category,
  type LoginPayload,
  type LowStockAlertResult,
  type Merchant,
  type Message,
  type Order,
  type OrderFilterParams,
  type OrderStatus,
  type Product,
  type StockLedger,
  type StockLedgerFilterParams,
  type StockLedgerListResult,
  type StockLedgerReason,
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

export interface SettlementItem {
  id: number;
  order_id: number;
  order_no: string;
  order_created_at: string;
  items_amount: string;
  delivery_fee: string;
  commission_amount: string;
  settle_amount: string;
  created_at: string;
}

export interface SettlementStatement {
  id: number;
  statement_no: string;
  merchant_id: number;
  merchant_name: string;
  period_year: number;
  period_month: number;
  status: 'draft' | 'confirmed';
  order_count: number;
  items_amount_total: string;
  delivery_fee_total: string;
  commission_rate: string;
  commission_amount: string;
  settle_amount: string;
  confirmed_at: string | null;
  confirmed_by_id: number | null;
  created_at: string;
  updated_at: string;
  items?: SettlementItem[];
}

export interface SettlementFilterParams {
  status?: 'draft' | 'confirmed';
  year?: number;
  month?: number;
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

const MOCK_DB_VERSION = MOCK_DB_CURRENT_VERSION;
const VERSION_KEY = MOCK_DB_VERSION_KEY;

function ensureMockStorage(): void {
  ensureMockStorageCommon({
    readJSON: <T,>(key: string, fallback: T | null) => readJSON<T | null>(key, fallback),
    writeJSON: (key: string, value: unknown) => writeJSON(key, value),
    extraEnsures: {
      addresses: () => {
        if (!readJSON(STORAGE_KEYS.addresses, null)) {
          writeJSON(STORAGE_KEYS.addresses, []);
        }
      },
      favorites: () => {
        if (!readJSON(STORAGE_KEYS.favorites, null)) {
          writeJSON(STORAGE_KEYS.favorites, []);
        }
      },
      messages: () => {
        if (!readJSON(STORAGE_KEYS.messages, null)) {
          writeJSON(STORAGE_KEYS.messages, []);
        }
      },
      settlements: () => {
        if (!readJSON(STORAGE_KEYS.settlements, null)) {
          writeJSON(STORAGE_KEYS.settlements, [] as SettlementStatement[]);
        }
      }
    }
  });
}

function readSettlements(): SettlementStatement[] {
  ensureMockStorage();
  return readJSON(STORAGE_KEYS.settlements, [] as SettlementStatement[]);
}

function writeSettlements(value: SettlementStatement[]): void {
  writeJSON(STORAGE_KEYS.settlements, value);
}

function readCategories(): Category[] {
  ensureMockStorage();
  return readJSON(STORAGE_KEYS.categories, seedCategories);
}

function writeCategories(value: Category[]): void {
  writeJSON(STORAGE_KEYS.categories, value);
}

function readMerchants(): Merchant[] {
  ensureMockStorage();
  const raw = readJSON<Merchant[] | null>(STORAGE_KEYS.merchants, null);
  const migrated = migrateMerchantList(raw ?? []);
  if (!raw || JSON.stringify(raw) !== JSON.stringify(migrated)) {
    writeMerchants(migrated);
  }
  return migrated;
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

function readMessages(): Message[] {
  ensureMockStorage();
  return readJSON(STORAGE_KEYS.messages, [] as Message[]);
}

function writeMessages(value: Message[]): void {
  writeJSON(STORAGE_KEYS.messages, value);
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
      token: `django-token-${authUser.id}`,
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
      delivery_radius_km: 0,
      latitude: null,
      longitude: null,
      is_open: payload.is_open ?? true,
      business_hours: getDefaultBusinessHours(),
      low_stock_threshold: 5
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
      token: `django-token-${authUser.id}`,
      user: authUser
    });
    return authUser;
  }

  async getMerchant(merchantId: number): Promise<Merchant | null> {
    if (this.config.dataMode === 'api') {
      return request<Merchant | null>(`/merchants/${merchantId}`);
    }
    const result = readMerchants().find((item) => item.id === merchantId) ?? null;
    return result ? migrateMerchant(result) : null;
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

  async listCategories(merchantId: number): Promise<Category[]> {
    if (this.config.dataMode === 'api') {
      return request<Category[]>(`/categories?merchant_id=${merchantId}`);
    }

    const categories = readCategories()
      .filter((item) => item.merchant_id === merchantId)
      .sort((a, b) => a.sort_order - b.sort_order);

    const products = readProducts();
    return categories.map((cat) => ({
      ...cat,
      product_count: products.filter((p) => p.category_id === cat.id).length
    }));
  }

  async createCategory(payload: Omit<Category, 'id' | 'created_at'>): Promise<Category> {
    if (this.config.dataMode === 'api') {
      return request<Category>('/categories', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
    }

    const categories = readCategories();
    if (categories.some((c) => c.merchant_id === payload.merchant_id && c.name === payload.name)) {
      throw new Error('分类名称已存在');
    }

    const created: Category = {
      ...payload,
      id: nextId(categories),
      created_at: new Date().toISOString()
    };
    categories.push(created);
    writeCategories(categories);
    return created;
  }

  async updateCategory(
    categoryId: number,
    payload: Partial<Category>
  ): Promise<Category> {
    if (this.config.dataMode === 'api') {
      return request<Category>(`/categories/${categoryId}`, {
        method: 'PATCH',
        body: JSON.stringify(payload)
      });
    }

    const categories = readCategories();
    const target = categories.find((item) => item.id === categoryId);
    if (!target) {
      throw new Error('分类不存在');
    }

    if (payload.name && payload.name !== target.name) {
      if (categories.some((c) => c.merchant_id === target.merchant_id && c.name === payload.name && c.id !== categoryId)) {
        throw new Error('分类名称已存在');
      }
    }

    Object.assign(target, payload);
    writeCategories(categories);
    return target;
  }

  async deleteCategory(categoryId: number): Promise<void> {
    if (this.config.dataMode === 'api') {
      await request<void>(`/categories/${categoryId}`, {
        method: 'DELETE'
      });
      return;
    }

    const categories = readCategories();
    const target = categories.find((item) => item.id === categoryId);
    if (!target) {
      throw new Error('分类不存在');
    }

    const products = readProducts();
    const productCount = products.filter((p) => p.category_id === categoryId).length;
    if (productCount > 0) {
      throw new Error(`该分类下有 ${productCount} 个商品，请先迁移或删除商品后再删除分类`);
    }

    const filtered = categories.filter((item) => item.id !== categoryId);
    writeCategories(filtered);
  }

  async listProducts(merchantId: number, categoryId?: number): Promise<Product[]> {
    if (this.config.dataMode === 'api') {
      const params = new URLSearchParams();
      params.set('merchant_id', String(merchantId));
      if (categoryId) {
        params.set('category_id', String(categoryId));
      }
      return request<Product[]>(`/products?${params.toString()}`);
    }

    let result = readProducts().filter((item) => item.merchant_id === merchantId);
    if (categoryId) {
      result = result.filter((item) => item.category_id === categoryId);
    }
    return result;
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

  async listOrdersByMerchant(merchantId: number, filters?: OrderFilterParams): Promise<Order[]> {
    if (this.config.dataMode === 'api') {
      const params = new URLSearchParams();
      params.set('merchant_id', String(merchantId));
      if (filters?.status) params.set('status', filters.status);
      if (filters?.date_start) params.set('date_start', filters.date_start);
      if (filters?.date_end) params.set('date_end', filters.date_end);
      if (filters?.order_no) params.set('order_no', filters.order_no);
      if (filters?.phone_suffix) params.set('phone_suffix', filters.phone_suffix);
      return request<Order[]>(`/orders?${params.toString()}`);
    }

    let result = readOrders()
      .filter((item) => item.merchant_id === merchantId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
    if (filters?.status) {
      result = result.filter((o) => o.status === filters.status);
    }
    if (filters?.date_start) {
      result = result.filter((o) => o.created_at >= filters.date_start!);
    }
    if (filters?.date_end) {
      const end = filters.date_end.includes('T') ? filters.date_end : filters.date_end + 'T23:59:59';
      result = result.filter((o) => o.created_at <= end);
    }
    if (filters?.order_no) {
      const keyword = filters.order_no.toLowerCase();
      result = result.filter((o) => o.order_no.toLowerCase().includes(keyword));
    }
    if (filters?.phone_suffix) {
      result = result.filter((o) => o.receiver_phone.endsWith(filters.phone_suffix));
    }
    return result;
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
    this._createOrderStatusMessage(target, status);
    return target;
  }

  async getLowStockAlert(): Promise<LowStockAlertResult> {
    if (this.config.dataMode === 'api') {
      return request<LowStockAlertResult>('/products/low-stock');
    }

    const authUser = readAuthSession()?.user;
    if (!authUser || !authUser.merchant_id) {
      throw new Error('请先登录');
    }

    const merchant = readMerchants().find((m) => m.id === authUser.merchant_id);
    if (!merchant) {
      throw new Error('商家不存在');
    }

    const threshold = merchant.low_stock_threshold ?? 5;
    const products = readProducts()
      .filter(
        (p) =>
          p.merchant_id === authUser.merchant_id &&
          p.stock !== -1 &&
          p.stock <= threshold
      )
      .sort((a, b) => a.stock - b.stock);

    return {
      threshold,
      low_stock_count: products.length,
      products: products.map((p) => ({
        ...p,
        is_low_stock: true
      }))
    };
  }

  async listStockLedger(filters?: StockLedgerFilterParams): Promise<StockLedgerListResult> {
    const REASON_CHOICES: Array<{ value: StockLedgerReason; label: string }> = [
      { value: 'order_deduct', label: '下单扣减' },
      { value: 'merchant_adjust', label: '商家调整' },
      { value: 'batch_toggle', label: '批量上下架' },
      { value: 'order_cancel', label: '取消订单返还' }
    ];

    if (this.config.dataMode === 'api') {
      const params = new URLSearchParams();
      if (filters?.product_id) params.set('product_id', String(filters.product_id));
      if (filters?.reason) params.set('reason', filters.reason);
      if (filters?.date_start) params.set('date_start', filters.date_start);
      if (filters?.date_end) params.set('date_end', filters.date_end);
      if (filters?.page) params.set('page', String(filters.page));
      if (filters?.page_size) params.set('page_size', String(filters.page_size));
      const qs = params.toString();
      return request<StockLedgerListResult>(`/products/stock-ledger${qs ? '?' + qs : ''}`);
    }

    const authUser = readAuthSession()?.user;
    if (!authUser || !authUser.merchant_id) {
      throw new Error('请先登录');
    }

    const merchantId = authUser.merchant_id;
    const allProducts = readProducts().filter((p) => p.merchant_id === merchantId);
    const productMap = new Map(allProducts.map((p) => [p.id, p]));

    const raw = readJSON<StockLedger[] | null>('stock_ledgers', null);
    let items = (raw ?? []).filter((item) => item.merchant_id === merchantId);

    if (filters?.product_id) {
      items = items.filter((item) => item.product_id === filters.product_id);
    }
    if (filters?.reason) {
      items = items.filter((item) => item.reason === filters.reason);
    }
    if (filters?.date_start) {
      items = items.filter((item) => item.created_at >= filters.date_start!);
    }
    if (filters?.date_end) {
      const end = filters.date_end.includes('T') ? filters.date_end : filters.date_end + 'T23:59:59';
      items = items.filter((item) => item.created_at <= end);
    }

    items.sort((a, b) => b.created_at.localeCompare(a.created_at));

    const page = filters?.page ?? 1;
    const page_size = filters?.page_size ?? 20;
    const total = items.length;
    const total_pages = Math.max(1, Math.ceil(total / page_size));
    const start = (page - 1) * page_size;
    const paged = items.slice(start, start + page_size).map((item) => {
      const choice = REASON_CHOICES.find((c) => c.value === item.reason);
      return {
        ...item,
        product_name: productMap.get(item.product_id)?.name ?? `商品#${item.product_id}`,
        reason_label: choice?.label ?? item.reason
      };
    });

    return {
      items: paged,
      total,
      page,
      page_size,
      total_pages,
      has_next: page < total_pages,
      has_previous: page > 1,
      reason_choices: REASON_CHOICES
    };
  }

  async listSettlements(filters?: SettlementFilterParams): Promise<SettlementStatement[]> {
    if (this.config.dataMode === 'api') {
      const params = new URLSearchParams();
      if (filters?.status) params.set('status', filters.status);
      if (filters?.year) params.set('year', String(filters.year));
      if (filters?.month) params.set('month', String(filters.month));
      const qs = params.toString();
      return request<SettlementStatement[]>(`/settlements${qs ? '?' + qs : ''}`);
    }

    const authUser = readAuthSession()?.user;
    if (!authUser?.merchant_id) {
      throw new Error('请先登录');
    }

    let result = readSettlements().filter((item) => item.merchant_id === authUser.merchant_id);
    if (filters?.status) {
      result = result.filter((item) => item.status === filters.status);
    }
    if (filters?.year) {
      result = result.filter((item) => item.period_year === filters.year);
    }
    if (filters?.month) {
      result = result.filter((item) => item.period_month === filters.month);
    }
    return result.sort((a, b) => {
      if (a.period_year !== b.period_year) {
        return b.period_year - a.period_year;
      }
      return b.period_month - a.period_month;
    });
  }

  async getSettlementDetail(statementId: number): Promise<SettlementStatement> {
    if (this.config.dataMode === 'api') {
      return request<SettlementStatement>(`/settlements/${statementId}`);
    }

    const authUser = readAuthSession()?.user;
    if (!authUser?.merchant_id) {
      throw new Error('请先登录');
    }

    const statement = readSettlements().find(
      (item) => item.id === statementId && item.merchant_id === authUser.merchant_id
    );
    if (!statement) {
      throw new Error('对账单不存在');
    }
    return statement;
  }

  async confirmSettlement(statementId: number): Promise<SettlementStatement> {
    if (this.config.dataMode === 'api') {
      return request<SettlementStatement>(`/settlements/${statementId}/confirm`, {
        method: 'POST'
      });
    }

    const authUser = readAuthSession()?.user;
    if (!authUser?.merchant_id) {
      throw new Error('请先登录');
    }

    const statements = readSettlements();
    const index = statements.findIndex(
      (item) => item.id === statementId && item.merchant_id === authUser.merchant_id
    );
    if (index < 0) {
      throw new Error('对账单不存在');
    }
    if (statements[index].status !== 'draft') {
      throw new Error('只有草稿状态的对账单可以确认');
    }

    const confirmed: SettlementStatement = {
      ...statements[index],
      status: 'confirmed',
      confirmed_at: new Date().toISOString(),
      confirmed_by_id: authUser.id,
      updated_at: new Date().toISOString()
    };
    statements[index] = confirmed;
    writeSettlements(statements);
    return confirmed;
  }

  private _createOrderStatusMessage(order: Order, status: OrderStatus): void {
    const messages = readMessages();
    const statusLabel = ORDER_STATUS_LABELS[status] || status;
    const message: Message = {
      id: nextId(messages),
      buyer_id: order.buyer_id,
      type: 'order_status',
      order_id: order.id,
      order_status: status,
      title: `订单状态更新：${statusLabel}`,
      content: `您的订单 ${order.order_no} 状态已更新为「${statusLabel}」`,
      is_read: false,
      created_at: new Date().toISOString()
    };
    messages.push(message);
    writeMessages(messages);
  }
}

export const merchantService = new MerchantService();
