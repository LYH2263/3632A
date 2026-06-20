export type UserRole = 'buyer' | 'merchant';

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'delivering'
  | 'completed'
  | 'canceled';

export interface User {
  id: number;
  username: string;
  password: string;
  role: UserRole;
  merchant_id?: number;
  nickname: string;
  phone?: string;
}

export interface Merchant {
  id: number;
  name: string;
  phone: string;
  address: string;
  delivery_note: string;
  min_order_amount: number;
  delivery_fee: number;
  is_open: boolean;
}

export interface Product {
  id: number;
  merchant_id: number;
  name: string;
  price: number;
  unit: string;
  stock: number;
  is_active: boolean;
  image_url: string;
  description?: string;
}

export interface CartItem {
  product_id: number;
  quantity: number;
}

export interface Cart {
  merchant_id: number | null;
  items: CartItem[];
  updated_at: string;
}

export interface OrderSnapshotItem {
  product_id: number;
  name: string;
  unit: string;
  price: number;
  quantity: number;
  subtotal: number;
}

export interface Order {
  id: number;
  order_no: string;
  buyer_id: number;
  merchant_id: number;
  status: OrderStatus;
  pay_method: 'offline';
  receiver_name: string;
  receiver_phone: string;
  receiver_address: string;
  remark: string;
  items_amount: number;
  delivery_fee: number;
  total_amount: number;
  items_snapshot: OrderSnapshotItem[];
  created_at: string;
  updated_at: string;
}

export interface CheckoutPayload {
  buyer_id: number;
  merchant_id: number;
  receiver_name: string;
  receiver_phone: string;
  receiver_address: string;
  remark?: string;
}

export interface CartValidationResult {
  valid: boolean;
  errors: string[];
  items_amount: number;
  total_amount: number;
}

export interface LoginPayload {
  username: string;
  password: string;
}

export interface LoginResult {
  token: string;
  user: Omit<User, 'password'>;
}

export interface DataSource {
  listMerchants(): Promise<Merchant[]>;
  getMerchant(merchantId: number): Promise<Merchant | null>;
  updateMerchant(merchantId: number, payload: Partial<Merchant>): Promise<Merchant>;
  listProducts(merchantId: number, keyword?: string): Promise<Product[]>;
  getProduct(productId: number): Promise<Product | null>;
  createProduct(payload: Omit<Product, 'id'>): Promise<Product>;
  updateProduct(productId: number, payload: Partial<Product>): Promise<Product>;
  listOrdersByBuyer(buyerId: number): Promise<Order[]>;
  listOrdersByMerchant(merchantId: number): Promise<Order[]>;
  getOrder(orderId: number): Promise<Order | null>;
  createOrder(payload: CheckoutPayload): Promise<Order>;
  updateOrderStatus(orderId: number, status: OrderStatus): Promise<Order>;
  getCart(): Promise<Cart>;
  setCart(cart: Cart): Promise<Cart>;
  clearCart(): Promise<Cart>;
  login(payload: LoginPayload): Promise<LoginResult>;
}
