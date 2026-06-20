from django.contrib import admin
from .models import StoreUser, Address


@admin.register(StoreUser)
class StoreUserAdmin(admin.ModelAdmin):
    list_display = ('id', 'username', 'role', 'merchant', 'phone', 'created_at')
    search_fields = ('username', 'nickname', 'phone')
    list_filter = ('role',)


@admin.register(Address)
class AddressAdmin(admin.ModelAdmin):
    list_display = ('id', 'buyer', 'receiver_name', 'receiver_phone', 'is_default', 'created_at')
    search_fields = ('receiver_name', 'receiver_phone', 'receiver_address')
    list_filter = ('is_default',)
    ordering = ('-created_at',)
