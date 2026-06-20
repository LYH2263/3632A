from django.contrib import admin
from django.urls import path

from users.views import LoginView, RegisterMerchantView, AddressListView, AddressDetailView, AddressSetDefaultView
from merchants.views import MerchantListView, MerchantDetailView
from products.views import (
    ProductListView, ProductDetailView, CategoryListView, CategoryDetailView,
    LowStockAlertView, ProductBatchToggleView, StockLedgerListView
)
from orders.views import CartValidateView, OrderDetailView, OrderListView, OrderStatusUpdateView
from favorites.views import FavoriteListView, FavoriteDetailView, FavoriteCheckView
from usermessages.views import MessageListView, MessageUnreadCountView, MessageReadView, MessageReadAllView
from settlements.views import (
    SettlementStatementListView,
    SettlementStatementDetailView,
    SettlementStatementConfirmView,
    SettlementGenerateView
)

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/v1/auth/login', LoginView.as_view(), name='auth-login'),
    path('api/v1/auth/register-merchant', RegisterMerchantView.as_view(), name='auth-register-merchant'),
    path('api/v1/merchants', MerchantListView.as_view(), name='merchant-list'),
    path('api/v1/merchants/<int:merchant_id>', MerchantDetailView.as_view(), name='merchant-detail'),
    path('api/v1/categories', CategoryListView.as_view(), name='category-list'),
    path('api/v1/categories/<int:category_id>', CategoryDetailView.as_view(), name='category-detail'),
    path('api/v1/products', ProductListView.as_view(), name='product-list'),
    path('api/v1/products/low-stock', LowStockAlertView.as_view(), name='product-low-stock'),
    path('api/v1/products/batch-toggle', ProductBatchToggleView.as_view(), name='product-batch-toggle'),
    path('api/v1/products/stock-ledger', StockLedgerListView.as_view(), name='product-stock-ledger'),
    path('api/v1/products/<int:product_id>', ProductDetailView.as_view(), name='product-detail'),
    path('api/v1/cart/validate', CartValidateView.as_view(), name='cart-validate'),
    path('api/v1/orders', OrderListView.as_view(), name='order-list'),
    path('api/v1/orders/<int:order_id>', OrderDetailView.as_view(), name='order-detail'),
    path('api/v1/orders/<int:order_id>/status', OrderStatusUpdateView.as_view(), name='order-status'),
    path('api/v1/addresses', AddressListView.as_view(), name='address-list'),
    path('api/v1/addresses/<int:address_id>', AddressDetailView.as_view(), name='address-detail'),
    path('api/v1/addresses/<int:address_id>/default', AddressSetDefaultView.as_view(), name='address-set-default'),
    path('api/v1/favorites', FavoriteListView.as_view(), name='favorite-list'),
    path('api/v1/favorites/<int:product_id>', FavoriteDetailView.as_view(), name='favorite-detail'),
    path('api/v1/favorites/<int:product_id>/check', FavoriteCheckView.as_view(), name='favorite-check'),
    path('api/v1/messages', MessageListView.as_view(), name='message-list'),
    path('api/v1/messages/unread-count', MessageUnreadCountView.as_view(), name='message-unread-count'),
    path('api/v1/messages/<int:message_id>/read', MessageReadView.as_view(), name='message-read'),
    path('api/v1/messages/read-all', MessageReadAllView.as_view(), name='message-read-all'),
    path('api/v1/settlements', SettlementStatementListView.as_view(), name='settlement-list'),
    path('api/v1/settlements/generate', SettlementGenerateView.as_view(), name='settlement-generate'),
    path('api/v1/settlements/<int:statement_id>', SettlementStatementDetailView.as_view(), name='settlement-detail'),
    path('api/v1/settlements/<int:statement_id>/confirm', SettlementStatementConfirmView.as_view(), name='settlement-confirm'),
]
