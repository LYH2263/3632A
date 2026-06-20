import {
  canTransitionStatus,
  createOrderFromCart,
  emptyCart,
  isValidPhone,
  type Address,
  type AddressCreatePayload,
  type AddressUpdatePayload,
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
  readAddresses,
  readCart,
  readMerchants,
  readOrders,
  readProducts,
  readUsers,
  writeAddresses,
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

  private get _currentBuyerId(): number {
    const users = readUsers();
    const buyer = users.find((u) => u.role === 'buyer');
    return buyer?.id ?? 1;
  }
}
