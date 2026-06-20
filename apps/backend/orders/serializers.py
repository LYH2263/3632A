from rest_framework import serializers

from .models import Order


class CartItemSerializer(serializers.Serializer):
    product_id = serializers.IntegerField()
    quantity = serializers.IntegerField()


class CartValidateSerializer(serializers.Serializer):
    merchant_id = serializers.IntegerField()
    cart_items = CartItemSerializer(many=True)


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
