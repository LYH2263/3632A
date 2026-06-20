from rest_framework import serializers

from .models import Order


class CartItemSerializer(serializers.Serializer):
    product_id = serializers.IntegerField()
    quantity = serializers.IntegerField()


class CartValidateSerializer(serializers.Serializer):
    merchant_id = serializers.IntegerField()
    cart_items = CartItemSerializer(many=True)
    latitude = serializers.FloatField(required=False, allow_null=True)
    longitude = serializers.FloatField(required=False, allow_null=True)

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


class OrderCreateSerializer(CartValidateSerializer):
    buyer_id = serializers.IntegerField()
    receiver_name = serializers.CharField(max_length=50)
    receiver_phone = serializers.CharField(max_length=20)
    receiver_address = serializers.CharField(max_length=255)
    remark = serializers.CharField(max_length=255, required=False, allow_blank=True)


class OrderStatusSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=['pending', 'confirmed', 'delivering', 'completed', 'canceled'])


class OrderSerializer(serializers.ModelSerializer):
    buyer_id = serializers.IntegerField(source='buyer.id', read_only=True)
    merchant_id = serializers.IntegerField(source='merchant.id', read_only=True)

    class Meta:
        model = Order
        fields = [
            'id',
            'order_no',
            'buyer_id',
            'merchant_id',
            'status',
            'pay_method',
            'receiver_name',
            'receiver_phone',
            'receiver_address',
            'remark',
            'items_amount',
            'delivery_fee',
            'total_amount',
            'items_snapshot',
            'created_at',
            'updated_at'
        ]
