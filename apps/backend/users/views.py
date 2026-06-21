from django.contrib.auth.hashers import check_password, make_password
from django.db import transaction
from django.core.cache import cache
from rest_framework.views import APIView

from common.auth import get_request_user
from common.response import error_response, success_response
from merchants.models import Merchant
from .models import StoreUser, Address
from .serializers import (
    LoginSerializer,
    RegisterMerchantSerializer,
    AddressSerializer,
    AddressCreateSerializer,
    AddressUpdateSerializer
)


def build_auth_payload(user: StoreUser) -> dict:
    return {
        'token': f'django-token-{user.id}',
        'user': {
            'id': user.id,
            'username': user.username,
            'role': user.role,
            'nickname': user.nickname,
            'phone': user.phone,
            'merchant_id': user.merchant_id
        }
    }


class LoginView(APIView):
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        username = serializer.validated_data['username']
        password = serializer.validated_data['password']

        user = StoreUser.objects.filter(username=username).first()
        if user is None or not check_password(password, user.password):
            return error_response('账号或密码错误', status_code=401)

        return success_response(build_auth_payload(user))


class RegisterMerchantView(APIView):
    authentication_classes = []
    permission_classes = []

    @transaction.atomic
    def post(self, request):
        serializer = RegisterMerchantSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        payload = serializer.validated_data

        merchant = Merchant.objects.create(
            name=payload['merchant_name'],
            phone=payload['phone'],
            address=payload['address'],
            delivery_note=payload['delivery_note'] or '请联系商家协商配送',
            min_order_amount=payload['min_order_amount'],
            delivery_fee=payload['delivery_fee'],
            delivery_radius_km=0,
            latitude=None,
            longitude=None,
            is_open=payload['is_open']
        )

        user = StoreUser.objects.create(
            username=payload['username'],
            password=make_password(payload['password']),
            role='merchant',
            nickname=payload['nickname'],
            phone=payload['phone'],
            merchant=merchant
        )
        cache.delete('merchant:list')

        return success_response(build_auth_payload(user), status_code=201)


def set_default_address_exclusive(buyer: StoreUser, address_id: int) -> None:
    Address.objects.filter(buyer=buyer).update(is_default=False)
    Address.objects.filter(buyer=buyer, id=address_id).update(is_default=True)


class AddressListView(APIView):
    def get(self, request):
        user = get_request_user(request)
        if user is None:
            return error_response('请先登录', status_code=403)
        if user.role != 'buyer':
            return error_response('仅买家可操作地址', status_code=403)

        addresses = Address.objects.filter(buyer=user).order_by('-is_default', '-created_at')
        serializer = AddressSerializer(addresses, many=True)
        return success_response(serializer.data)

    @transaction.atomic
    def post(self, request):
        user = get_request_user(request)
        if user is None:
            return error_response('请先登录', status_code=403)
        if user.role != 'buyer':
            return error_response('仅买家可操作地址', status_code=403)

        serializer = AddressCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        payload = serializer.validated_data

        is_first = not Address.objects.filter(buyer=user).exists()
        address = Address.objects.create(
            buyer=user,
            receiver_name=payload['receiver_name'],
            receiver_phone=payload['receiver_phone'],
            receiver_address=payload['receiver_address'],
            latitude=payload.get('latitude'),
            longitude=payload.get('longitude'),
            is_default=is_first or payload.get('is_default', False)
        )

        if payload.get('is_default', False) and not is_first:
            set_default_address_exclusive(user, address.id)

        return success_response(AddressSerializer(address).data, status_code=201)


class AddressDetailView(APIView):
    def get(self, request, address_id: int):
        user = get_request_user(request)
        if user is None:
            return error_response('请先登录', status_code=403)
        if user.role != 'buyer':
            return error_response('仅买家可操作地址', status_code=403)

        address = Address.objects.filter(id=address_id, buyer=user).first()
        if address is None:
            return error_response('地址不存在', status_code=404)

        return success_response(AddressSerializer(address).data)

    @transaction.atomic
    def patch(self, request, address_id: int):
        user = get_request_user(request)
        if user is None:
            return error_response('请先登录', status_code=403)
        if user.role != 'buyer':
            return error_response('仅买家可操作地址', status_code=403)

        address = Address.objects.filter(id=address_id, buyer=user).first()
        if address is None:
            return error_response('地址不存在', status_code=404)

        serializer = AddressUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        payload = serializer.validated_data

        if 'receiver_name' in payload:
            address.receiver_name = payload['receiver_name']
        if 'receiver_phone' in payload:
            address.receiver_phone = payload['receiver_phone']
        if 'receiver_address' in payload:
            address.receiver_address = payload['receiver_address']
        if 'latitude' in payload:
            address.latitude = payload['latitude']
        if 'longitude' in payload:
            address.longitude = payload['longitude']

        if 'is_default' in payload:
            address.is_default = bool(payload['is_default'])

        address.save()

        if payload.get('is_default'):
            set_default_address_exclusive(user, address.id)

        address.refresh_from_db()
        return success_response(AddressSerializer(address).data)

    @transaction.atomic
    def delete(self, request, address_id: int):
        user = get_request_user(request)
        if user is None:
            return error_response('请先登录', status_code=403)
        if user.role != 'buyer':
            return error_response('仅买家可操作地址', status_code=403)

        address = Address.objects.filter(id=address_id, buyer=user).first()
        if address is None:
            return error_response('地址不存在', status_code=404)

        was_default = address.is_default
        address.delete()

        if was_default:
            remaining = Address.objects.filter(buyer=user).order_by('-created_at').first()
            if remaining is not None:
                remaining.is_default = True
                remaining.save(update_fields=['is_default', 'updated_at'])

        return success_response(None)


class AddressSetDefaultView(APIView):
    @transaction.atomic
    def post(self, request, address_id: int):
        user = get_request_user(request)
        if user is None:
            return error_response('请先登录', status_code=403)
        if user.role != 'buyer':
            return error_response('仅买家可操作地址', status_code=403)

        address = Address.objects.filter(id=address_id, buyer=user).first()
        if address is None:
            return error_response('地址不存在', status_code=404)

        set_default_address_exclusive(user, address.id)
        address.refresh_from_db()
        return success_response(AddressSerializer(address).data)
