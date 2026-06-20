from rest_framework import serializers

from .models import StoreUser


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=64)
    password = serializers.CharField(max_length=128)


class RegisterMerchantSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=64)
    password = serializers.CharField(max_length=128)
    nickname = serializers.CharField(max_length=50)
    phone = serializers.CharField(max_length=20)
    merchant_name = serializers.CharField(max_length=100)
    address = serializers.CharField(max_length=255)
    delivery_note = serializers.CharField(
        max_length=255,
        required=False,
        allow_blank=True,
        default=''
    )
    min_order_amount = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        required=False,
        default=0
    )
    delivery_fee = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        required=False,
        default=0
    )
    is_open = serializers.BooleanField(required=False, default=True)

    def validate_username(self, value: str) -> str:
        if StoreUser.objects.filter(username=value).exists():
            raise serializers.ValidationError('用户名已存在')
        return value
