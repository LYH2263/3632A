from django.db import models


class Product(models.Model):
    merchant = models.ForeignKey('merchants.Merchant', on_delete=models.CASCADE, related_name='products')
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
