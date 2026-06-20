from django.contrib import admin
from .models import SettlementStatement, SettlementItem


class SettlementItemInline(admin.TabularInline):
    model = SettlementItem
    extra = 0
    fields = [
        'order',
        'items_amount',
        'delivery_fee',
        'commission_amount',
        'settle_amount',
        'created_at'
    ]
    readonly_fields = [
        'order',
        'items_amount',
        'delivery_fee',
        'commission_amount',
        'settle_amount',
        'created_at'
    ]

    def has_add_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(SettlementStatement)
class SettlementStatementAdmin(admin.ModelAdmin):
    list_display = [
        'id',
        'statement_no',
        'merchant',
        'period_year',
        'period_month',
        'status',
        'order_count',
        'settle_amount',
        'created_at'
    ]
    list_filter = ['status', 'period_year', 'period_month']
    search_fields = ['statement_no', 'merchant__name']
    readonly_fields = [
        'statement_no',
        'merchant',
        'period_year',
        'period_month',
        'order_count',
        'items_amount_total',
        'delivery_fee_total',
        'commission_rate',
        'commission_amount',
        'settle_amount',
        'confirmed_at',
        'confirmed_by',
        'created_at',
        'updated_at'
    ]
    inlines = [SettlementItemInline]


@admin.register(SettlementItem)
class SettlementItemAdmin(admin.ModelAdmin):
    list_display = [
        'id',
        'statement',
        'order',
        'items_amount',
        'delivery_fee',
        'commission_amount',
        'settle_amount',
        'created_at'
    ]
    list_filter = ['created_at']
    search_fields = ['statement__statement_no', 'order__order_no']
    readonly_fields = [
        'statement',
        'order',
        'items_amount',
        'delivery_fee',
        'commission_amount',
        'settle_amount',
        'created_at'
    ]
