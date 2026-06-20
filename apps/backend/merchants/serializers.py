from rest_framework import serializers

from .models import Merchant


class MerchantSerializer(serializers.ModelSerializer):
    class Meta:
        model = Merchant
        fields = [
            'id',
            'name',
            'phone',
            'address',
            'delivery_note',
            'min_order_amount',
            'delivery_fee',
            'is_open'
        ]
