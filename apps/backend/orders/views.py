from datetime import datetime
from decimal import Decimal
from random import randint
from django.db import transaction
from django.utils import timezone
from rest_framework.views import APIView

from common.auth import get_request_user
from common.response import error_response, success_response
from merchants.models import Merchant
from products.models import Product
from users.models import StoreUser
from .models import Order
from .serializers import (
    CartValidateSerializer,
    OrderCreateSerializer,
    OrderSerializer,
    OrderStatusSerializer
)

STATUS_TRANSITIONS = {
    'pending': ['confirmed', 'canceled'],
    'confirmed': ['delivering'],
    'delivering': ['completed'],
    'completed': [],
    'canceled': []
}


def generate_order_no() -> str:
    now = timezone.now()
    return f"CS{now.strftime('%Y%m%d%H%M%S')}{randint(1000, 9999)}"


def validate_cart(merchant: Merchant, cart_items: list[dict]) -> tuple[list[str], list[dict], Decimal]:
    errors: list[str] = []
    snapshots: list[dict] = []
    items_amount = Decimal('0')

    if not cart_items:
        errors.append('购物车为空')
        return errors, snapshots, items_amount

    if not merchant.is_merchant_open():
        errors.append('商家当前非营业时段，暂无法下单')
        return errors, snapshots, items_amount

    for item in cart_items:
        product = Product.objects.filter(id=item['product_id'], merchant=merchant).first()
        if product is None:
            errors.append(f"商品 {item['product_id']} 不存在")
            continue

        quantity = int(item['quantity'])
        if quantity <= 0:
            errors.append(f"{product.name} 数量必须是正整数")
            continue

        if product.stock != -1 and quantity > product.stock:
            errors.append(f"{product.name} 超过库存限制")
            continue

        if not product.is_active:
            errors.append(f"{product.name} 已下架")
            continue

        subtotal = product.price * Decimal(quantity)
        items_amount += subtotal

        snapshots.append(
            {
                'product_id': product.id,
                'name': product.name,
                'unit': product.unit,
                'price': float(product.price),
                'quantity': quantity,
                'subtotal': float(subtotal)
            }
        )

    if items_amount < merchant.min_order_amount:
        errors.append(f"未达到起送价：¥{merchant.min_order_amount:.2f}")

    return errors, snapshots, items_amount


def require_merchant_permission(request, merchant_id: int):
    user = get_request_user(request)
    if user is None:
        return error_response('请先登录', status_code=403)
    if user.role != 'merchant':
        return error_response('仅商家可操作', status_code=403)
    if user.merchant_id != merchant_id:
        return error_response('无权操作该商家订单', status_code=403)
    return None


class CartValidateView(APIView):
    def post(self, request):
        serializer = CartValidateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        merchant = Merchant.objects.filter(id=serializer.validated_data['merchant_id']).first()
        if merchant is None:
            return error_response('商家不存在', status_code=404)

        errors, snapshots, items_amount = validate_cart(
            merchant,
            serializer.validated_data['cart_items']
        )
        if errors:
            return error_response('购物车校验失败', errors=errors)

        total_amount = items_amount + merchant.delivery_fee
        return success_response(
            {
                'valid': True,
                'items_snapshot': snapshots,
                'items_amount': float(items_amount),
                'delivery_fee': float(merchant.delivery_fee),
                'total_amount': float(total_amount)
            }
        )


