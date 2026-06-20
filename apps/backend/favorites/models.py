from django.db import models


class Favorite(models.Model):
    buyer = models.ForeignKey(
        'users.StoreUser',
        on_delete=models.CASCADE,
        related_name='favorites'
    )
    product = models.ForeignKey(
        'products.Product',
        on_delete=models.CASCADE,
        related_name='favorited_by'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'favorite'
        ordering = ['-created_at']
        constraints = [
            models.UniqueConstraint(fields=['buyer', 'product'], name='unique_buyer_product_favorite')
        ]

    def __str__(self):
        return f'{self.buyer.username} - {self.product.name}'
