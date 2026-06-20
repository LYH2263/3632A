from django.core.cache import cache
from rest_framework.views import APIView

from common.auth import get_request_user
from common.response import error_response, success_response
from .models import Merchant
from .serializers import MerchantSerializer

MERCHANT_LIST_CACHE_KEY = 'merchant:list'


def require_merchant_permission(request, merchant_id: int):
    user = get_request_user(request)
    if user is None:
        return error_response('请先登录', status_code=403)
    if user.role != 'merchant':
        return error_response('仅商家可操作', status_code=403)
    if user.merchant_id != merchant_id:
        return error_response('无权操作该商家数据', status_code=403)
    return None


class MerchantListView(APIView):
    def get(self, request):
        cached = cache.get(MERCHANT_LIST_CACHE_KEY)
        if cached is not None:
            return success_response(cached)

        merchants = Merchant.objects.all().order_by('id')
        serializer = MerchantSerializer(merchants, many=True)
        cache.set(MERCHANT_LIST_CACHE_KEY, serializer.data, 60)
        return success_response(serializer.data)


class MerchantDetailView(APIView):
    def patch(self, request, merchant_id: int):
        merchant = Merchant.objects.filter(id=merchant_id).first()
        if merchant is None:
            return error_response('商家不存在', status_code=404)

        permission_error = require_merchant_permission(request, merchant_id)
        if permission_error is not None:
            return permission_error

        serializer = MerchantSerializer(merchant, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        cache.delete(MERCHANT_LIST_CACHE_KEY)

        return success_response(serializer.data)
