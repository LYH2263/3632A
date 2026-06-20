from decimal import Decimal
from datetime import datetime, timedelta

from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from merchants.models import Merchant
from orders.models import Order
from users.models import StoreUser
from settlements.models import SettlementStatement, SettlementItem
from settlements.services import (
    calculate_order_settlement,
    calculate_statement_totals,
    SettlementService,
    quantize_two
)


class SettlementCalculationTests(TestCase):
    """
    金额计算公式单元测试

    单笔订单公式：
      commission_amount = items_amount × commission_rate
      settle_amount     = items_amount + delivery_fee - commission_amount

    对账单汇总公式：
      commission_amount_total = Σ(items_amount_i) × commission_rate
      settle_amount_total     = Σ(items_amount_i) + Σ(delivery_fee_i) - commission_amount_total
    """

    def test_quantize_two_rounds_correctly(self):
        self.assertEqual(quantize_two(Decimal('1.234')), Decimal('1.23'))
        self.assertEqual(quantize_two(Decimal('1.235')), Decimal('1.24'))
        self.assertEqual(quantize_two(Decimal('100.004')), Decimal('100.00'))
        self.assertEqual(quantize_two(Decimal('100.005')), Decimal('100.01'))

    def test_order_settlement_basic_five_percent(self):
        """
        场景：商品金额 100.00，配送费 5.00，佣金率 5%
          commission = 100 × 0.05 = 5.00
          settle     = 100 + 5 - 5 = 100.00
        """
        result = calculate_order_settlement(
            Decimal('100.00'),
            Decimal('5.00'),
            Decimal('0.0500')
        )
        self.assertEqual(result['commission_amount'], Decimal('5.00'))
        self.assertEqual(result['settle_amount'], Decimal('100.00'))

    def test_order_settlement_with_rounding(self):
        """
        场景：商品金额 33.33，配送费 0.00，佣金率 5%
          commission = 33.33 × 0.05 = 1.6665 → ROUND_HALF_UP → 1.67
          settle     = 33.33 + 0 - 1.67 = 31.66
        """
        result = calculate_order_settlement(
            Decimal('33.33'),
            Decimal('0.00'),
            Decimal('0.0500')
        )
        self.assertEqual(result['commission_amount'], Decimal('1.67'))
        self.assertEqual(result['settle_amount'], Decimal('31.66'))

    def test_order_settlement_zero(self):
        """
        场景：商品金额 0（边界情况）
          commission = 0 × 0.05 = 0.00
          settle     = 0 + 3 - 0 = 3.00
        """
        result = calculate_order_settlement(
            Decimal('0.00'),
            Decimal('3.00'),
            Decimal('0.0500')
        )
        self.assertEqual(result['commission_amount'], Decimal('0.00'))
        self.assertEqual(result['settle_amount'], Decimal('3.00'))

    def test_order_settlement_custom_rate(self):
        """
        场景：自定义佣金率 3.5%，商品 200，配送 8
          commission = 200 × 0.035 = 7.00
          settle     = 200 + 8 - 7 = 201.00
        """
        result = calculate_order_settlement(
            Decimal('200.00'),
            Decimal('8.00'),
            Decimal('0.0350')
        )
        self.assertEqual(result['commission_amount'], Decimal('7.00'))
        self.assertEqual(result['settle_amount'], Decimal('201.00'))

    def test_statement_totals_sum_match(self):
        """
        场景：两笔订单
          订单A：items=100 delivery=5 rate=5% → commission=5 settle=100
          订单B：items=200 delivery=5 rate=5% → commission=10 settle=195
          汇总 items=300 delivery=10
            commission = 300 × 5% = 15.00
            settle     = 300 + 10 - 15 = 295.00
          与逐单求和：commission 5+10=15 ✓；settle 100+195=295 ✓
        """
        order_a = calculate_order_settlement(Decimal('100'), Decimal('5'), Decimal('0.05'))
        order_b = calculate_order_settlement(Decimal('200'), Decimal('5'), Decimal('0.05'))

        totals = calculate_statement_totals(
            Decimal('300.00'),
            Decimal('10.00'),
            Decimal('0.0500')
        )

        self.assertEqual(
            order_a['commission_amount'] + order_b['commission_amount'],
            totals['commission_amount']
        )
        self.assertEqual(
            order_a['settle_amount'] + order_b['settle_amount'],
            totals['settle_amount']
        )

    def test_statement_totals_with_rounding_edge(self):
        """
        场景：三笔订单 33.33 商品金额 × 3 = 99.99
          单笔佣金 33.33 × 0.05 = 1.6665 → 1.67
          三笔合计佣金逐单求和 = 1.67 × 3 = 5.01
          汇总佣金 99.99 × 0.05 = 4.9995 → 5.00
          差异由四舍五入造成：此处验证汇总公式独立计算结果 = 5.00
        """
        per_order = Decimal('33.33')
        single = calculate_order_settlement(per_order, Decimal('0'), Decimal('0.05'))
        sum_commission = single['commission_amount'] * 3
        sum_items = per_order * 3

        totals = calculate_statement_totals(sum_items, Decimal('0'), Decimal('0.05'))
        self.assertEqual(totals['commission_amount'], Decimal('5.00'))
        self.assertEqual(totals['settle_amount'], Decimal('94.99'))
        self.assertEqual(sum_commission, Decimal('5.01'))


