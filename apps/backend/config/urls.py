from django.contrib import admin
from django.urls import path

from users.views import LoginView, RegisterMerchantView
from merchants.views import MerchantListView, MerchantDetailView
from products.views import ProductListView, ProductDetailView
from orders.views import CartValidateView, OrderDetailView, OrderListView, OrderStatusUpdateView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/v1/auth/login', LoginView.as_view(), name='auth-login'),
    path('api/v1/auth/register-merchant', RegisterMerchantView.as_view(), name='auth-register-merchant'),
    path('api/v1/merchants', MerchantListView.as_view(), name='merchant-list'),
    path('api/v1/merchants/<int:merchant_id>', MerchantDetailView.as_view(), name='merchant-detail'),
    path('api/v1/products', ProductListView.as_view(), name='product-list'),
    path('api/v1/products/<int:product_id>', ProductDetailView.as_view(), name='product-detail'),
    path('api/v1/cart/validate', CartValidateView.as_view(), name='cart-validate'),
    path('api/v1/orders', OrderListView.as_view(), name='order-list'),
    path('api/v1/orders/<int:order_id>', OrderDetailView.as_view(), name='order-detail'),
    path('api/v1/orders/<int:order_id>/status', OrderStatusUpdateView.as_view(), name='order-status')
]
