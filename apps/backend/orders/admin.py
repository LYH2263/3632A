from django.contrib import admin
from .models import Order


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = (
        'id',
        'order_no',
        'buyer',
        'merchant',
        'status',
        'total_amount',
        'created_at'
    )
    search_fields = ('order_no', 'receiver_name', 'receiver_phone')
    list_filter = ('status', 'merchant')
