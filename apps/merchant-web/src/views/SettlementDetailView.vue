<template>
  <template v-if="authUser">
    <div class="settlement-navbar" data-testid="web-settlement-detail-header">
      <div class="navbar-left">
        <el-button link @click="goBack">
          ← 返回对账单列表
        </el-button>
        <span class="navbar-divider">|</span>
        <span class="navbar-title">💰 对账单明细</span>
      </div>
      <el-button text type="danger" @click="logout">退出登录</el-button>
    </div>

    <div class="settlement-detail-page" v-loading="loading" data-testid="web-settlement-detail-page">
      <template v-if="statement">
        <el-card class="summary-card" data-testid="web-settlement-summary">
          <template #header>
            <div class="card-header">
              <div class="card-title" data-testid="web-settlement-detail-title">
                {{ statement.period_year }}年{{ statement.period_month }}月 对账单
              </div>
              <el-tag
                :type="statement.status === 'confirmed' ? 'success' : 'warning'"
                size="large"
                data-testid="web-settlement-detail-status"
              >
                {{ statement.status === 'confirmed' ? '已确认' : '草稿' }}
              </el-tag>
            </div>
          </template>

          <div class="summary-grid" data-testid="web-settlement-summary-grid">
            <div class="summary-item">
              <div class="summary-label">对账单号</div>
              <div class="summary-value mono">{{ statement.statement_no }}</div>
            </div>
            <div class="summary-item">
              <div class="summary-label">结算周期</div>
              <div class="summary-value">{{ statement.period_year }}年{{ statement.period_month }}月</div>
            </div>
            <div class="summary-item">
              <div class="summary-label">订单数量</div>
              <div class="summary-value">{{ statement.order_count }} 笔</div>
            </div>
            <div class="summary-item">
              <div class="summary-label">商品金额合计</div>
              <div class="summary-value">{{ formatMoney(statement.items_amount_total) }}</div>
            </div>
            <div class="summary-item">
              <div class="summary-label">配送费合计</div>
              <div class="summary-value">{{ formatMoney(statement.delivery_fee_total) }}</div>
            </div>
            <div class="summary-item">
              <div class="summary-label">佣金率</div>
              <div class="summary-value">{{ formatRate(statement.commission_rate) }}</div>
            </div>
            <div class="summary-item">
              <div class="summary-label">平台佣金</div>
              <div class="summary-value amount-commission">-{{ formatMoney(statement.commission_amount) }}</div>
            </div>
            <div class="summary-item highlight">
              <div class="summary-label">应结金额</div>
              <div class="summary-value amount-settle">{{ formatMoney(statement.settle_amount) }}</div>
            </div>
          </div>

          <div class="formula-box" data-testid="web-settlement-formula">
            <div class="formula-title">计算公式</div>
            <div class="formula-line">佣金 = 商品金额合计 × 佣金率 = {{ formatMoney(statement.items_amount_total) }} × {{ formatRate(statement.commission_rate) }} = <span class="amount-commission">{{ formatMoney(statement.commission_amount) }}</span></div>
            <div class="formula-line">应结金额 = 商品金额合计 + 配送费合计 - 佣金 = {{ formatMoney(statement.items_amount_total) }} + {{ formatMoney(statement.delivery_fee_total) }} - {{ formatMoney(statement.commission_amount) }} = <span class="amount-settle">{{ formatMoney(statement.settle_amount) }}</span></div>
          </div>

          <div v-if="statement.status === 'confirmed'" class="confirm-info" data-testid="web-settlement-confirm-info">
            ✅ 已于 {{ formatTime(statement.confirmed_at!) }} 确认
          </div>

          <div v-if="statement.status === 'draft'" class="confirm-action" data-testid="web-settlement-confirm-action">
            <el-button
              type="success"
              size="large"
              data-testid="web-settlement-detail-confirm"
              @click="confirmStatement"
            >
              ✅ 确认对账
            </el-button>
            <span class="confirm-tip muted">确认后不可回退，请核实金额无误后再操作</span>
          </div>
        </el-card>

        <el-card class="items-card" data-testid="web-settlement-items-card">
          <template #header>
            <div class="card-header">
              <div class="card-title" data-testid="web-settlement-items-title">
                订单明细
                <el-tag v-if="statement.items && statement.items.length > 0" type="info" size="small" style="margin-left: 8px;">
                  共 {{ statement.items.length }} 笔
                </el-tag>
              </div>
            </div>
          </template>

          <div class="table-wrapper">
            <el-table
              :data="statement.items ?? []"
              stripe
              data-testid="web-settlement-items-table"
              empty-text="暂无订单明细"
            >
              <el-table-column prop="order_no" label="订单号" min-width="200">
                <template #default="scope">
                  <span class="order-no">{{ scope.row.order_no }}</span>
                </template>
              </el-table-column>
              <el-table-column label="下单时间" width="180">
                <template #default="scope">
                  {{ formatTime(scope.row.order_created_at) }}
                </template>
              </el-table-column>
              <el-table-column label="商品金额" width="130" align="right">
                <template #default="scope">
                  {{ formatMoney(scope.row.items_amount) }}
                </template>
              </el-table-column>
              <el-table-column label="配送费" width="110" align="right">
                <template #default="scope">
                  {{ formatMoney(scope.row.delivery_fee) }}
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
            </el-table>
          </div>
        </el-card>
      </template>

      <el-empty v-else description="对账单不存在" data-testid="web-settlement-detail-empty" />
    </div>
  </template>
  <div v-else class="settlement-detail-page"></div>
