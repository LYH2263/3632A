from django.db import models
import json
from datetime import datetime, timedelta


DEFAULT_BUSINESS_HOURS = {
    '0': {'enabled': True, 'start': '08:00', 'end': '22:00'},
    '1': {'enabled': True, 'start': '08:00', 'end': '22:00'},
    '2': {'enabled': True, 'start': '08:00', 'end': '22:00'},
    '3': {'enabled': True, 'start': '08:00', 'end': '22:00'},
    '4': {'enabled': True, 'start': '08:00', 'end': '22:00'},
    '5': {'enabled': True, 'start': '08:00', 'end': '22:00'},
    '6': {'enabled': True, 'start': '08:00', 'end': '22:00'}
}

DEFAULT_LOW_STOCK_THRESHOLD = 5


def get_beijing_now():
    now = datetime.utcnow()
    return now + timedelta(hours=8)


def parse_time(time_str):
    hours, minutes = map(int, time_str.split(':'))
    return hours * 60 + minutes


def is_time_in_range(current_minutes, start, end):
    if start <= end:
        return start <= current_minutes < end
    return current_minutes >= start or current_minutes < end


DEFAULT_DELIVERY_RADIUS_KM = 0


class Merchant(models.Model):
    name = models.CharField(max_length=100)
    phone = models.CharField(max_length=20)
    address = models.CharField(max_length=255)
    delivery_note = models.CharField(max_length=255)
    min_order_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    delivery_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    delivery_radius_km = models.IntegerField(default=DEFAULT_DELIVERY_RADIUS_KM)
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)
    is_open = models.BooleanField(default=True)
    business_hours = models.JSONField(default=dict)
    low_stock_threshold = models.IntegerField(default=DEFAULT_LOW_STOCK_THRESHOLD)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'merchant'

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.business_hours:
            self.business_hours = DEFAULT_BUSINESS_HOURS
        super().save(*args, **kwargs)

    def is_merchant_open(self, now=None):
        if not self.is_open:
            return False

        beijing_now = now or get_beijing_now()
        weekday = str((beijing_now.weekday() + 1) % 7)
        current_minutes = beijing_now.hour * 60 + beijing_now.minute

        day_hours = self.business_hours.get(weekday, {})
        if not day_hours or not day_hours.get('enabled', False):
            return False

        start = parse_time(day_hours.get('start', '00:00'))
        end = parse_time(day_hours.get('end', '00:00'))

        return is_time_in_range(current_minutes, start, end)

    def get_status_text(self, now=None):
        return '营业中' if self.is_merchant_open(now) else '休息中'
