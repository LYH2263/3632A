from django.contrib import admin
from .models import Merchant


@admin.register(Merchant)
class MerchantAdmin(admin.ModelAdmin):
    list_display = (
        'id',
        'name',
        'phone',
        'min_order_amount',
        'delivery_fee',
        'is_open'
    )
    search_fields = ('name', 'phone', 'address')
    list_filter = ('is_open',)
