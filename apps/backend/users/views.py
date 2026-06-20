from django.contrib.auth.hashers import check_password, make_password
from django.db import transaction
from django.core.cache import cache
from rest_framework.views import APIView

from common.response import error_response, success_response
from merchants.models import Merchant
from .models import StoreUser
from .serializers import LoginSerializer, RegisterMerchantSerializer


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
