from rest_framework import serializers

from .models import SettlementStatement, SettlementItem


class SettlementItemSerializer(serializers.ModelSerializer):
    order_id = serializers.IntegerField(source='order.id', read_only=True)
    order_no = serializers.CharField(source='order.order_no', read_only=True)
    order_created_at = serializers.DateTimeField(source='order.created_at', read_only=True)

    class Meta:
        model = SettlementItem
        fields = [
            'id',
            'order_id',
            'order_no',
            'order_created_at',
            'items_amount',
            'delivery_fee',
            'commission_amount',
            'settle_amount',
            'created_at'
        ]


class SettlementStatementSerializer(serializers.ModelSerializer):
    merchant_id = serializers.IntegerField(source='merchant.id', read_only=True)
    merchant_name = serializers.CharField(source='merchant.name', read_only=True)
    confirmed_by_id = serializers.IntegerField(source='confirmed_by.id', read_only=True, allow_null=True)

    class Meta:
        model = SettlementStatement
        fields = [
            'id',
            'statement_no',
            'merchant_id',
            'merchant_name',
            'period_year',
            'period_month',
            'status',
            'order_count',
            'items_amount_total',
            'delivery_fee_total',
            'commission_rate',
            'commission_amount',
            'settle_amount',
            'confirmed_at',
            'confirmed_by_id',
            'created_at',
            'updated_at'
        ]


class SettlementStatementDetailSerializer(SettlementStatementSerializer):
    items = SettlementItemSerializer(many=True, read_only=True)

    class Meta(SettlementStatementSerializer.Meta):
        fields = SettlementStatementSerializer.Meta.fields + ['items']


class SettlementGenerateSerializer(serializers.Serializer):
    merchant_id = serializers.IntegerField(required=False, allow_null=True, default=None)
    year = serializers.IntegerField()
    month = serializers.IntegerField()
    commission_rate = serializers.DecimalField(
        max_digits=6,
        decimal_places=4,
        required=False,
        allow_null=True,
        default=None
    )

    def validate_month(self, value):
        if value < 1 or value > 12:
            raise serializers.ValidationError('月份必须在 1-12 之间')
        return value