</template>

<script setup lang="ts">
import type { User } from '@community-store/shared';
import { onMounted, ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { merchantService, type SettlementStatement } from '../services/merchant-service';

const router = useRouter();
const route = useRoute();
const authUser = ref<Omit<User, 'password'> | null>(merchantService.getAuthUser());

const statement = ref<SettlementStatement | null>(null);
const loading = ref(false);

const statementId = Number(route.params.statementId);

function formatMoney(value: string | number): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return `¥${num.toFixed(2)}`;
}

function formatRate(value: string | number): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return `${(num * 100).toFixed(1)}%`;
}

function formatTime(iso: string | null): string {
  if (!iso) return '';
  return iso.replace('T', ' ').slice(0, 19);
}

async function loadData(): Promise<void> {
  if (!statementId || isNaN(statementId)) {
    ElMessage.error('对账单 ID 非法');
    return;
  }

  loading.value = true;
  try {
    statement.value = await merchantService.getSettlementDetail(statementId);
  } catch (error) {
    ElMessage.error((error as Error).message);
  } finally {
    loading.value = false;
  }
}

async function confirmStatement(): Promise<void> {
  if (!statement.value) return;

  try {
    await ElMessageBox.confirm(
      `确认对账单 ${statement.value.statement_no}（${statement.value.period_year}年${statement.value.period_month}月，应结金额 ${formatMoney(statement.value.settle_amount)}）？确认后不可回退。`,
      '确认对账',
      {
        confirmButtonText: '确认对账',
        cancelButtonText: '取消',
        type: 'warning'
      }
    );

    loading.value = true;
    try {
      statement.value = await merchantService.confirmSettlement(statement.value.id);
      ElMessage.success('对账单已确认');
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
  router.push('/settlements');
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

.settlement-detail-page {
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  min-height: calc(100vh - 54px);
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.card-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--el-text-color-primary, #303133);
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 20px;
}

.summary-item {
  padding: 12px 16px;
  background: var(--el-bg-color-page, #f5f7fa);
  border-radius: 8px;
}

.summary-item.highlight {
  background: var(--el-color-success-light-9, #f0f9eb);
  border: 1px solid var(--el-color-success-light-7, #c2e7b0);
}

.summary-label {
  font-size: 12px;
  color: var(--el-text-color-secondary, #909399);
  margin-bottom: 4px;
}

.summary-value {
  font-size: 16px;
  font-weight: 600;
  color: var(--el-text-color-primary, #303133);
  font-variant-numeric: tabular-nums;
}

.summary-value.mono {
  font-family: 'SF Mono', Consolas, monospace;
  font-size: 14px;
}

.formula-box {
  padding: 16px;
  background: var(--el-color-info-light-9, #f4f4f5);
  border-radius: 8px;
  margin-bottom: 20px;
}

.formula-title {
  font-weight: 600;
  font-size: 13px;
  margin-bottom: 8px;
  color: var(--el-text-color-primary, #303133);
}

.formula-line {
  font-size: 13px;
  color: var(--el-text-color-regular, #606266);
  font-family: 'SF Mono', Consolas, monospace;
  line-height: 1.8;
}

.confirm-info {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: var(--el-color-success-light-9, #f0f9eb);
  border-radius: 8px;
  color: var(--el-color-success, #67c23a);
  font-weight: 500;
}

.confirm-action {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-top: 4px;
}

.confirm-tip {
  font-size: 13px;
}

.table-wrapper {
  overflow-x: auto;
}

.order-no {
  font-family: 'SF Mono', Consolas, monospace;
  font-size: 13px;
  color: var(--el-text-color-regular, #606266);
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
