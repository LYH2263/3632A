from rest_framework import serializers
import re

from .models import StoreUser, Address


def is_valid_phone(phone: str) -> bool:
    return bool(re.match(r'^1[3-9]\d{9}$', phone))


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


class AddressSerializer(serializers.ModelSerializer):
    buyer_id = serializers.IntegerField(source='buyer.id', read_only=True)

    class Meta:
        model = Address
        fields = [
            'id',
            'buyer_id',
            'receiver_name',
            'receiver_phone',
            'receiver_address',
            'latitude',
            'longitude',
            'is_default',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class AddressCreateSerializer(serializers.Serializer):
    receiver_name = serializers.CharField(max_length=50)
    receiver_phone = serializers.CharField(max_length=20)
    receiver_address = serializers.CharField(max_length=255)
    latitude = serializers.FloatField(required=False, allow_null=True)
    longitude = serializers.FloatField(required=False, allow_null=True)
    is_default = serializers.BooleanField(required=False, default=False)

    def validate_receiver_phone(self, value: str) -> str:
        if not is_valid_phone(value):
            raise serializers.ValidationError('手机号格式错误')
        return value

    def validate_latitude(self, value):
        if value is None:
            return None
        if value < -90 or value > 90:
            raise serializers.ValidationError('纬度必须在 -90 到 90 之间')
        return value

    def validate_longitude(self, value):
        if value is None:
            return None
        if value < -180 or value > 180:
            raise serializers.ValidationError('经度必须在 -180 到 180 之间')
        return value


class AddressUpdateSerializer(serializers.Serializer):
    receiver_name = serializers.CharField(max_length=50, required=False)
    receiver_phone = serializers.CharField(max_length=20, required=False)
    receiver_address = serializers.CharField(max_length=255, required=False)
    latitude = serializers.FloatField(required=False, allow_null=True)
    longitude = serializers.FloatField(required=False, allow_null=True)
    is_default = serializers.BooleanField(required=False)

    def validate_receiver_phone(self, value: str) -> str:
        if not is_valid_phone(value):
            raise serializers.ValidationError('手机号格式错误')
        return value

    def validate_latitude(self, value):
        if value is None:
            return None
        if value < -90 or value > 90:
            raise serializers.ValidationError('纬度必须在 -90 到 90 之间')
        return value

    def validate_longitude(self, value):
        if value is None:
            return None
        if value < -180 or value > 180:
            raise serializers.ValidationError('经度必须在 -180 到 180 之间')
        return value
