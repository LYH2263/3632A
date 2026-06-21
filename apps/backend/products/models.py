from django.db import models, transaction


class StockLedger(models.Model):
    REASON_ORDER_DEDUCT = 'order_deduct'
    REASON_MERCHANT_ADJUST = 'merchant_adjust'
    REASON_BATCH_TOGGLE = 'batch_toggle'
    REASON_ORDER_CANCEL = 'order_cancel'

    REASON_CHOICES = (
        (REASON_ORDER_DEDUCT, '下单扣减'),
        (REASON_MERCHANT_ADJUST, '商家调整'),
        (REASON_BATCH_TOGGLE, '批量上下架'),
        (REASON_ORDER_CANCEL, '取消订单返还'),
    )

    product = models.ForeignKey('Product', on_delete=models.CASCADE, related_name='stock_ledgers')
    merchant = models.ForeignKey('merchants.Merchant', on_delete=models.CASCADE, related_name='stock_ledgers')
    change_quantity = models.IntegerField()
    stock_before = models.IntegerField()
    stock_after = models.IntegerField()
    reason = models.CharField(max_length=30, choices=REASON_CHOICES)
    operator_id = models.IntegerField(null=True, blank=True)
    operator_role = models.CharField(max_length=20, blank=True, default='')
    operator_name = models.CharField(max_length=100, blank=True, default='')
    order = models.ForeignKey('orders.Order', on_delete=models.SET_NULL, null=True, blank=True, related_name='stock_ledgers')
    remark = models.CharField(max_length=255, blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'stock_ledger'
        ordering = ['-created_at', '-id']
        indexes = [
            models.Index(fields=['product_id', '-created_at']),
            models.Index(fields=['merchant_id', '-created_at']),
            models.Index(fields=['reason']),
        ]

    def __str__(self):
        return f'{self.product_id}: {self.change_quantity:+d} ({self.reason})'


class Category(models.Model):
    merchant = models.ForeignKey('merchants.Merchant', on_delete=models.CASCADE, related_name='categories')
    name = models.CharField(max_length=50)
    sort_order = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'category'
        ordering = ['sort_order', 'id']
        constraints = [
            models.UniqueConstraint(fields=['merchant', 'name'], name='unique_merchant_category_name')
        ]

    def __str__(self):
        return self.name


class Product(models.Model):
    merchant = models.ForeignKey('merchants.Merchant', on_delete=models.CASCADE, related_name='products')
    category = models.ForeignKey(Category, on_delete=models.PROTECT, related_name='products', null=True)
    name = models.CharField(max_length=120)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    unit = models.CharField(max_length=20)
    stock = models.IntegerField(default=-1)
    is_active = models.BooleanField(default=True)
    image_url = models.CharField(max_length=255, blank=True, default='')
    description = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'product'

    def __str__(self):
        return self.name

    @transaction.atomic
    def adjust_stock(
        self,
        quantity: int,
        reason: str,
        operator=None,
        order=None,
        remark: str = '',
        allow_negative: bool = False,
        target_stock: int | None = None
    ) -> 'StockLedger':
        stock_before = self.stock

        if target_stock is not None:
            if target_stock == -1:
                stock_after = -1
            else:
                stock_after = target_stock
                if stock_after < 0 and not allow_negative:
                    raise ValueError(f'库存不能为负数：目标 {target_stock}')
        else:
            if quantity == 0:
                raise ValueError('变更数量不能为 0')

            if self.stock == -1:
                raise ValueError('不限库存模式下不能进行数量增减，请先设置具体库存值')

            stock_after = self.stock + quantity
            if stock_after < 0 and not allow_negative:
                raise ValueError(f'库存不足：当前 {self.stock}，需变更 {quantity}')

        self.stock = stock_after
        self.save(update_fields=['stock'])

        operator_id = None
        operator_role = ''
        operator_name = ''
        if operator is not None:
            operator_id = getattr(operator, 'id', None)
            operator_role = getattr(operator, 'role', '')
            operator_name = getattr(operator, 'nickname', '') or getattr(operator, 'username', '')

        return StockLedger.objects.create(
            product=self,
            merchant=self.merchant,
            change_quantity=quantity,
            stock_before=stock_before,
            stock_after=stock_after,
            reason=reason,
            operator_id=operator_id,
            operator_role=operator_role,
            operator_name=operator_name,
            order=order,
            remark=remark,
        )
