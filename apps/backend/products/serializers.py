from rest_framework import serializers

from .models import Product


class ProductSerializer(serializers.ModelSerializer):
    merchant_id = serializers.IntegerField(source='merchant.id', read_only=True)

    class Meta:
        model = Product
        fields = [
            'id',
            'merchant_id',
            'merchant',
            'name',
            'price',
            'unit',
            'stock',
            'is_active',
            'image_url',
            'description'
        ]
        extra_kwargs = {
            'merchant': {'write_only': True}
        }
