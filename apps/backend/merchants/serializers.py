import re
from rest_framework import serializers

from .models import Merchant, DEFAULT_BUSINESS_HOURS


class BusinessHoursSerializer(serializers.Serializer):
    enabled = serializers.BooleanField()
    start = serializers.CharField()
    end = serializers.CharField()

    def validate(self, attrs):
        if attrs.get('enabled', False):
            time_regex = r'^\d{2}:\d{2}$'
            if not re.match(time_regex, attrs.get('start', '')):
                raise serializers.ValidationError('开始时间格式错误，应为 HH:mm')
            if not re.match(time_regex, attrs.get('end', '')):
                raise serializers.ValidationError('结束时间格式错误，应为 HH:mm')
        return attrs


class MerchantSerializer(serializers.ModelSerializer):
    business_hours = serializers.DictField(child=BusinessHoursSerializer(), required=False)

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
            'is_open',
            'business_hours'
        ]

    def validate_business_hours(self, value):
        if not value:
            return DEFAULT_BUSINESS_HOURS

        required_days = {'0', '1', '2', '3', '4', '5', '6'}
        provided_days = set(str(k) for k in value.keys())

        missing = required_days - provided_days
        if missing:
            raise serializers.ValidationError(f'缺少周几配置: {", ".join(sorted(missing))}')

        return value

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if not data.get('business_hours'):
            data['business_hours'] = DEFAULT_BUSINESS_HOURS
        return data
