from django.db import models

from users.models import StoreUser


class Message(models.Model):
    TYPE_CHOICES = (
        ('order_status', 'order_status'),
    )

    buyer = models.ForeignKey(
        StoreUser,
        on_delete=models.CASCADE,
        related_name='messages'
    )
    type = models.CharField(max_length=20, choices=TYPE_CHOICES, default='order_status')
    order = models.ForeignKey(
        'orders.Order',
        on_delete=models.CASCADE,
        related_name='messages',
        null=True,
        blank=True
    )
    order_status = models.CharField(max_length=20, blank=True, default='')
    title = models.CharField(max_length=100)
    content = models.CharField(max_length=500)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'message'
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.title} - {self.buyer.username}'
