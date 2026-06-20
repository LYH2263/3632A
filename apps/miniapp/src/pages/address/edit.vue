<template>
  <view class="app-shell" data-testid="miniapp-shell">
    <AppTopBar />

    <view class="page-body">
      <section data-testid="address-edit-page">
        <article class="card" data-testid="address-edit-form-card">
          <h3 data-testid="address-edit-title">
            {{ isEdit ? '编辑地址' : '新增地址' }}
          </h3>

          <div class="field">
            <label for="address-receiver-name">收货人 *</label>
            <input
              id="address-receiver-name"
              v-model="form.receiver_name"
              data-testid="address-receiver-name"
              placeholder="请输入收货人姓名"
            />
          </div>

          <div class="field">
            <label for="address-receiver-phone">手机号 *</label>
            <input
              id="address-receiver-phone"
              v-model="form.receiver_phone"
              data-testid="address-receiver-phone"
              placeholder="请输入手机号"
              type="tel"
            />
          </div>

          <div class="field">
            <label for="address-receiver-address">详细地址 *</label>
            <textarea
              id="address-receiver-address"
              v-model="form.receiver_address"
              data-testid="address-receiver-address"
              placeholder="请输入详细地址"
            ></textarea>
          </div>

          <div class="field">
            <label for="address-coord">地址坐标（可选）</label>
            <input
              id="address-coord"
              v-model="form.coord_text"
              data-testid="address-coord"
              placeholder="例如：39.9042,116.4074（纬度,经度）"
            />
            <p class="muted" style="font-size: 12px; margin-top: 4px;">
              坐标用于配送范围校验，不填写则下单时手动输入
            </p>
          </div>

          <div class="field field-switch">
            <label for="address-is-default">设为默认地址</label>
            <switch
              id="address-is-default"
              v-model="form.is_default"
              data-testid="address-is-default"
              :checked="form.is_default"
              @change="onDefaultChange"
            />
          </div>

          <button
            class="primary"
            data-testid="address-submit"
            :disabled="submitting"
            @click="handleSubmit"
            @tap="handleSubmit"
          >
            {{ submitting ? '保存中...' : '保存' }}
          </button>

          <view v-if="feedback" class="form-feedback" data-testid="address-edit-feedback">
            {{ feedback }}
          </view>
        </article>
      </section>
    </view>
  </view>
</template>

<script setup lang="ts">
import {
  isValidPhone,
  parseCoord,
  isValidLatitude,
  isValidLongitude,
  type Address
} from '@community-store/shared';
import { reactive, ref } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import AppTopBar from '../../components/AppTopBar.vue';
import { getDataSource } from '../../services/data-source';
import { numberOption } from '../../utils/navigation';
import { showMessage } from '../../utils/ui';

const dataSource = getDataSource();

const addressId = ref(0);
const isEdit = ref(false);
const submitting = ref(false);
const feedback = ref('');

const form = reactive({
  receiver_name: '',
  receiver_phone: '',
  receiver_address: '',
  coord_text: '',
  is_default: false
});

const coordError = ref('');

function validateForm(): { errors: string[]; lat: number | null; lng: number | null } {
  const errors: string[] = [];
  let lat: number | null = null;
  let lng: number | null = null;

  if (!form.receiver_name.trim()) {
    errors.push('收货人姓名必填');
  }

  if (!form.receiver_phone.trim()) {
    errors.push('手机号必填');
  } else if (!isValidPhone(form.receiver_phone)) {
    errors.push('手机号格式错误');
  }

  if (!form.receiver_address.trim()) {
    errors.push('详细地址必填');
  }

  if (form.coord_text.trim()) {
    const parsed = parseCoord(form.coord_text);
    if (!parsed) {
      errors.push('坐标格式错误，应为：纬度,经度（例如 39.9042,116.4074）');
    } else {
      lat = parsed.lat;
      lng = parsed.lng;
    }
  }

  return { errors, lat, lng };
}

async function loadAddress(): Promise<void> {
  if (!addressId.value) {
    return;
  }
  try {
    const addr = await dataSource.getAddress(addressId.value);
    if (addr) {
      form.receiver_name = addr.receiver_name;
      form.receiver_phone = addr.receiver_phone;
      form.receiver_address = addr.receiver_address;
      form.is_default = addr.is_default;
      if (addr.latitude != null && addr.longitude != null) {
        form.coord_text = `${addr.latitude},${addr.longitude}`;
      }
    }
  } catch (error) {
    showMessage((error as Error).message || '加载地址失败');
  }
}

async function handleSubmit(): Promise<void> {
  if (submitting.value) {
    return;
  }

  feedback.value = '';
  const { errors, lat, lng } = validateForm();
  if (errors.length) {
    feedback.value = errors[0];
    showMessage(errors[0]);
    return;
  }

  submitting.value = true;
  try {
    if (isEdit.value) {
      await dataSource.updateAddress(addressId.value, {
        receiver_name: form.receiver_name,
        receiver_phone: form.receiver_phone,
        receiver_address: form.receiver_address,
        latitude: lat,
        longitude: lng,
        is_default: form.is_default
      });
      showMessage('修改成功');
    } else {
      await dataSource.createAddress({
        receiver_name: form.receiver_name,
        receiver_phone: form.receiver_phone,
        receiver_address: form.receiver_address,
        latitude: lat,
        longitude: lng,
        is_default: form.is_default
      });
      showMessage('添加成功');
    }
    setTimeout(() => {
      uni.navigateBack();
    }, 500);
  } catch (error) {
    const message = (error as Error).message || '保存失败';
    feedback.value = message;
    showMessage(message);
  } finally {
    submitting.value = false;
  }
}

function onDefaultChange(e: { detail: { value: boolean } }): void {
  form.is_default = e.detail.value;
}

onLoad((options) => {
  const id = numberOption(options, 'addressId', 0);
  if (id > 0) {
    addressId.value = id;
    isEdit.value = true;
    loadAddress();
  }
});
</script>

<style scoped>
.field-switch {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.form-feedback {
  margin-top: 12px;
  padding: 8px 12px;
  background: #fef2f2;
  color: #dc2626;
  border-radius: 6px;
  font-size: 14px;
}
</style>
