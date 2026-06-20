import {
  canTransitionStatus,
  createOrderFromCart,
  emptyCart,
  isValidPhone,
  type Address,
  type AddressCreatePayload,
  type AddressUpdatePayload,
  type Cart,
  type Category,
  type CheckoutPayload,
  type DataSource,
  type Favorite,
  type FavoriteListResult,
  type LoginPayload,
  type LoginResult,
  type LowStockAlertResult,
  type Merchant,
  type Order,
  type OrderFilterParams,
  type OrderStatus,
  type Product
} from '@community-store/shared';
import {
  ensureMockDB,
  readAddresses,
  readCart,
  readCategories,
  readFavorites,
  readMerchants,
  readOrders,
  readProducts,
  readUsers,
  writeAddresses,
  writeCart,
  writeCategories,
  writeFavorites,
  writeMerchants,
  writeOrders,
  writeProducts
} from '../data/mock-db';

function nextId(items: Array<{ id: number }>): number {
  if (!items.length) {
    return 1;
  }
  return Math.max(...items.map((item) => item.id)) + 1;
}

function applyOrderFilters(orders: Order[], filters?: OrderFilterParams): Order[] {
  if (!filters) {
    return orders;
  }
  let result = orders;
  if (filters.status) {
    result = result.filter((o) => o.status === filters.status);
  }
  if (filters.date_start) {
    result = result.filter((o) => o.created_at >= filters.date_start!);
  }
  if (filters.date_end) {
    const end = filters.date_end.includes('T') ? filters.date_end : filters.date_end + 'T23:59:59';
    result = result.filter((o) => o.created_at <= end);
  }
  if (filters.order_no) {
    const keyword = filters.order_no.toLowerCase();
    result = result.filter((o) => o.order_no.toLowerCase().includes(keyword));
  }
  if (filters.phone_suffix) {
    result = result.filter((o) => o.receiver_phone.endsWith(filters.phone_suffix!));
  }
  return result;
}

export class MockDataSource implements DataSource {
  constructor() {
    ensureMockDB();
  }

  async listMerchants(): Promise<Merchant[]> {
    return readMerchants();
  }

  async getMerchant(merchantId: number): Promise<Merchant | null> {
    return readMerchants().find((item) => item.id === merchantId) ?? null;
  }

  async updateMerchant(
    merchantId: number,
    payload: Partial<Merchant>
  ): Promise<Merchant> {
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
    const categories = readCategories()
      .filter((item) => item.merchant_id === merchantId)
      .sort((a, b) => a.sort_order - b.sort_order);

    const products = readProducts();
    return categories.map((cat) => ({
      ...cat,
      product_count: products.filter((p) => p.category_id === cat.id).length
    }));
  }

  async getCategory(categoryId: number): Promise<Category | null> {
    return readCategories().find((item) => item.id === categoryId) ?? null;
  }

