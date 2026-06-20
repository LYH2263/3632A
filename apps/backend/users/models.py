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


class Address(models.Model):
    buyer = models.ForeignKey(
        StoreUser,
        on_delete=models.CASCADE,
        related_name='addresses'
    )
    receiver_name = models.CharField(max_length=50)
    receiver_phone = models.CharField(max_length=20)
    receiver_address = models.CharField(max_length=255)
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)
    is_default = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'address'

    def __str__(self):
        return f'{self.receiver_name} - {self.receiver_address}'
