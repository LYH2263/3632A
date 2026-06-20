from decimal import Decimal, InvalidOperation
from django.core.management.base import BaseCommand, CommandError

from merchants.models import Merchant
from settlements.services import SettlementService


class Command(BaseCommand):
    help = '按自然月生成商家对账单（SettlementStatement）'

    def add_arguments(self, parser):
        parser.add_argument(
            '--year',
            type=int,
            required=True,
            help='结算周期年份，如 2026'
        )
        parser.add_argument(
            '--month',
            type=int,
            required=True,
            help='结算周期月份，1-12'
        )
        parser.add_argument(
            '--merchant-id',
            type=int,
            default=None,
            help='指定商家 ID，不传则处理全部商家'
        )
        parser.add_argument(
            '--commission-rate',
            type=str,
            default=None,
            help='自定义佣金率，如 0.05 表示 5%%，不传则使用系统默认值'
        )

    def handle(self, *args, **options):
        year = options['year']
        month = options['month']
        merchant_id = options['merchant_id']
        rate_str = options['commission_rate']

        if month < 1 or month > 12:
            raise CommandError('month 必须在 1-12 之间')

        commission_rate = None
        if rate_str is not None:
            try:
                commission_rate = Decimal(rate_str)
            except (InvalidOperation, ValueError):
                raise CommandError(f'commission_rate 非法: {rate_str}')
            if commission_rate < 0 or commission_rate > 1:
                raise CommandError('commission_rate 必须在 0 到 1 之间')

        if merchant_id is not None:
            merchant = Merchant.objects.filter(id=merchant_id).first()
            if merchant is None:
                raise CommandError(f'merchant_id={merchant_id} 不存在')
            merchants = [merchant]
        else:
            merchants = list(Merchant.objects.all().order_by('id'))
            if not merchants:
                self.stdout.write(self.style.WARNING('系统中暂无商家，无需生成对账单'))
                return

        created_count = 0
        skipped_count = 0
        order_total = 0

        for merchant in merchants:
            statement, created = SettlementService.generate_statement(
                merchant, year, month, commission_rate
            )
            if created:
                created_count += 1
                order_total += statement.order_count
                self.stdout.write(
                    self.style.SUCCESS(
                        f'[新建] 商家 #{merchant.id} {merchant.name}: '
                        f'{statement.statement_no}，订单数 {statement.order_count}，'
                        f'结算 ¥{statement.settle_amount:.2f}'
                    )
                )
            else:
                skipped_count += 1
                self.stdout.write(
                    self.style.WARNING(
                        f'[跳过] 商家 #{merchant.id} {merchant.name}: '
                        f'{year}-{month:02d} 对账单已存在（{statement.statement_no}）'
                    )
                )

        self.stdout.write(
            self.style.SUCCESS(
                f'\n完成：新建 {created_count} 份，跳过 {skipped_count} 份，'
                f'累计订单 {order_total} 笔'
            )
        )
