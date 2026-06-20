import {
  canTransitionStatus,
  createOrderFromCart,
  emptyCart,
  type Cart,
  type CheckoutPayload,
  type DataSource,
  type LoginPayload,
  type LoginResult,
  type Merchant,
  type Order,
  type OrderStatus,
  type Product
} from '@community-store/shared';
import {
  ensureMockDB,
  readCart,
  readMerchants,
  readOrders,
  readProducts,
  readUsers,
  writeCart,
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

  async listProducts(merchantId: number, keyword?: string): Promise<Product[]> {
    const normalizedKeyword = keyword?.trim().toLowerCase() ?? '';
    return readProducts().filter((product) => {
      if (product.merchant_id !== merchantId) {
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

  async listOrdersByBuyer(buyerId: number): Promise<Order[]> {
    return readOrders()
      .filter((item) => item.buyer_id === buyerId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }

  async listOrdersByMerchant(merchantId: number): Promise<Order[]> {
    return readOrders()
      .filter((item) => item.merchant_id === merchantId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
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
}