class OrderListView(APIView):
    def get(self, request):
        buyer_id = request.query_params.get('buyer_id')
        merchant_id = request.query_params.get('merchant_id')
        status = request.query_params.get('status')
        date_start = request.query_params.get('date_start')
        date_end = request.query_params.get('date_end')
        order_no = request.query_params.get('order_no')
        phone_suffix = request.query_params.get('phone_suffix')

        if date_start:
            try:
                datetime.strptime(date_start, '%Y-%m-%d')
            except ValueError:
                try:
                    datetime.strptime(date_start, '%Y-%m-%dT%H:%M:%S')
                except ValueError:
                    return error_response('date_start 格式非法，需 YYYY-MM-DD 或 YYYY-MM-DDTHH:MM:SS', status_code=400)

        if date_end:
            try:
                datetime.strptime(date_end, '%Y-%m-%d')
            except ValueError:
                try:
                    datetime.strptime(date_end, '%Y-%m-%dT%H:%M:%S')
                except ValueError:
                    return error_response('date_end 格式非法，需 YYYY-MM-DD 或 YYYY-MM-DDTHH:MM:SS', status_code=400)

        if merchant_id:
            try:
                target_merchant_id = int(merchant_id)
            except (TypeError, ValueError):
                return error_response('merchant_id 非法', status_code=400)

            permission_error = require_merchant_permission(request, target_merchant_id)
            if permission_error is not None:
                return permission_error

        queryset = Order.objects.all().order_by('-created_at')
        if buyer_id:
            queryset = queryset.filter(buyer_id=buyer_id)
        if merchant_id:
            queryset = queryset.filter(merchant_id=merchant_id)
        if status:
            queryset = queryset.filter(status=status)
        if date_start:
            queryset = queryset.filter(created_at__gte=date_start)
        if date_end:
            queryset = queryset.filter(created_at__lte=date_end + 'T23:59:59' if len(date_end) == 10 else date_end)
        if order_no:
            queryset = queryset.filter(order_no__icontains=order_no)
        if phone_suffix:
            queryset = queryset.filter(receiver_phone__endswith=phone_suffix)

        serializer = OrderSerializer(queryset, many=True)
        return success_response(serializer.data)

    @transaction.atomic
    def post(self, request):
        serializer = OrderCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        payload = serializer.validated_data

        current_user = get_request_user(request)
        if current_user is not None:
            if current_user.role != 'buyer':
                return error_response('仅买家可下单', status_code=403)
            if current_user.id != payload['buyer_id']:
                return error_response('无权为其他买家下单', status_code=403)

        buyer = StoreUser.objects.filter(id=payload['buyer_id']).first()
        if buyer is None:
            return error_response('买家不存在', status_code=404)

        merchant = Merchant.objects.filter(id=payload['merchant_id']).first()
        if merchant is None:
            return error_response('商家不存在', status_code=404)

        errors, snapshots, items_amount = validate_cart(merchant, payload['cart_items'])
        if errors:
            return error_response('下单失败', errors=errors)

        total_amount = items_amount + merchant.delivery_fee

        order = Order.objects.create(
            buyer=buyer,
            merchant=merchant,
            order_no=generate_order_no(),
            status='pending',
            pay_method='offline',
            receiver_name=payload['receiver_name'],
            receiver_phone=payload['receiver_phone'],
            receiver_address=payload['receiver_address'],
            remark=payload.get('remark', ''),
            items_amount=items_amount,
            delivery_fee=merchant.delivery_fee,
            total_amount=total_amount,
            items_snapshot=snapshots
        )

        for item in payload['cart_items']:
            product = Product.objects.filter(id=item['product_id'], merchant=merchant).first()
            if product and product.stock != -1:
                product.stock = product.stock - int(item['quantity'])
                product.save(update_fields=['stock'])

        return success_response(OrderSerializer(order).data, status_code=201)


class OrderDetailView(APIView):
    def get(self, request, order_id: int):
        order = Order.objects.filter(id=order_id).first()
        if order is None:
            return success_response(None)

        user = get_request_user(request)
        if user is not None:
            if user.role == 'buyer' and order.buyer_id != user.id:
                return error_response('无权查看该订单', status_code=403)
            if user.role == 'merchant' and order.merchant_id != user.merchant_id:
                return error_response('无权查看该订单', status_code=403)

        return success_response(OrderSerializer(order).data)


class OrderStatusUpdateView(APIView):
    def patch(self, request, order_id: int):
        order = Order.objects.filter(id=order_id).first()
        if order is None:
            return error_response('订单不存在', status_code=404)

        serializer = OrderStatusSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        next_status = serializer.validated_data['status']

        if next_status == order.status:
            return success_response(OrderSerializer(order).data)

        user = get_request_user(request)
        if user is None:
            return error_response('请先登录', status_code=403)

        if next_status == 'canceled':
            if user.role == 'buyer':
                if order.buyer_id != user.id:
                    return error_response('无权操作该订单', status_code=403)
            else:
                permission_error = require_merchant_permission(request, order.merchant_id)
                if permission_error is not None:
                    return permission_error
        else:
            permission_error = require_merchant_permission(request, order.merchant_id)
            if permission_error is not None:
                return permission_error

        allowed = STATUS_TRANSITIONS.get(order.status, [])
        if next_status not in allowed:
            return error_response('状态不可逆或非法迁移', status_code=400)

        order.status = next_status
        order.save(update_fields=['status', 'updated_at'])
        return success_response(OrderSerializer(order).data)
