from django.db import models


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
