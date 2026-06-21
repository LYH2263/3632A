<template>
  <view class="app-shell" data-testid="miniapp-shell">
    <AppTopBar />

    <view class="page-body">
      <section v-if="merchant" data-testid="checkout-page">
        <article class="card" data-testid="checkout-header-card">
          <h2 data-testid="checkout-merchant-name">购物车结算 - {{ merchant.name }}</h2>
          <p class="muted" data-testid="checkout-payment-method">支付方式：线下支付（货到付款/到店支付）</p>
        </article>

        <article class="card" v-if="cartItems.length" data-testid="checkout-cart-card">
          <div class="table-wrap">
            <view class="table" data-testid="checkout-cart-table">
              <view class="table-head">
                <view class="table-th table-cell-name">商品</view>
                <view class="table-th table-cell-price">单价</view>
                <view class="table-th table-cell-qty">数量</view>
                <view class="table-th table-cell-subtotal">小计</view>
              </view>
              <view
                v-for="item in cartItems"
                :key="item.product.id"
                class="table-row"
                :data-testid="`checkout-item-row-${item.product.id}`"
              >
                <view class="table-td table-cell-name">{{ item.product.name }}</view>
                <view class="table-td table-cell-price">{{ formatMoney(item.product.price) }}</view>
                <view class="table-td table-cell-qty">
                  <div class="counter">
                    <button
                      :data-testid="`checkout-item-minus-${item.product.id}`"
                      :disabled="item.quantity <= 1"
                      @click="adjust(item.product, -1)"
                    >
                      -
                    </button>
                    <span class="counter-value" :data-testid="`checkout-item-quantity-${item.product.id}`">{{ item.quantity }}</span>
                    <button
                      :data-testid="`checkout-item-plus-${item.product.id}`"
                      :disabled="isProductSoldOut(item.product) || (item.product.stock !== -1 && item.quantity >= item.product.stock)"
                      @click="adjust(item.product, 1)"
                    >
                      {{ isProductSoldOut(item.product) ? '售罄' : '+' }}
                    </button>
                  </div>
                </view>
                <view class="table-td table-cell-subtotal">{{ formatMoney(item.subtotal) }}</view>
              </view>
            </view>
          </div>

          <p data-testid="checkout-items-amount">商品合计：<strong class="price">{{ formatMoney(itemsAmount) }}</strong></p>
          <p data-testid="checkout-delivery-fee">配送费：<strong class="price">{{ formatMoney(merchant.delivery_fee) }}</strong></p>
          <p v-if="deliveryInfo" class="muted" data-testid="checkout-delivery-range">
            📍 {{ deliveryInfo }}
          </p>
          <p v-if="deliveryDistanceText !== null" class="muted" data-testid="checkout-distance">
            与店铺距离：{{ deliveryDistanceText }}
          </p>
          <p data-testid="checkout-total-amount">总金额：<strong class="price">{{ formatMoney(totalAmount) }}</strong></p>
          <p v-if="itemsAmount < merchant.min_order_amount" class="muted" data-testid="checkout-min-order-tip">
            当前未达到起送价：{{ formatMoney(merchant.min_order_amount) }}
          </p>
        </article>
        <p v-else class="muted" data-testid="checkout-cart-empty">购物车为空。</p>

        <article class="card" data-testid="checkout-address-card">
          <div class="checkout-address-header">
            <h3>收货地址</h3>
            <button
              class="text-btn"
              data-testid="checkout-address-manage"
              @click="goAddressList"
            >
              管理
            </button>
          </div>

          <div
            v-if="selectedAddress"
            class="checkout-address-selected"
            data-testid="checkout-address-selected"
            @click="goAddressList"
            @tap="goAddressList"
          >
            <div class="address-row">
              <span class="address-receiver" data-testid="checkout-selected-name">
                {{ selectedAddress.receiver_name }}
              </span>
              <span class="address-phone" data-testid="checkout-selected-phone">
                {{ selectedAddress.receiver_phone }}
              </span>
              <u-tag
                v-if="selectedAddress.is_default"
                text="默认"
                type="primary"
                size="mini"
              />
            </div>
            <p class="address-detail muted" data-testid="checkout-selected-address">
              {{ selectedAddress.receiver_address }}
            </p>
            <span class="address-change">更换</span>
          </div>

          <div
            v-else
            class="checkout-address-empty"
            data-testid="checkout-address-empty"
            @click="goAddressList"
            @tap="goAddressList"
          >
            <span class="address-empty-icon">📍</span>
            <span class="muted">请选择收货地址</span>
            <span class="address-arrow">›</span>
          </div>
        </article>

        <article class="card" v-if="hasDeliveryRangeConfig" data-testid="checkout-coord-card">
          <h3>收货坐标（用于配送范围校验）</h3>
          <div class="field">
            <label for="checkout-coord">地址坐标（纬度,经度）</label>
            <input
              id="checkout-coord"
              v-model="form.coordText"
              data-testid="checkout-coord"
              placeholder="例如：39.9042,116.4074"
              @blur="parseCoordInput"
              @change="parseCoordInput"
            />
            <p v-if="coordError" class="field-error" data-testid="checkout-coord-error">{{ coordError }}</p>
            <p v-else-if="deliveryDistanceText !== null" class="muted">
              已计算距离店铺：{{ deliveryDistanceText }}
            </p>
            <p v-else class="muted">
              请输入坐标以校验是否在 {{ merchant?.delivery_radius_km }} 公里配送范围内
            </p>
          </div>
        </article>

        <article class="card" data-testid="checkout-form-card">
          <h3>订单备注</h3>
          <div class="field">
            <label for="checkout-remark">备注</label>
            <textarea
              id="checkout-remark"
              v-model="form.remark"
              data-testid="checkout-remark"
              placeholder="如：请放门卫室"
            ></textarea>
          </div>
          <button
            class="primary"
            data-testid="checkout-submit"
            :disabled="submitting || hasSoldOutItems"
            @click="submitOrder"
            @tap="submitOrder"
          >
            {{ submitting ? '提交中...' : (hasSoldOutItems ? '存在已售罄商品' : '提交订单') }}
          </button>
          <view v-if="submitFeedback" class="checkout-submit-feedback" data-testid="checkout-submit-feedback">
            {{ submitFeedback }}
          </view>
        </article>
      </section>

      <p v-else class="muted" data-testid="checkout-merchant-missing">请先从商家页添加商品。</p>
    </view>
  </view>