  async createCategory(payload: Omit<Category, 'id' | 'created_at'>): Promise<Category> {
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

  async listProducts(merchantId: number, keyword?: string, categoryId?: number): Promise<Product[]> {
    const normalizedKeyword = keyword?.trim().toLowerCase() ?? '';
    return readProducts().filter((product) => {
      if (product.merchant_id !== merchantId) {
        return false;
      }
      if (categoryId && product.category_id !== categoryId) {
        return false;
      }
      if (!normalizedKeyword) {
        return true;
      }
      return product.name.toLowerCase().includes(normalizedKeyword);
    });
  }

  async getProduct(productId: number): Promise<Product | null> {
    return readProducts().find((item) => item.id === productId) ?? null;
  }

  async createProduct(payload: Omit<Product, 'id'>): Promise<Product> {
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
    const products = readProducts();
    const target = products.find((item) => item.id === productId);
    if (!target) {
      throw new Error('商品不存在');
    }
    Object.assign(target, payload);
    writeProducts(products);
    return target;
  }

  async listOrdersByBuyer(buyerId: number, filters?: OrderFilterParams): Promise<Order[]> {
    const all = readOrders()
      .filter((item) => item.buyer_id === buyerId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
    return applyOrderFilters(all, filters);
  }

  async listOrdersByMerchant(merchantId: number, filters?: OrderFilterParams): Promise<Order[]> {
    const all = readOrders()
      .filter((item) => item.merchant_id === merchantId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
    return applyOrderFilters(all, filters);
  }

  async getOrder(orderId: number): Promise<Order | null> {
    return readOrders().find((item) => item.id === orderId) ?? null;
  }

  async createOrder(payload: CheckoutPayload): Promise<Order> {
    const merchants = readMerchants();
    const merchant = merchants.find((item) => item.id === payload.merchant_id);
    if (!merchant) {
      throw new Error('商家不存在');
    }

    const cart = readCart();
    const products = readProducts().filter(
      (item) => item.merchant_id === payload.merchant_id
    );

    const orders = readOrders();
    const order = createOrderFromCart({
      orderId: nextId(orders),
      buyerId: payload.buyer_id,
      payload,
      merchant,
      cart,
      products
    });

    orders.push(order);
    writeOrders(orders);
    writeCart({
      ...emptyCart,
      updated_at: new Date().toISOString()
    });

    return order;
  }

  async updateOrderStatus(orderId: number, status: OrderStatus): Promise<Order> {
    const orders = readOrders();
    const target = orders.find((item) => item.id === orderId);
    if (!target) {
      throw new Error('订单不存在');
    }

    if (target.status === status) {
      return target;
    }

    if (!canTransitionStatus(target.status, status)) {
      throw new Error(`状态不可从 ${target.status} 变更为 ${status}`);
    }

    target.status = status;
    target.updated_at = new Date().toISOString();
    writeOrders(orders);
    return target;
  }

  async getCart(): Promise<Cart> {
    return readCart();
  }

  async setCart(cart: Cart): Promise<Cart> {
    const normalized: Cart = {
      ...cart,
      updated_at: new Date().toISOString()
    };
    writeCart(normalized);
    return normalized;
  }

  async clearCart(): Promise<Cart> {
    const nextCart: Cart = {
      ...emptyCart,
      updated_at: new Date().toISOString()
    };
    writeCart(nextCart);
    return nextCart;
  }

  async login(payload: LoginPayload): Promise<LoginResult> {
    const user = readUsers().find(
      (item) =>
        item.username === payload.username && item.password === payload.password
    );
    if (!user) {
      throw new Error('账号或密码错误');
    }

    return {
      token: `mock-token-${user.id}`,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        nickname: user.nickname,
        phone: user.phone,
        merchant_id: user.merchant_id
      }
    };
  }

  async listAddresses(buyerId: number): Promise<Address[]> {
    return readAddresses()
      .filter((item) => item.buyer_id === buyerId)
      .sort((a, b) => {
        if (a.is_default !== b.is_default) {
          return b.is_default ? 1 : -1;
        }
        return b.created_at.localeCompare(a.created_at);
      });
  }

  async getAddress(addressId: number): Promise<Address | null> {
    return readAddresses().find((item) => item.id === addressId) ?? null;
  }

  async createAddress(payload: AddressCreatePayload): Promise<Address> {
    if (!isValidPhone(payload.receiver_phone)) {
      throw new Error('手机号格式错误');
    }
    if (!payload.receiver_name?.trim()) {
      throw new Error('收货人姓名必填');
    }
    if (!payload.receiver_address?.trim()) {
      throw new Error('收货地址必填');
    }

    const addresses = readAddresses();
    const buyerAddresses = addresses.filter(
      (item) => item.buyer_id === this._currentBuyerId
    );
    const isFirst = buyerAddresses.length === 0;

    const created: Address = {
      id: nextId(addresses),
      buyer_id: this._currentBuyerId,
      receiver_name: payload.receiver_name,
      receiver_phone: payload.receiver_phone,
      receiver_address: payload.receiver_address,
      latitude: payload.latitude ?? null,
      longitude: payload.longitude ?? null,
      is_default: isFirst || !!payload.is_default,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (payload.is_default && !isFirst) {
      addresses.forEach((item) => {
        if (item.buyer_id === this._currentBuyerId) {
          item.is_default = false;
        }
      });
    }

    addresses.push(created);
    writeAddresses(addresses);
    return created;
  }

  async updateAddress(
    addressId: number,
    payload: AddressUpdatePayload
  ): Promise<Address> {
    const addresses = readAddresses();
    const target = addresses.find((item) => item.id === addressId);
    if (!target) {
      throw new Error('地址不存在');
    }

    if (payload.receiver_phone && !isValidPhone(payload.receiver_phone)) {
      throw new Error('手机号格式错误');
    }

    if (payload.receiver_name !== undefined) {
      target.receiver_name = payload.receiver_name;
    }
    if (payload.receiver_phone !== undefined) {
      target.receiver_phone = payload.receiver_phone;
    }
    if (payload.receiver_address !== undefined) {
      target.receiver_address = payload.receiver_address;
    }
    if (payload.latitude !== undefined) {
      target.latitude = payload.latitude ?? null;
    }
    if (payload.longitude !== undefined) {
      target.longitude = payload.longitude ?? null;
    }

    if (payload.is_default) {
      addresses.forEach((item) => {
        if (item.buyer_id === target.buyer_id) {
          item.is_default = false;
        }
      });
      target.is_default = true;
    }

    target.updated_at = new Date().toISOString();
    writeAddresses(addresses);
    return target;
  }

  async deleteAddress(addressId: number): Promise<void> {
    const addresses = readAddresses();
    const index = addresses.findIndex((item) => item.id === addressId);
    if (index === -1) {
      throw new Error('地址不存在');
    }

    const target = addresses[index];
    const wasDefault = target.is_default;
    const buyerId = target.buyer_id;

    addresses.splice(index, 1);

    if (wasDefault) {
      const remaining = addresses
        .filter((item) => item.buyer_id === buyerId)
        .sort((a, b) => b.created_at.localeCompare(a.created_at));
      if (remaining.length > 0) {
        remaining[0].is_default = true;
        remaining[0].updated_at = new Date().toISOString();
      }
    }

    writeAddresses(addresses);
  }

  async setDefaultAddress(addressId: number): Promise<Address> {
    const addresses = readAddresses();
    const target = addresses.find((item) => item.id === addressId);
    if (!target) {
      throw new Error('地址不存在');
    }

    addresses.forEach((item) => {
      if (item.buyer_id === target.buyer_id) {
        item.is_default = false;
      }
    });
    target.is_default = true;
    target.updated_at = new Date().toISOString();

    writeAddresses(addresses);
    return target;
  }

  async listFavorites(buyerId: number, page = 1, pageSize = 20): Promise<FavoriteListResult> {
    const allFavorites = readFavorites()
      .filter((item) => item.buyer_id === buyerId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));

    const products = readProducts();
    const merchants = readMerchants();

    const itemsWithDetails: Favorite[] = allFavorites.map((fav) => {
      const product = products.find((p) => p.id === fav.product_id);
      const merchant = product ? merchants.find((m) => m.id === product.merchant_id) : undefined;
      return {
        ...fav,
        product,
        merchant
      };
    });

    const total = itemsWithDetails.length;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const items = itemsWithDetails.slice(start, end);

    return {
      items,
      total,
      page,
      page_size: pageSize,
      has_more: end < total
    };
  }

  async addFavorite(buyerId: number, productId: number): Promise<Favorite> {
    const products = readProducts();
    const product = products.find((p) => p.id === productId);
    if (!product) {
      throw new Error('商品不存在');
    }

    const favorites = readFavorites();
    const existing = favorites.find(
      (item) => item.buyer_id === buyerId && item.product_id === productId
    );

    if (existing) {
      return existing;
    }

    const created: Favorite = {
      id: nextId(favorites),
      buyer_id: buyerId,
      product_id: productId,
      created_at: new Date().toISOString()
    };

    favorites.push(created);
    writeFavorites(favorites);
    return created;
  }

  async removeFavorite(buyerId: number, productId: number): Promise<void> {
    const favorites = readFavorites();
    const filtered = favorites.filter(
      (item) => !(item.buyer_id === buyerId && item.product_id === productId)
    );
    writeFavorites(filtered);
  }

  async isFavorite(buyerId: number, productId: number): Promise<boolean> {
    const favorites = readFavorites();
    return favorites.some(
      (item) => item.buyer_id === buyerId && item.product_id === productId
    );
  }

  async getLowStockAlert(): Promise<LowStockAlertResult> {
    throw new Error('买家端无权限访问低库存预警');
  }

  private get _currentBuyerId(): number {
    const users = readUsers();
    const buyer = users.find((u) => u.role === 'buyer');
    return buyer?.id ?? 1;
  }
}
