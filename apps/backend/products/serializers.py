from rest_framework import serializers

from common.auth import get_request_user
from .models import Category, Product, StockLedger


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
    is_low_stock = serializers.SerializerMethodField()

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
            'description',
            'is_low_stock'
        ]
        extra_kwargs = {
            'merchant': {'write_only': True},
            'category': {'write_only': True}
        }

    def get_is_low_stock(self, obj):
        request = self.context.get('request')
        if request:
            user = get_request_user(request)
            if user and user.role == 'merchant' and user.merchant_id == obj.merchant_id:
                threshold = getattr(obj.merchant, 'low_stock_threshold', 5)
                return obj.stock != -1 and obj.stock <= threshold
        return None

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if data.get('is_low_stock') is None:
            data.pop('is_low_stock', None)
        return data


class StockLedgerSerializer(serializers.ModelSerializer):
    product_id = serializers.IntegerField(source='product.id', read_only=True)
    product_name = serializers.CharField(source='product.name', read_only=True)
    merchant_id = serializers.IntegerField(source='merchant.id', read_only=True)
    reason_label = serializers.CharField(source='get_reason_display', read_only=True)
    order_no = serializers.CharField(source='order.order_no', read_only=True, default=None)

    class Meta:
        model = StockLedger
        fields = [
            'id',
            'product_id',
            'product_name',
            'merchant_id',
            'change_quantity',
            'stock_before',
            'stock_after',
            'reason',
            'reason_label',
            'operator_id',
            'operator_role',
            'operator_name',
            'order_id',
            'order_no',
            'remark',
            'created_at'
        ]