</template>

<script setup lang="ts">
import {
  validateCartForCheckout,
  validateCheckoutPayload,
  formatDistanceKm,
  parseCoord,
  haversineDistanceKm,
  isValidLatitude,
  isValidLongitude,
  type Address,
  type CheckoutPayload,
  type Merchant,
  type Product
} from '@community-store/shared';
import { computed, reactive, ref } from 'vue';
import { onLoad, onShow } from '@dcloudio/uni-app';
import AppTopBar from '../../components/AppTopBar.vue';
import { getDataSource } from '../../services/data-source';
import { formatMoney } from '../../services/format';
import { useCartStore } from '../../stores/cart';
import { useSessionStore } from '../../stores/session';
import { showMessage } from '../../utils/ui';
import { navigateTo, numberOption, redirectTo } from '../../utils/navigation';

const dataSource = getDataSource();
const cartStore = useCartStore();
const sessionStore = useSessionStore();

const merchant = ref<Merchant | null>(null);
const products = ref<Product[]>([]);
const submitting = ref(false);
const submitFeedback = ref('');
const addresses = ref<Address[]>([]);
const selectedAddress = ref<Address | null>(null);
const form = reactive({
  remark: '',
  coordText: ''
});

const coordLat = ref<number | null>(null);
const coordLng = ref<number | null>(null);
const coordError = ref('');

const routeMerchantId = ref(0);

const merchantId = computed(() => {
  const fromRoute = routeMerchantId.value;
  if (fromRoute > 0) {
    return fromRoute;
  }
  return cartStore.state.cart.merchant_id ?? 0;
});

