from django.contrib import admin
from .models import Product


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'merchant', 'price', 'stock', 'is_active')
    search_fields = ('name',)
    list_filter = ('is_active', 'merchant')
