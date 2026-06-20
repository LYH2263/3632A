from rest_framework import serializers

from .models import Category, Product


class CategorySerializer(serializers.ModelSerializer):
    merchant_id = serializers.IntegerField(source='merchant.id', read_only=True)
    product_count = serializers.IntegerField(read_only=True, required=False)

    class Meta:
        model = Category
        fields = [
            'id',
            'merchant_id',
            'merchant',
            'name',
            'sort_order',
            'product_count',
            'created_at'
        ]
        extra_kwargs = {
            'merchant': {'write_only': True},
            'created_at': {'read_only': True}
        }


class ProductSerializer(serializers.ModelSerializer):
    merchant_id = serializers.IntegerField(source='merchant.id', read_only=True)
    category_id = serializers.IntegerField(source='category.id', read_only=True)

    class Meta:
        model = Product
        fields = [
            'id',
            'merchant_id',
            'category_id',
            'merchant',
            'category',
            'name',
            'price',
            'unit',
            'stock',
            'is_active',
            'image_url',
            'description'
        ]
        extra_kwargs = {
            'merchant': {'write_only': True},
            'category': {'write_only': True}
        }
