from django.contrib import admin
from .models import StoreUser


@admin.register(StoreUser)
class StoreUserAdmin(admin.ModelAdmin):
    list_display = ('id', 'username', 'role', 'merchant', 'phone', 'created_at')
    search_fields = ('username', 'nickname', 'phone')
    list_filter = ('role',)
