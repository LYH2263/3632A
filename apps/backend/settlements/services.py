from decimal import Decimal, ROUND_HALF_UP
from calendar import monthrange
from datetime import datetime
from random import randint

from django.conf import settings
from django.db import transaction
from django.utils import timezone

from merchants.models import Merchant
from orders.models import Order
from .models import SettlementStatement, SettlementItem


TWO_PLACES = Decimal('0.01')


def quantize_two(value: Decimal) -> Decimal:
    return value.quantize(TWO_PLACES, rounding=ROUND_HALF_UP)


def generate_statement_no() -> str:
    now = timezone.now()
    return f"SS{now.strftime('%Y%m%d%H%M%S')}{randint(1000, 9999)}"


def get_month_range(year: int, month: int) -> tuple[datetime, datetime]:
    start = timezone.make_aware(datetime(year, month, 1, 0, 0, 0))
    last_day = monthrange(year, month)[1]
    end = timezone.make_aware(datetime(year, month, last_day, 23, 59, 59, 999999))
    return start, end


def calculate_order_settlement(
    items_amount: Decimal,
    delivery_fee: Decimal,
    commission_rate: Decimal
) -> dict:
    """
    单笔订单结算金额计算

    公式：
      commission_amount = items_amount × commission_rate
      settle_amount     = items_amount + delivery_fee - commission_amount

    参数：
      items_amount    - 订单商品金额（来自 Order.items_amount）
      delivery_fee    - 订单配送费（来自 Order.delivery_fee）
      commission_rate - 平台佣金率（默认 0.0500 = 5%）

    返回：
      {commission_amount, settle_amount}  —— 均四舍五入保留 2 位小数
    """
    commission = quantize_two(items_amount * commission_rate)
    settle = quantize_two(items_amount + delivery_fee - commission)
    return {
        'commission_amount': commission,
        'settle_amount': settle
    }


def calculate_statement_totals(
    items_amount_total: Decimal,
    delivery_fee_total: Decimal,
    commission_rate: Decimal
) -> dict:
    """
    对账单汇总金额计算

    公式：
      commission_amount = items_amount_total × commission_rate
      settle_amount     = items_amount_total + delivery_fee_total - commission_amount

    说明：
      汇总金额基于所有明细订单 items_amount 之和、delivery_fee 之和
      再按佣金率统一计算，与逐单计算再求和的差异由 ROUND_HALF_UP 保证一致性。

    参数：
      items_amount_total - 该周期全部订单 items_amount 累计值
      delivery_fee_total - 该周期全部订单 delivery_fee 累计值
      commission_rate    - 平台佣金率

    返回：
      {commission_amount, settle_amount}
    """
    commission = quantize_two(items_amount_total * commission_rate)
    settle = quantize_two(items_amount_total + delivery_fee_total - commission)
    return {
        'commission_amount': commission,
        'settle_amount': settle
    }


class SettlementService:
    """
    结算核心服务

    职责：
      1. 按自然月筛选 merchant 的 completed 且未结算（settled_at IS NULL）订单
      2. 生成 SettlementStatement 及明细 SettlementItem（关联 order_id）
      3. 生成后写入 orders.settled_at 防止重复入账
      4. 草稿 → 确认 状态流转
    """

    @staticmethod
    def _get_commission_rate(merchant: Merchant) -> Decimal:
        override = getattr(merchant, 'commission_rate', None)
        if override is not None:
            return Decimal(str(override))
        return Decimal(str(getattr(settings, 'DEFAULT_SETTLEMENT_COMMISSION_RATE', 0.05)))

    @staticmethod
    def get_unsettled_completed_orders(merchant: Merchant, year: int, month: int):
        start, end = get_month_range(year, month)
        return Order.objects.filter(
            merchant=merchant,
            status='completed',
            settled_at__isnull=True,
            created_at__gte=start,
            created_at__lte=end
        ).select_for_update().order_by('created_at')

    @classmethod
    @transaction.atomic
    def generate_statement(
        cls,
        merchant: Merchant,
        year: int,
        month: int,
        commission_rate: Decimal | None = None
    ) -> tuple[SettlementStatement, bool]:
        """
        生成指定 merchant 某自然月对账单。

        返回：(statement, created) —— created=True 表示新生成，False 表示已存在
        防重复：
          - 唯一约束 unique(merchant, period_year, period_month) 数据库层兜底
          - 只筛选 settled_at 为空的 completed 订单
          - 生成后批量写入 settled_at
        """
        existing = SettlementStatement.objects.filter(
            merchant=merchant,
            period_year=year,
            period_month=month
        ).first()
        if existing is not None:
            return existing, False

        rate = commission_rate if commission_rate is not None else cls._get_commission_rate(merchant)
        orders_qs = cls.get_unsettled_completed_orders(merchant, year, month)
        orders = list(orders_qs)

        items_amount_total = Decimal('0.00')
        delivery_fee_total = Decimal('0.00')
        items: list[SettlementItem] = []

        for order in orders:
            calc = calculate_order_settlement(
                order.items_amount,
                order.delivery_fee,
                rate
            )
            items_amount_total += order.items_amount
            delivery_fee_total += order.delivery_fee
            items.append(SettlementItem(
                order=order,
                items_amount=order.items_amount,
                delivery_fee=order.delivery_fee,
                commission_amount=calc['commission_amount'],
                settle_amount=calc['settle_amount']
            ))

        totals = calculate_statement_totals(items_amount_total, delivery_fee_total, rate)

        statement = SettlementStatement(
            merchant=merchant,
            statement_no=generate_statement_no(),
            period_year=year,
            period_month=month,
            status='draft',
            order_count=len(orders),
            items_amount_total=quantize_two(items_amount_total),
            delivery_fee_total=quantize_two(delivery_fee_total),
            commission_rate=rate,
            commission_amount=totals['commission_amount'],
            settle_amount=totals['settle_amount']
        )
        statement.save()

        for item in items:
            item.statement = statement
        SettlementItem.objects.bulk_create(items)

        now = timezone.now()
        order_ids = [o.id for o in orders]
        if order_ids:
            Order.objects.filter(id__in=order_ids).update(settled_at=now)

        return statement, True

    @classmethod
    def generate_all_merchants(
        cls,
        year: int,
        month: int,
        commission_rate: Decimal | None = None
    ) -> list[tuple[SettlementStatement, bool]]:
        results = []
        for merchant in Merchant.objects.all().order_by('id'):
            results.append(cls.generate_statement(merchant, year, month, commission_rate))
        return results

    @staticmethod
    @transaction.atomic
    def confirm_statement(statement: SettlementStatement, confirmed_by) -> SettlementStatement:
        """
        商家确认对账单：draft → confirmed
        确认后不可回退。
        """
        if statement.status != 'draft':
            raise ValueError('只有草稿状态的对账单可以确认')

        statement.status = 'confirmed'
        statement.confirmed_by = confirmed_by
        statement.confirmed_at = timezone.now()
        statement.save(update_fields=['status', 'confirmed_by', 'confirmed_at', 'updated_at'])
        return statement
