import {
  emptyCart,
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
  type Merchant,
  type Order,
  type OrderStatus,
  type Product
} from '@community-store/shared';
import { readJSON, writeJSON } from '../data/storage';
import { request } from './http';

const API_CART_KEY = 'community_store_api_cart';

function readApiCart(): Cart {
  return readJSON<Cart>(API_CART_KEY, {
    ...emptyCart,
    updated_at: new Date().toISOString()
  });
}

function writeApiCart(cart: Cart): void {
  writeJSON(API_CART_KEY, cart);
}

export class ApiDataSource implements DataSource {
  async listMerchants(): Promise<Merchant[]> {
    return request<Merchant[]>('/merchants');
  }

  async getMerchant(merchantId: number): Promise<Merchant | null> {
    const merchants = await this.listMerchants();
    return merchants.find((item) => item.id === merchantId) ?? null;
  }

  async updateMerchant(
    merchantId: number,
    payload: Partial<Merchant>
  ): Promise<Merchant> {
    return request<Merchant>(`/merchants/${merchantId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    });
  }

  async listCategories(merchantId: number): Promise<Category[]> {
    return request<Category[]>(`/categories?merchant_id=${merchantId}`);
  }

  async getCategory(categoryId: number): Promise<Category | null> {
    return request<Category | null>(`/categories/${categoryId}`);
  }

  async createCategory(payload: Omit<Category, 'id' | 'created_at'>): Promise<Category> {
    return request<Category>('/categories', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  async updateCategory(
    categoryId: number,
    payload: Partial<Category>
  ): Promise<Category> {
    return request<Category>(`/categories/${categoryId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    });
  }

  async deleteCategory(categoryId: number): Promise<void> {
    await request<void>(`/categories/${categoryId}`, {
      method: 'DELETE'
    });
  }

  async listProducts(merchantId: number, keyword?: string, categoryId?: number): Promise<Product[]> {
    const search = new URLSearchParams();
    search.set('merchant_id', String(merchantId));
    if (keyword) {
      search.set('keyword', keyword);
    }
    if (categoryId) {
      search.set('category_id', String(categoryId));
    }
    return request<Product[]>(`/products?${search.toString()}`);
  }

  async getProduct(productId: number): Promise<Product | null> {
    return request<Product | null>(`/products/${productId}`);
  }

  async createProduct(payload: Omit<Product, 'id'>): Promise<Product> {
    return request<Product>('/products', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  async updateProduct(
    productId: number,
    payload: Partial<Product>
  ): Promise<Product> {
    return request<Product>(`/products/${productId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    });
  }

  async listOrdersByBuyer(buyerId: number): Promise<Order[]> {
    return request<Order[]>(`/orders?buyer_id=${buyerId}`);
  }

  async listOrdersByMerchant(merchantId: number): Promise<Order[]> {
    return request<Order[]>(`/orders?merchant_id=${merchantId}`);
  }

  async getOrder(orderId: number): Promise<Order | null> {
    return request<Order | null>(`/orders/${orderId}`);
  }

  async createOrder(payload: CheckoutPayload): Promise<Order> {
    const cart = readApiCart();
    const order = await request<Order>('/orders', {
      method: 'POST',
      body: JSON.stringify({
        ...payload,
        cart_items: cart.items
      })
    });
    await this.clearCart();
    return order;
  }

  async updateOrderStatus(orderId: number, status: OrderStatus): Promise<Order> {
    return request<Order>(`/orders/${orderId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    });
  }

  async getCart(): Promise<Cart> {
    return readApiCart();
  }

  async setCart(cart: Cart): Promise<Cart> {
    const normalized: Cart = {
      ...cart,
      updated_at: new Date().toISOString()
    };
    writeApiCart(normalized);
    return normalized;
  }

  async clearCart(): Promise<Cart> {
    const normalized: Cart = {
      ...emptyCart,
      updated_at: new Date().toISOString()
    };
    writeApiCart(normalized);
    return normalized;
  }

  async login(payload: LoginPayload): Promise<LoginResult> {
    return request<LoginResult>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  async listAddresses(buyerId: number): Promise<Address[]> {
    return request<Address[]>('/addresses');
  }

  async getAddress(addressId: number): Promise<Address | null> {
    return request<Address | null>(`/addresses/${addressId}`);
  }

  async createAddress(payload: AddressCreatePayload): Promise<Address> {
    return request<Address>('/addresses', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  async updateAddress(
    addressId: number,
    payload: AddressUpdatePayload
  ): Promise<Address> {
    return request<Address>(`/addresses/${addressId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    });
  }

  async deleteAddress(addressId: number): Promise<void> {
    await request<void>(`/addresses/${addressId}`, {
      method: 'DELETE'
    });
  }

  async setDefaultAddress(addressId: number): Promise<Address> {
    return request<Address>(`/addresses/${addressId}/default`, {
      method: 'POST'
    });
  }

  async listFavorites(buyerId: number, page = 1, pageSize = 20): Promise<FavoriteListResult> {
    const search = new URLSearchParams();
    search.set('page', String(page));
    search.set('page_size', String(pageSize));
    return request<FavoriteListResult>(`/favorites?${search.toString()}`);
  }

  async addFavorite(buyerId: number, productId: number): Promise<Favorite> {
    return request<Favorite>('/favorites', {
      method: 'POST',
      body: JSON.stringify({ product_id: productId })
    });
  }

  async removeFavorite(buyerId: number, productId: number): Promise<void> {
    await request<void>(`/favorites/${productId}`, {
      method: 'DELETE'
    });
  }

  async isFavorite(buyerId: number, productId: number): Promise<boolean> {
    const result = await request<{ is_favorite: boolean }>(`/favorites/${productId}/check`);
    return result.is_favorite;
  }
}
