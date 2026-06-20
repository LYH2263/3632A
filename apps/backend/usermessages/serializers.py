from rest_framework import serializers

from .models import Message


class MessageSerializer(serializers.ModelSerializer):
    buyer_id = serializers.IntegerField(source='buyer.id', read_only=True)
    order_id = serializers.IntegerField(source='order.id', read_only=True, allow_null=True)

    class Meta:
        model = Message
        fields = [
            'id',
            'buyer_id',
            'type',
            'order_id',
            'order_status',
            'title',
            'content',
            'is_read',
            'created_at'
        ]