const cartItems = computed(() => {
  const productMap = new Map(products.value.map((item) => [item.id, item]));
  return cartStore.state.cart.items
    .map((item) => {
      const product = productMap.get(item.product_id);
      if (!product) {
        return null;
      }
      return {
        product,
        quantity: item.quantity,
        subtotal: product.price * item.quantity
      };
    })
    .filter((item): item is { product: Product; quantity: number; subtotal: number } =>
      item !== null
    );
});

function isProductSoldOut(product: Product): boolean {
  return product.stock !== -1 && product.stock <= 0;
}

const hasSoldOutItems = computed(() => {
  return cartItems.value.some((item) => isProductSoldOut(item.product));
});

const itemsAmount = computed(() =>
  cartItems.value.reduce((sum, item) => sum + item.subtotal, 0)
);

const totalAmount = computed(() => {
  if (!merchant.value) {
    return itemsAmount.value;
  }
  return itemsAmount.value + merchant.value.delivery_fee;
});

const hasDeliveryRangeConfig = computed(() => {
  if (!merchant.value) return false;
  const radius = merchant.value.delivery_radius_km ?? 0;
  const lat = merchant.value.latitude;
  const lng = merchant.value.longitude;
  return radius > 0 && lat != null && lng != null;
});

const deliveryInfo = computed(() => {
  if (!merchant.value) return '';
  const radius = merchant.value.delivery_radius_km ?? 0;
  if (radius <= 0) return '';
  return `配送半径 ${radius} 公里内`;
});

const deliveryDistanceText = computed(() => {
  if (!merchant.value || coordLat.value == null || coordLng.value == null) return null;
  const mLat = merchant.value.latitude;
  const mLng = merchant.value.longitude;
  if (mLat == null || mLng == null) return null;
  if (!isValidLatitude(mLat) || !isValidLongitude(mLng)) return null;
  const parsed = parseCoord(`${coordLat.value},${coordLng.value}`);
  if (!parsed) return null;
  return formatDistanceKm(
    haversineDistanceKm({ lat: mLat, lng: mLng }, parsed)
  );
});

async function loadData(): Promise<void> {
  await cartStore.ensureLoaded();
  if (!merchantId.value) {
    return;
  }

  merchant.value = await dataSource.getMerchant(merchantId.value);
  if (!merchant.value) {
    return;
  }

  products.value = await dataSource.listProducts(merchant.value.id);
  await loadAddresses();
}

async function loadAddresses(): Promise<void> {
  try {
    addresses.value = await dataSource.listAddresses(sessionStore.state.user.id);
    if (addresses.value.length > 0) {
      const defaultAddr = addresses.value.find((a) => a.is_default);
      if (defaultAddr) {
        selectedAddress.value = defaultAddr;
      } else if (selectedAddress.value) {
        const updated = addresses.value.find((a) => a.id === selectedAddress.value?.id);
        selectedAddress.value = updated || addresses.value[0];
      } else {
        selectedAddress.value = addresses.value[0];
      }
    } else {
      selectedAddress.value = null;
    }
    syncCoordFromAddress();
  } catch (error) {
    // 地址加载失败不影响主流程
  }
}

function syncCoordFromAddress(): void {
  const addr = selectedAddress.value;
  if (addr && addr.latitude != null && addr.longitude != null) {
    coordLat.value = addr.latitude;
    coordLng.value = addr.longitude;
    form.coordText = `${addr.latitude},${addr.longitude}`;
    coordError.value = '';
  } else {
    coordLat.value = null;
    coordLng.value = null;
    form.coordText = '';
    coordError.value = '';
  }
}

function parseCoordInput(): void {
  coordError.value = '';
  if (!form.coordText.trim()) {
    coordLat.value = null;
    coordLng.value = null;
    return;
  }
  const parsed = parseCoord(form.coordText);
  if (!parsed) {
    coordError.value = '坐标格式错误，应为：纬度,经度（例如 39.9042,116.4074）';
    coordLat.value = null;
    coordLng.value = null;
    return;
  }
  coordLat.value = parsed.lat;
  coordLng.value = parsed.lng;
}

