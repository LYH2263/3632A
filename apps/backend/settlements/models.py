from django.db import models
from decimal import Decimal


class SettlementStatement(models.Model):
    STATUS_CHOICES = (
        ('draft', 'draft'),
        ('confirmed', 'confirmed')
    )

    merchant = models.ForeignKey(
        'merchants.Merchant',
        on_delete=models.PROTECT,
        related_name='settlement_statements'
    )
    statement_no = models.CharField(max_length=40, unique=True)
    period_year = models.IntegerField()
    period_month = models.IntegerField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    order_count = models.IntegerField(default=0)
    items_amount_total = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    delivery_fee_total = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    commission_rate = models.DecimalField(max_digits=6, decimal_places=4, default=Decimal('0.0500'))
    commission_amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    settle_amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    confirmed_at = models.DateTimeField(null=True, blank=True, default=None)
    confirmed_by = models.ForeignKey(
        'users.StoreUser',
        null=True,
        blank=True,
        default=None,
        on_delete=models.SET_NULL,
        related_name='confirmed_settlements'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'settlement_statement'
        unique_together = (('merchant', 'period_year', 'period_month'),)

    def __str__(self):
        return self.statement_no


class SettlementItem(models.Model):
    statement = models.ForeignKey(
        SettlementStatement,
        on_delete=models.CASCADE,
        related_name='items'
    )
    order = models.OneToOneField(
        'orders.Order',
        on_delete=models.PROTECT,
        related_name='settlement_item'
    )
    items_amount = models.DecimalField(max_digits=10, decimal_places=2)
    delivery_fee = models.DecimalField(max_digits=10, decimal_places=2)
    commission_amount = models.DecimalField(max_digits=12, decimal_places=2)
    settle_amount = models.DecimalField(max_digits=12, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'settlement_item'

    def __str__(self):
        return f'{self.statement.statement_no} - 订单{self.order_id}'
