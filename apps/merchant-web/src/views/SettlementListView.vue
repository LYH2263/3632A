<template>
  <template v-if="authUser">
    <div class="settlement-navbar" data-testid="web-settlement-header">
      <div class="navbar-left">
        <el-button link @click="goBack">
          ← 返回控制台
        </el-button>
        <span class="navbar-divider">|</span>
        <span class="navbar-title">💰 对账单</span>
      </div>
      <el-button text type="danger" @click="logout">退出登录</el-button>
    </div>

    <div class="settlement-page" data-testid="web-settlement-page">
      <el-card class="filter-card" data-testid="web-settlement-filter">
        <div class="filter-bar">
          <el-select
            v-model="filters.status"
            placeholder="全部状态"
            clearable
            data-testid="web-settlement-filter-status"
            style="width: 140px;"
          >
            <el-option label="草稿" value="draft" />
            <el-option label="已确认" value="confirmed" />
          </el-select>

          <el-date-picker
            v-model="filters.year"
            type="year"
            placeholder="选择年份"
            value-format="YYYY"
            data-testid="web-settlement-filter-year"
            style="width: 130px;"
          />

          <el-select
            v-model="filters.month"
            placeholder="全部月份"
            clearable
            data-testid="web-settlement-filter-month"
            style="width: 120px;"
          >
            <el-option
              v-for="m in 12"
              :key="m"
              :label="`${m}月`"
              :value="m"
            />
          </el-select>

          <el-button type="primary" data-testid="web-settlement-filter-search" @click="applyFilters">
            🔍 查询
          </el-button>
          <el-button data-testid="web-settlement-filter-reset" @click="resetFilters">
            重置
          </el-button>
        </div>
      </el-card>

      <el-card class="table-card" data-testid="web-settlement-card">
        <template #header>
          <div class="card-header">
            <div class="card-title" data-testid="web-settlement-card-title">
              月度对账单
              <el-tag v-if="statements.length > 0" type="info" size="small" style="margin-left: 8px;">
                共 {{ statements.length }} 份
              </el-tag>
            </div>
            <div class="card-subtitle muted">按自然月汇总已完成订单的商品金额、配送费及平台佣金</div>
          </div>
        </template>

        <div class="table-wrapper">
          <el-table
            :data="statements"
            stripe
            v-loading="loading"
            data-testid="web-settlement-table"
            empty-text="暂无对账单"
          >
            <el-table-column label="结算周期" width="130">
              <template #default="scope">
                {{ scope.row.period_year }}年{{ scope.row.period_month }}月
              </template>
            </el-table-column>
            <el-table-column prop="statement_no" label="对账单号" min-width="200">
              <template #default="scope">
                <el-button
                  link
                  type="primary"
                  :data-testid="`web-settlement-view-${scope.row.id}`"
                  @click="viewDetail(scope.row.id)"
                >
                  {{ scope.row.statement_no }}
                </el-button>
              </template>
            </el-table-column>
            <el-table-column prop="order_count" label="订单数" width="90" align="center" />
            <el-table-column label="商品金额" width="130" align="right">
              <template #default="scope">
                {{ formatMoney(scope.row.items_amount_total) }}
              </template>
            </el-table-column>
            <el-table-column label="配送费" width="110" align="right">
              <template #default="scope">
                {{ formatMoney(scope.row.delivery_fee_total) }}
              </template>
            </el-table-column>
            <el-table-column label="佣金率" width="90" align="center">
              <template #default="scope">
                {{ formatRate(scope.row.commission_rate) }}
              </template>
            </el-table-column>
            <el-table-column label="佣金" width="110" align="right">
              <template #default="scope">
                <span class="amount-commission">{{ formatMoney(scope.row.commission_amount) }}</span>
              </template>
            </el-table-column>
            <el-table-column label="应结金额" width="130" align="right">
              <template #default="scope">
                <span class="amount-settle">{{ formatMoney(scope.row.settle_amount) }}</span>
              </template>
            </el-table-column>
            <el-table-column label="状态" width="100" align="center">
              <template #default="scope">
                <el-tag
                  :type="scope.row.status === 'confirmed' ? 'success' : 'warning'"
                  size="small"
                >
                  {{ scope.row.status === 'confirmed' ? '已确认' : '草稿' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="180" align="center">
              <template #default="scope">
                <el-space>
                  <el-button
                    size="small"
                    type="primary"
                    :data-testid="`web-settlement-detail-${scope.row.id}`"
                    @click="viewDetail(scope.row.id)"
                  >
                    明细
                  </el-button>
                  <el-button
                    v-if="scope.row.status === 'draft'"
                    size="small"
                    type="success"
                    :data-testid="`web-settlement-confirm-${scope.row.id}`"
                    @click="confirmStatement(scope.row)"
                  >
                    确认
                  </el-button>
                </el-space>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </el-card>
    </div>
  </template>
  <div v-else class="settlement-page"></div>
</template>

<script setup lang="ts">
import type { User } from '@community-store/shared';
import { onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { merchantService, type SettlementStatement, type SettlementFilterParams } from '../services/merchant-service';

const router = useRouter();
const authUser = ref<Omit<User, 'password'> | null>(merchantService.getAuthUser());

const statements = ref<SettlementStatement[]>([]);
const loading = ref(false);

const filters = reactive<SettlementFilterParams & { year?: string }>({
  status: undefined,
  year: undefined,
  month: undefined
});

function formatMoney(value: string | number): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return `¥${num.toFixed(2)}`;
}

function formatRate(value: string | number): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return `${(num * 100).toFixed(1)}%`;
}

function applyFilters(): void {
  loadData();
}

function resetFilters(): void {
  filters.status = undefined;
  filters.year = undefined;
  filters.month = undefined;
  loadData();
}

async function loadData(): Promise<void> {
  loading.value = true;
  try {
    const params: SettlementFilterParams = {};
    if (filters.status) params.status = filters.status;
    if (filters.year) params.year = parseInt(filters.year, 10);
    if (filters.month) params.month = filters.month;
    statements.value = await merchantService.listSettlements(params);
  } catch (error) {
    ElMessage.error((error as Error).message);
  } finally {
    loading.value = false;
  }
}

function viewDetail(statementId: number): void {
  router.push(`/settlements/${statementId}`);
}

async function confirmStatement(statement: SettlementStatement): Promise<void> {
  try {
    await ElMessageBox.confirm(
      `确认对账单 ${statement.statement_no}（${statement.period_year}年${statement.period_month}月，应结金额 ${formatMoney(statement.settle_amount)}）？确认后不可回退。`,
      '确认对账',
      {
        confirmButtonText: '确认对账',
        cancelButtonText: '取消',
        type: 'warning'
      }
    );

    loading.value = true;
    try {
      await merchantService.confirmSettlement(statement.id);
      ElMessage.success('对账单已确认');
      await loadData();
    } catch (error) {
      ElMessage.error((error as Error).message);
    } finally {
      loading.value = false;
    }
  } catch {
    // 用户取消
  }
}

function goBack(): void {
  router.push('/dashboard');
}

function logout(): void {
  merchantService.logout();
  router.push('/login');
}

onMounted(loadData);
</script>

<style scoped>
.settlement-navbar {
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

.settlement-page {
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

.amount-settle {
  font-weight: 600;
  color: var(--el-color-success, #67c23a);
  font-variant-numeric: tabular-nums;
}

.amount-commission {
  color: var(--el-color-danger, #f56c6c);
  font-variant-numeric: tabular-nums;
}

.muted {
  color: var(--el-text-color-secondary, #909399);
}
</style>
