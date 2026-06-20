from django.db import models


class StoreUser(models.Model):
    ROLE_CHOICES = (
        ('buyer', 'buyer'),
        ('merchant', 'merchant')
    )

    username = models.CharField(max_length=64, unique=True)
    password = models.CharField(max_length=256)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES)
    nickname = models.CharField(max_length=50)
    phone = models.CharField(max_length=20, blank=True, default='')
    merchant = models.ForeignKey(
        'merchants.Merchant',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='users'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'store_user'

    def __str__(self):
        return self.username
