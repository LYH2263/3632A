from django.db import IntegrityError
from rest_framework.views import APIView
from rest_framework.pagination import PageNumberPagination

from common.auth import get_request_user
from common.response import error_response, success_response, no_content_response
from products.models import Product
from .models import Favorite
from .serializers import FavoriteSerializer


class StandardResultsSetPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


class FavoriteListView(APIView):
    def get(self, request):
        user = get_request_user(request)
        if user is None:
            return error_response('请先登录', status_code=401)
        if user.role != 'buyer':
            return error_response('仅买家可操作', status_code=403)

        page = int(request.query_params.get('page', 1))
        page_size = int(request.query_params.get('page_size', 20))

        queryset = Favorite.objects.filter(buyer=user).select_related(
            'product', 'product__merchant'
        ).order_by('-created_at')

        total = queryset.count()
        start = (page - 1) * page_size
        end = start + page_size
        items = queryset[start:end]

        serializer = FavoriteSerializer(items, many=True)
        return success_response({
            'items': serializer.data,
            'total': total,
            'page': page,
            'page_size': page_size,
            'has_more': end < total
        })

    def post(self, request):
        user = get_request_user(request)
        if user is None:
            return error_response('请先登录', status_code=401)
        if user.role != 'buyer':
            return error_response('仅买家可操作', status_code=403)

        product_id = request.data.get('product_id')
        if product_id is None:
            return error_response('product_id 必填', status_code=400)

        product = Product.objects.filter(id=product_id).first()
        if product is None:
            return error_response('商品不存在', status_code=404)

        try:
            favorite, created = Favorite.objects.get_or_create(
                buyer=user,
                product=product
            )
        except IntegrityError:
            favorite = Favorite.objects.get(buyer=user, product=product)
            created = False

        serializer = FavoriteSerializer(favorite)
        status_code = 201 if created else 200
        return success_response(serializer.data, status_code=status_code)


class FavoriteDetailView(APIView):
    def delete(self, request, product_id: int):
        user = get_request_user(request)
        if user is None:
            return error_response('请先登录', status_code=401)
        if user.role != 'buyer':
            return error_response('仅买家可操作', status_code=403)

        favorite = Favorite.objects.filter(buyer=user, product_id=product_id).first()
        if favorite is None:
            return no_content_response()

        favorite.delete()
        return no_content_response()


class FavoriteCheckView(APIView):
    def get(self, request, product_id: int):
        user = get_request_user(request)
        if user is None:
            return error_response('请先登录', status_code=401)
        if user.role != 'buyer':
            return error_response('仅买家可操作', status_code=403)

        is_favorite = Favorite.objects.filter(
            buyer=user,
            product_id=product_id
        ).exists()
        return success_response({'is_favorite': is_favorite})