class SettlementServiceTests(TestCase):
    def setUp(self):
        self.merchant = Merchant.objects.create(
            name='测试商家',
            phone='020-88888888',
            address='测试地址',
            delivery_note='',
            min_order_amount=0,
            delivery_fee=3,
            is_open=True
        )
        self.buyer = StoreUser.objects.create(
            username='buyer_test',
            password='pass',
            role='buyer',
            nickname='测试买家',
            phone='13800138000'
        )
        self.merchant_user = StoreUser.objects.create(
            username='merchant_test',
            password='pass',
            role='merchant',
            nickname='测试商家账号',
            phone='13900139000',
            merchant=self.merchant
        )
        self.period_start = timezone.make_aware(datetime(2026, 5, 1, 0, 0, 0))

    def _make_completed_order(self, items_amount, delivery_fee, offset_days=1, settled_at=None):
        created = self.period_start + timedelta(days=offset_days)
        order = Order.objects.create(
            buyer=self.buyer,
            merchant=self.merchant,
            order_no=f'TEST{created.strftime("%Y%m%d%H%M%S")}{offset_days}',
            status='completed',
            pay_method='offline',
            receiver_name='test',
            receiver_phone='13800138000',
            receiver_address='test',
            items_amount=Decimal(str(items_amount)),
            delivery_fee=Decimal(str(delivery_fee)),
            total_amount=Decimal(str(items_amount)) + Decimal(str(delivery_fee)),
            items_snapshot=[],
            settled_at=settled_at
        )
        Order.objects.filter(id=order.id).update(created_at=created)
        return Order.objects.get(id=order.id)

    def test_generate_statement_creates_correctly(self):
        """
        生成对账单：3 笔 completed 订单，金额应正确汇总
          订单1: 100+5 → 佣金 5, settle 100
          订单2: 200+5 → 佣金 10, settle 195
          订单3: 50+5  → 佣金 2.5, settle 52.5
          汇总：items 350, delivery 15, commission 17.50, settle 347.50
        """
        self._make_completed_order(100, 5, offset_days=1)
        self._make_completed_order(200, 5, offset_days=2)
        self._make_completed_order(50, 5, offset_days=3)

        statement, created = SettlementService.generate_statement(self.merchant, 2026, 5)
        self.assertTrue(created)
        self.assertEqual(statement.order_count, 3)
        self.assertEqual(statement.items_amount_total, Decimal('350.00'))
        self.assertEqual(statement.delivery_fee_total, Decimal('15.00'))
        self.assertEqual(statement.commission_rate, Decimal('0.0500'))
        self.assertEqual(statement.commission_amount, Decimal('17.50'))
        self.assertEqual(statement.settle_amount, Decimal('347.50'))
        self.assertEqual(statement.status, 'draft')
        self.assertEqual(statement.items.count(), 3)

        items = statement.items.all()
        item_commission_sum = sum(i.commission_amount for i in items)
        item_settle_sum = sum(i.settle_amount for i in items)
        self.assertEqual(item_commission_sum, statement.commission_amount)
        self.assertEqual(item_settle_sum, statement.settle_amount)

    def test_generate_statement_marks_settled_at(self):
        """验证生成后订单 settled_at 已写入，防重复"""
        order = self._make_completed_order(100, 3)
        self.assertIsNone(order.settled_at)

        SettlementService.generate_statement(self.merchant, 2026, 5)
        order.refresh_from_db()
        self.assertIsNotNone(order.settled_at)

    def test_generate_statement_skips_settled_orders(self):
        """已 settled 的 completed 订单不参与新对账单"""
        order_settled = self._make_completed_order(999, 0, offset_days=1)
        Order.objects.filter(id=order_settled.id).update(settled_at=timezone.now())
        self._make_completed_order(100, 3, offset_days=2)

        statement, _ = SettlementService.generate_statement(self.merchant, 2026, 5)
        self.assertEqual(statement.order_count, 1)
        self.assertEqual(statement.items_amount_total, Decimal('100.00'))

    def test_generate_statement_skips_non_completed(self):
        """非 completed 状态订单不参与结算"""
        order_pending = self._make_completed_order(100, 3, offset_days=1)
        Order.objects.filter(id=order_pending.id).update(status='pending')
        self._make_completed_order(50, 3, offset_days=2)

        statement, _ = SettlementService.generate_statement(self.merchant, 2026, 5)
        self.assertEqual(statement.order_count, 1)

    def test_generate_statement_skips_other_month(self):
        """其他月份订单不参与"""
        june_order = self._make_completed_order(200, 5, offset_days=31)
        created_june = timezone.make_aware(datetime(2026, 6, 1, 10, 0, 0))
        Order.objects.filter(id=june_order.id).update(created_at=created_june)
        self._make_completed_order(100, 3, offset_days=2)

        may_statement, _ = SettlementService.generate_statement(self.merchant, 2026, 5)
        self.assertEqual(may_statement.order_count, 1)

        june_statement, _ = SettlementService.generate_statement(self.merchant, 2026, 6)
        self.assertEqual(june_statement.order_count, 1)
        self.assertEqual(june_statement.items_amount_total, Decimal('200.00'))

    def test_generate_statement_idempotent(self):
        """同月重复生成幂等：第二次返回已存在的，不创建新记录"""
        self._make_completed_order(100, 3)
        s1, c1 = SettlementService.generate_statement(self.merchant, 2026, 5)
        self.assertTrue(c1)

        s2, c2 = SettlementService.generate_statement(self.merchant, 2026, 5)
        self.assertFalse(c2)
        self.assertEqual(s1.id, s2.id)
        self.assertEqual(SettlementStatement.objects.count(), 1)

    def test_generate_statement_empty_month(self):
        """无订单月份生成空对账单"""
        statement, created = SettlementService.generate_statement(self.merchant, 2026, 5)
        self.assertTrue(created)
        self.assertEqual(statement.order_count, 0)
        self.assertEqual(statement.items_amount_total, Decimal('0.00'))
        self.assertEqual(statement.settle_amount, Decimal('0.00'))

    def test_confirm_statement_transitions_status(self):
        """确认对账单：draft → confirmed，并写入确认信息"""
        self._make_completed_order(100, 3)
        statement, _ = SettlementService.generate_statement(self.merchant, 2026, 5)
        self.assertEqual(statement.status, 'draft')

        confirmed = SettlementService.confirm_statement(statement, self.merchant_user)
        self.assertEqual(confirmed.status, 'confirmed')
        self.assertEqual(confirmed.confirmed_by_id, self.merchant_user.id)
        self.assertIsNotNone(confirmed.confirmed_at)

    def test_confirm_statement_already_confirmed_raises(self):
        """已确认对账单不可重复确认"""
        self._make_completed_order(100, 3)
        statement, _ = SettlementService.generate_statement(self.merchant, 2026, 5)
        SettlementService.confirm_statement(statement, self.merchant_user)

        with self.assertRaises(ValueError):
            SettlementService.confirm_statement(statement, self.merchant_user)


class SettlementApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.merchant = Merchant.objects.create(
            name='API商家',
            phone='020-12345678',
            address='地址',
            delivery_note='',
            min_order_amount=0,
            delivery_fee=3,
            is_open=True
        )
        self.buyer = StoreUser.objects.create(
            username='buyer_api',
            password='p',
            role='buyer',
            nickname='买',
            phone='138'
        )
        self.merchant_user = StoreUser.objects.create(
            username='m_api',
            password='p',
            role='merchant',
            nickname='商',
            phone='139',
            merchant=self.merchant
        )
        self.admin_user = StoreUser.objects.create(
            username='admin',
            password='p',
            role='buyer',
            nickname='管理员',
            phone='110'
        )

        may1 = timezone.make_aware(datetime(2026, 5, 10, 10, 0, 0))
        self.order1 = Order.objects.create(
            buyer=self.buyer,
            merchant=self.merchant,
            order_no='ORDMAY10001',
            status='completed',
            pay_method='offline',
            receiver_name='x',
            receiver_phone='1',
            receiver_address='x',
            items_amount=Decimal('200.00'),
            delivery_fee=Decimal('5.00'),
            total_amount=Decimal('205.00'),
            items_snapshot=[]
        )
        Order.objects.filter(id=self.order1.id).update(created_at=may1)

    def _auth(self, user):
        return {'HTTP_AUTHORIZATION': f'Bearer django-token-{user.id}'}

    def test_generate_statement_by_admin(self):
        resp = self.client.post(
            '/api/v1/settlements/generate',
            {'merchant_id': self.merchant.id, 'year': 2026, 'month': 5},
            format='json',
            **self._auth(self.admin_user)
        )
        self.assertEqual(resp.status_code, 200)
        self.assertTrue(resp.data['data']['results'][0]['created'])

    def test_generate_statement_merchant_forbidden_custom_rate(self):
        resp = self.client.post(
            '/api/v1/settlements/generate',
            {'merchant_id': self.merchant.id, 'year': 2026, 'month': 5, 'commission_rate': '0.0300'},
            format='json',
            **self._auth(self.merchant_user)
        )
        self.assertEqual(resp.status_code, 403)

    def test_list_statements_merchant_scoped(self):
        self.client.post(
            '/api/v1/settlements/generate',
            {'merchant_id': self.merchant.id, 'year': 2026, 'month': 5},
            format='json',
            **self._auth(self.admin_user)
        )
        resp = self.client.get(
            '/api/v1/settlements',
            **self._auth(self.merchant_user)
        )
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(len(resp.data['data']), 1)

    def test_confirm_statement_by_merchant(self):
        gen = self.client.post(
            '/api/v1/settlements/generate',
            {'merchant_id': self.merchant.id, 'year': 2026, 'month': 5},
            format='json',
            **self._auth(self.admin_user)
        )
        stmt_id = gen.data['data']['results'][0]['statement_id']

        resp = self.client.post(
            f'/api/v1/settlements/{stmt_id}/confirm',
            **self._auth(self.merchant_user)
        )
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data['data']['status'], 'confirmed')

    def test_confirm_statement_buyer_forbidden(self):
        gen = self.client.post(
            '/api/v1/settlements/generate',
            {'merchant_id': self.merchant.id, 'year': 2026, 'month': 5},
            format='json',
            **self._auth(self.admin_user)
        )
        stmt_id = gen.data['data']['results'][0]['statement_id']

        resp = self.client.post(
            f'/api/v1/settlements/{stmt_id}/confirm',
            **self._auth(self.buyer)
        )
        self.assertEqual(resp.status_code, 403)

    def test_detail_view_includes_items(self):
        gen = self.client.post(
            '/api/v1/settlements/generate',
            {'merchant_id': self.merchant.id, 'year': 2026, 'month': 5},
            format='json',
            **self._auth(self.admin_user)
        )
        stmt_id = gen.data['data']['results'][0]['statement_id']

        resp = self.client.get(
            f'/api/v1/settlements/{stmt_id}',
            **self._auth(self.merchant_user)
        )
        self.assertEqual(resp.status_code, 200)
        self.assertIn('items', resp.data['data'])
        self.assertEqual(len(resp.data['data']['items']), 1)
        self.assertEqual(resp.data['data']['items'][0]['order_id'], self.order1.id)

    def test_unauthenticated_forbidden(self):
        resp = self.client.get('/api/v1/settlements')
        self.assertEqual(resp.status_code, 403)
