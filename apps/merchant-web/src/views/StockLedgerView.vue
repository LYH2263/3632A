<template>
  <template v-if="authUser">
    <div class="stock-ledger-navbar" data-testid="web-stock-ledger-header">
      <div class="navbar-left">
        <el-button link @click="goBack">
          ← 返回控制台
        </el-button>
        <span class="navbar-divider">|</span>
        <span class="navbar-title">📒 库存变更流水</span>
      </div>
      <el-button text type="danger" @click="logout">退出登录</el-button>
    </div>

    <div class="stock-ledger-page" data-testid="web-stock-ledger-page">
      <el-card class="filter-card" data-testid="web-stock-ledger-filter">
        <div class="filter-bar">
          <el-select
            v-model="filters.product_id"
            placeholder="全部商品"
            clearable
            filterable
            data-testid="web-stock-ledger-filter-product"
            style="width: 200px;"
          >
            <el-option
              v-for="p in products"
              :key="p.id"
              :label="`${p.name} (库存: ${p.stock === -1 ? '无限' : p.stock})`"
              :value="p.id"
            />
          </el-select>

          <el-select
            v-model="filters.reason"
            placeholder="全部原因"
            clearable
            data-testid="web-stock-ledger-filter-reason"
            style="width: 160px;"
          >
            <el-option
              v-for="opt in reasonChoices"
              :key="opt.value"
              :label="opt.label"
              :value="opt.value"
            />
          </el-select>

          <el-date-picker
            v-model="filters.date_start"
            type="date"
            placeholder="起始日期"
            value-format="YYYY-MM-DD"
            data-testid="web-stock-ledger-filter-date-start"
            style="width: 150px;"
          />
          <el-date-picker
            v-model="filters.date_end"
            type="date"
            placeholder="截止日期"
            value-format="YYYY-MM-DD"
            data-testid="web-stock-ledger-filter-date-end"
            style="width: 150px;"
          />

          <el-button type="primary" data-testid="web-stock-ledger-filter-search" @click="applyFilters">
            🔍 查询
          </el-button>
          <el-button data-testid="web-stock-ledger-filter-reset" @click="resetFilters">
            重置
          </el-button>
        </div>
      </el-card>

      <el-card class="table-card" data-testid="web-stock-ledger-card">
        <template #header>
          <div class="card-header">
            <div class="card-title" data-testid="web-stock-ledger-card-title">
              流水记录
              <el-tag v-if="totalCount > 0" type="info" size="small" style="margin-left: 8px;">
                共 {{ totalCount }} 条
              </el-tag>
            </div>
            <div class="card-subtitle muted">谁在何时改过库存，一目了然</div>
          </div>
        </template>

        <div class="table-wrapper">
          <el-table
            :data="items"
            stripe
            v-loading="loading"
            data-testid="web-stock-ledger-table"
            empty-text="暂无变更记录"
          >
            <el-table-column prop="created_at" label="时间" width="180">
              <template #default="scope">
                {{ formatTime(scope.row.created_at) }}
              </template>
            </el-table-column>
            <el-table-column prop="product_name" label="商品" min-width="180" />
            <el-table-column label="变更" width="160">
              <template #default="scope">
                <span
                  :class="{
                    'change-negative': scope.row.change_quantity < 0,
                    'change-positive': scope.row.change_quantity > 0,
                    'change-zero': scope.row.change_quantity === 0
                  }"
                  class="change-qty"
                >
                  {{ scope.row.change_quantity > 0 ? '+' : '' }}{{ scope.row.change_quantity }}
                </span>
                <span class="stock-range muted">
                  {{ stockText(scope.row.stock_before) }} → {{ stockText(scope.row.stock_after) }}
                </span>
              </template>
            </el-table-column>
            <el-table-column label="原因" width="140">
              <template #default="scope">
                <el-tag :type="reasonTagType(scope.row.reason)" size="small">
                  {{ scope.row.reason_label }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作人" width="140">
              <template #default="scope">
                <template v-if="scope.row.operator_name">
                  {{ scope.row.operator_name }}
                  <el-tag v-if="scope.row.operator_role === 'merchant'" size="small" type="warning" effect="plain">
                    商家
                  </el-tag>
                  <el-tag v-else-if="scope.row.operator_role === 'buyer'" size="small" type="success" effect="plain">
                    买家
                  </el-tag>
                </template>
                <span v-else class="muted">系统</span>
              </template>
            </el-table-column>
            <el-table-column label="关联订单" width="200">
              <template #default="scope">
                <span v-if="scope.row.order_no" class="order-no">
                  📋 {{ scope.row.order_no }}
                </span>
                <span v-else class="muted">—</span>
              </template>
            </el-table-column>
            <el-table-column prop="remark" label="备注" min-width="180">
              <template #default="scope">
                <span v-if="scope.row.remark">{{ scope.row.remark }}</span>
                <span v-else class="muted">—</span>
              </template>
            </el-table-column>
          </el-table>
        </div>

        <div class="pagination-wrapper">
          <el-pagination
            v-model:current-page="filters.page"
            v-model:page-size="filters.page_size"
            :page-sizes="[10, 20, 50, 100]"
            :total="totalCount"
            layout="total, sizes, prev, pager, next, jumper"
            background
            @size-change="loadData"
            @current-change="loadData"
            data-testid="web-stock-ledger-pagination"
          />
        </div>
      </el-card>
    </div>
  </template>
  <div v-else class="stock-ledger-page"></div>
</template>

<script setup lang="ts">
import {
  type Product,
  type StockLedger,
  type StockLedgerFilterParams,
  type StockLedgerListResult,
  type StockLedgerReason,
  type User
} from '@community-store/shared';
import { computed, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { merchantService } from '../services/merchant-service';

const router = useRouter();
const authUser = ref<Omit<User, 'password'> | null>(merchantService.getAuthUser());

const products = ref<Product[]>([]);
const items = ref<StockLedger[]>([]);
const loading = ref(false);
const totalCount = ref(0);
const reasonChoices = ref<Array<{ value: StockLedgerReason; label: string }>>([]);

const filters = reactive<Required<Pick<StockLedgerFilterParams, 'page' | 'page_size'>> & Omit<StockLedgerFilterParams, 'page' | 'page_size'>>({
  product_id: undefined,
  reason: undefined,
  date_start: undefined,
  date_end: undefined,
  page: 1,
  page_size: 20
});

const hasActiveFilters = computed(() => {
  return !!(filters.product_id || filters.reason || filters.date_start || filters.date_end);
});

function formatTime(iso: string): string {
  return iso?.replace('T', ' ').slice(0, 19) ?? '';
}

function stockText(stock: number): string {
  return stock === -1 ? '无限' : String(stock);
}

function reasonTagType(reason: StockLedgerReason): 'primary' | 'success' | 'warning' | 'danger' | 'info' {
  switch (reason) {
    case 'order_deduct':
      return 'danger';
    case 'merchant_adjust':
      return 'warning';
    case 'batch_toggle':
      return 'info';
    case 'order_cancel':
      return 'success';
    default:
      return 'info';
  }
}

function applyFilters(): void {
  filters.page = 1;
  loadData();
}

function resetFilters(): void {
  filters.product_id = undefined;
  filters.reason = undefined;
  filters.date_start = undefined;
  filters.date_end = undefined;
  filters.page = 1;
  loadData();
}

async function loadData(): Promise<void> {
  const user = authUser.value;
  if (!user || !user.merchant_id) {
    ElMessage.error('请先登录');
    return;
  }

  loading.value = true;
  try {
    const result: StockLedgerListResult = await merchantService.listStockLedger({
      product_id: filters.product_id,
      reason: filters.reason,
      date_start: filters.date_start,
      date_end: filters.date_end,
      page: filters.page,
      page_size: filters.page_size
    });
    items.value = result.items;
    totalCount.value = result.total;
    reasonChoices.value = result.reason_choices;
  } catch (error) {
    ElMessage.error((error as Error).message);
  } finally {
    loading.value = false;
  }
}

async function loadProducts(): Promise<void> {
  const user = authUser.value;
  if (!user || !user.merchant_id) {
    return;
  }
  products.value = await merchantService.listProducts(user.merchant_id);
}

function goBack(): void {
  router.push('/dashboard');
}

function logout(): void {
  merchantService.logout();
  router.push('/login');
}

onMounted(async () => {
  await loadProducts();
  await loadData();
});
</script>

<style scoped>
.stock-ledger-navbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 24px;
  background: #fff;
  border-bottom: 1px solid var(--el-border-color-lighter, #ebeef5);
  position: sticky;
  top: 0;
  z-index: 10;
}

.navbar-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.navbar-divider {
  color: var(--el-border-color, #dcdfe6);
}

.navbar-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--el-text-color-primary, #303133);
}

.stock-ledger-page {
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.filter-card :deep(.el-card__body) {
  padding: 16px 20px;
}

.filter-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
}

.card-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
}

.card-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--el-text-color-primary, #303133);
}

.card-subtitle {
  font-size: 12px;
}

.table-wrapper {
  overflow-x: auto;
}

.change-qty {
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  font-size: 14px;
  margin-right: 8px;
}

.change-negative {
  color: var(--el-color-danger, #f56c6c);
}

.change-positive {
  color: var(--el-color-success, #67c23a);
}

.change-zero {
  color: var(--el-color-info, #909399);
}

.stock-range {
  font-size: 12px;
}

.order-no {
  font-family: 'SF Mono', Consolas, monospace;
  font-size: 12px;
  color: var(--el-text-color-regular, #606266);
}

.muted {
  color: var(--el-text-color-secondary, #909399);
}

.pagination-wrapper {
  display: flex;
  justify-content: flex-end;
  margin-top: 20px;
}
</style>