async function adjust(product: Product, step: number): Promise<void> {
  if (!merchant.value) {
    return;
  }
  if (step > 0 && isProductSoldOut(product)) {
    showMessage(`${product.name} 已售罄`);
    return;
  }
  try {
    await cartStore.addItem(product, merchant.value.id, step);
  } catch (error) {
    showMessage((error as Error).message);
  }
}

function goAddressList(): void {
  navigateTo('pages/address/list', { mode: 'select' });
}

async function submitOrder(): Promise<void> {
  if (submitting.value) {
    return;
  }
  submitFeedback.value = '正在提交，请稍候...';
  if (typeof uni !== 'undefined' && typeof uni.hideKeyboard === 'function') {
    uni.hideKeyboard();
  }

  if (!merchant.value) {
    const message = '请选择商家';
    submitFeedback.value = message;
    showMessage(message);
    return;
  }

  if (!selectedAddress.value) {
    const message = '请选择收货地址';
    submitFeedback.value = message;
    showMessage(message);
    return;
  }

  parseCoordInput();
  if (coordError.value) {
    submitFeedback.value = coordError.value;
    showMessage(coordError.value);
    return;
  }

  try {
    const payload: CheckoutPayload = {
      buyer_id: sessionStore.state.user.id,
      merchant_id: merchant.value.id,
      receiver_name: selectedAddress.value.receiver_name,
      receiver_phone: selectedAddress.value.receiver_phone,
      receiver_address: selectedAddress.value.receiver_address,
      latitude: coordLat.value,
      longitude: coordLng.value,
      remark: form.remark
    };

    const payloadErrors = validateCheckoutPayload(payload);
    const cartValidation = validateCartForCheckout(
      cartStore.state.cart,
      merchant.value,
      products.value,
      coordLat.value,
      coordLng.value
    );

    const errors = [...payloadErrors, ...cartValidation.errors];
    if (errors.length) {
      submitFeedback.value = errors[0];
      showMessage(errors[0]);
      return;
    }

    submitting.value = true;
    const order = await dataSource.createOrder(payload);
    await cartStore.clearCart();
    submitFeedback.value = '下单成功，正在跳转...';
    showMessage('下单成功');
    redirectTo('pages/order/detail', {
      orderId: order.id
    });
  } catch (error) {
    const message = (error as Error).message || '提交订单失败';
    submitFeedback.value = message;
    showMessage(message);
  } finally {
    submitting.value = false;
  }
}

onLoad((options) => {
  routeMerchantId.value = numberOption(options, 'merchantId', 0);
});

onShow(loadData);
</script>

<style scoped>
.checkout-address-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.field-error {
  color: #dc2626;
  font-size: 13px;
  margin: 4px 0 0;
}

.checkout-address-header h3 {
  margin: 0;
}

.text-btn {
  background: transparent;
  color: var(--primary);
  padding: 0 8px;
  min-height: 32px;
  font-size: 13px;
}

.checkout-address-selected {
  position: relative;
  padding: 12px;
  background: var(--bg);
  border-radius: var(--radius-sm);
  cursor: pointer;
}

.address-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 6px;
}

.address-receiver {
  font-size: 15px;
  font-weight: 600;
}

.address-phone {
  color: var(--text-secondary);
  font-size: 14px;
}

.address-detail {
  margin: 0;
  font-size: 14px;
  line-height: 1.5;
  padding-right: 50px;
}

.address-change {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--primary);
  font-size: 13px;
}

.checkout-address-empty {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 16px 12px;
  background: var(--bg);
  border-radius: var(--radius-sm);
  cursor: pointer;
}

.address-empty-icon {
  font-size: 20px;
}

.address-arrow {
  margin-left: auto;
  color: var(--muted);
  font-size: 18px;
}
</style>
