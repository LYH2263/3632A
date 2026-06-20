from rest_framework import serializers
from .models import Favorite
from products.serializers import ProductSerializer
from merchants.serializers import MerchantSerializer


class FavoriteSerializer(serializers.ModelSerializer):
    buyer_id = serializers.IntegerField(source='buyer.id', read_only=True)
    product_id = serializers.IntegerField(source='product.id', read_only=True)
    product = ProductSerializer(read_only=True)
    merchant = serializers.SerializerMethodField()

    class Meta:
        model = Favorite
        fields = [
            'id',
            'buyer_id',
            'product_id',
            'product',
            'merchant',
            'created_at'
        ]

    def get_merchant(self, obj):
        merchant = obj.product.merchant
        return MerchantSerializer(merchant).data
