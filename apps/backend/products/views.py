from django.core.cache import cache
from django.core.paginator import Paginator
from django.db.models import Count
from rest_framework.views import APIView

from common.auth import get_request_user
from common.response import error_response, success_response
from merchants.models import Merchant
from .models import Category, Product, StockLedger
from .serializers import CategorySerializer, ProductSerializer, StockLedgerSerializer


def require_merchant_permission(request, merchant_id: int):
    user = get_request_user(request)
    if user is None:
        return error_response('请先登录', status_code=403)
    if user.role != 'merchant':
        return error_response('仅商家可操作', status_code=403)
    if user.merchant_id != merchant_id:
        return error_response('无权操作该商家数据', status_code=403)
    return None


def build_product_cache_key(merchant_id: str, keyword: str, category_id: str) -> str:
    merchant_part = merchant_id or 'all'
    keyword_part = keyword or '_'
    category_part = category_id or '_'
    return f'product:list:{merchant_part}:{keyword_part}:{category_part}'


def clear_product_related_cache():
    cache.delete_pattern('product:list:*')


def get_category_cache_key(merchant_id: str) -> str:
    return f'category:list:{merchant_id or "all"}'


class CategoryListView(APIView):
    def get(self, request):
        merchant_id = request.query_params.get('merchant_id')
        cache_key = get_category_cache_key(str(merchant_id or ''))

        cached = cache.get(cache_key)
        if cached is not None:
            return success_response(cached)

        queryset = Category.objects.all().annotate(product_count=Count('products'))
        if merchant_id:
            queryset = queryset.filter(merchant_id=merchant_id)

        serializer = CategorySerializer(queryset, many=True)
        cache.set(cache_key, serializer.data, 300)
        return success_response(serializer.data)

    def post(self, request):
        payload = request.data.copy()
        merchant_id = payload.get('merchant_id')
        if merchant_id is None:
            return error_response('merchant_id 必填', status_code=400)

        merchant = Merchant.objects.filter(id=merchant_id).first()
        if merchant is None:
            return error_response('商家不存在', status_code=404)

        permission_error = require_merchant_permission(request, merchant.id)
        if permission_error is not None:
            return permission_error

        if Category.objects.filter(merchant_id=merchant.id, name=payload.get('name', '').strip()).exists():
            return error_response('分类名称已存在', status_code=400)

        payload['merchant'] = merchant.id
        serializer = CategorySerializer(data=payload)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        cache.delete(get_category_cache_key(str(merchant.id)))
        return success_response(serializer.data, status_code=201)


class CategoryDetailView(APIView):
    def get(self, request, category_id: int):
        category = Category.objects.filter(id=category_id).first()
        if category is None:
            return error_response('分类不存在', status_code=404)
        serializer = CategorySerializer(category)
        return success_response(serializer.data)

    def patch(self, request, category_id: int):
        category = Category.objects.filter(id=category_id).first()
        if category is None:
            return error_response('分类不存在', status_code=404)

        permission_error = require_merchant_permission(request, category.merchant_id)
        if permission_error is not None:
            return permission_error

        payload = request.data.copy()
        if 'merchant_id' in payload:
            if payload['merchant_id'] != category.merchant_id:
                return error_response('不允许变更所属商家', status_code=400)
            payload['merchant'] = category.merchant_id

        new_name = payload.get('name', '').strip()
        if new_name and new_name != category.name:
            if Category.objects.filter(merchant_id=category.merchant_id, name=new_name).exclude(id=category_id).exists():
                return error_response('分类名称已存在', status_code=400)

        serializer = CategorySerializer(category, data=payload, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        cache.delete(get_category_cache_key(str(category.merchant_id)))
        clear_product_related_cache()
        return success_response(serializer.data)

    def delete(self, request, category_id: int):
        category = Category.objects.filter(id=category_id).first()
        if category is None:
            return error_response('分类不存在', status_code=404)

        permission_error = require_merchant_permission(request, category.merchant_id)
        if permission_error is not None:
            return permission_error

        product_count = Product.objects.filter(category_id=category_id).count()
        if product_count > 0:
            return error_response(
                f'该分类下有 {product_count} 个商品，请先迁移或删除商品后再删除分类',
                status_code=400
            )

        merchant_id = category.merchant_id
        category.delete()

        cache.delete(get_category_cache_key(str(merchant_id)))
        clear_product_related_cache()
        return success_response(None, status_code=204)


class ProductListView(APIView):
    def get(self, request):
        merchant_id = request.query_params.get('merchant_id')
        keyword = request.query_params.get('keyword', '').strip()
        category_id = request.query_params.get('category_id')
        cache_key = build_product_cache_key(
            str(merchant_id or ''), keyword, str(category_id or ''))

        cached = cache.get(cache_key)
        if cached is not None:
            return success_response(cached)

        queryset = Product.objects.all().order_by('id')
        if merchant_id:
            queryset = queryset.filter(merchant_id=merchant_id)
        if keyword:
            queryset = queryset.filter(name__icontains=keyword)
        if category_id:
            queryset = queryset.filter(category_id=category_id)

        serializer = ProductSerializer(queryset, many=True, context={'request': request})
        cache.set(cache_key, serializer.data, 60)
        return success_response(serializer.data)

    def post(self, request):
        payload = request.data.copy()
        merchant_id = payload.get('merchant_id')
        category_id = payload.get('category_id')

        if merchant_id is None:
            return error_response('merchant_id 必填', status_code=400)
        if category_id is None:
            return error_response('category_id 必填', status_code=400)

        merchant = Merchant.objects.filter(id=merchant_id).first()
        if merchant is None:
            return error_response('商家不存在', status_code=404)

        category = Category.objects.filter(id=category_id, merchant_id=merchant_id).first()
        if category is None:
            return error_response('分类不存在或不属于该商家', status_code=400)

        permission_error = require_merchant_permission(request, merchant.id)
        if permission_error is not None:
            return permission_error

        payload['merchant'] = merchant.id
        payload['category'] = category.id
        serializer = ProductSerializer(data=payload, context={'request': request})
        serializer.is_valid(raise_exception=True)
        serializer.save()

        clear_product_related_cache()

        return success_response(serializer.data, status_code=201)


class ProductDetailView(APIView):
    def get(self, request, product_id: int):
        product = Product.objects.filter(id=product_id).first()
        if product is None:
            return success_response(None)
        serializer = ProductSerializer(product, context={'request': request})
        return success_response(serializer.data)

    def patch(self, request, product_id: int):
        product = Product.objects.filter(id=product_id).first()
        if product is None:
            return error_response('商品不存在', status_code=404)

        payload = request.data.copy()
        target_merchant_id = product.merchant_id
        if 'merchant_id' in payload:
            merchant = Merchant.objects.filter(id=payload.get('merchant_id')).first()
            if merchant is None:
                return error_response('商家不存在', status_code=404)
            if merchant.id != product.merchant_id:
                return error_response('不允许变更所属商家', status_code=400)
            payload['merchant'] = merchant.id
            target_merchant_id = merchant.id

        if 'category_id' in payload:
            category = Category.objects.filter(
                id=payload['category_id'],
                merchant_id=target_merchant_id
            ).first()
            if category is None:
                return error_response('分类不存在或不属于该商家', status_code=400)
            payload['category'] = category.id

        permission_error = require_merchant_permission(request, target_merchant_id)
        if permission_error is not None:
            return permission_error

        user = get_request_user(request)
        new_stock = payload.get('stock', None)
        stock_changed = False
        if new_stock is not None:
            try:
                new_stock_val = int(new_stock)
            except (TypeError, ValueError):
                return error_response('stock 必须是整数', status_code=400)
            if new_stock_val != product.stock:
                if product.stock == -1 or new_stock_val == -1:
                    product.adjust_stock(
                        quantity=0,
                        reason=StockLedger.REASON_MERCHANT_ADJUST,
                        operator=user,
                        remark=f'库存模式变更：{"不限" if product.stock == -1 else product.stock} → {"不限" if new_stock_val == -1 else new_stock_val}',
                        allow_negative=True,
                        target_stock=new_stock_val
                    )
                else:
                    change_qty = new_stock_val - product.stock
                    product.adjust_stock(
                        quantity=change_qty,
                        reason=StockLedger.REASON_MERCHANT_ADJUST,
                        operator=user,
                        remark=f'商家调整库存：{product.stock} → {new_stock_val}',
                        allow_negative=True
                    )
                stock_changed = True

        if stock_changed:
            payload.pop('stock', None)

        serializer = ProductSerializer(product, data=payload, partial=True, context={'request': request})
        serializer.is_valid(raise_exception=True)
        serializer.save()

        clear_product_related_cache()
        return success_response(serializer.data)


class LowStockAlertView(APIView):
    def get(self, request):
        user = get_request_user(request)
        if user is None:
            return error_response('请先登录', status_code=403)
        if user.role != 'merchant':
            return error_response('仅商家可操作', status_code=403)

        merchant_id = user.merchant_id
        merchant = Merchant.objects.filter(id=merchant_id).first()
        if merchant is None:
            return error_response('商家不存在', status_code=404)

        threshold = merchant.low_stock_threshold
        low_stock_products = Product.objects.filter(
            merchant_id=merchant_id,
            stock__lte=threshold
        ).exclude(stock=-1).order_by('stock')

        serializer = ProductSerializer(low_stock_products, many=True, context={'request': request})
        return success_response({
            'threshold': threshold,
            'low_stock_count': low_stock_products.count(),
            'products': serializer.data
        })


class ProductBatchToggleView(APIView):
    def post(self, request):
        user = get_request_user(request)
        if user is None:
            return error_response('请先登录', status_code=403)
        if user.role != 'merchant':
            return error_response('仅商家可操作', status_code=403)

        merchant_id = user.merchant_id
        merchant = Merchant.objects.filter(id=merchant_id).first()
        if merchant is None:
            return error_response('商家不存在', status_code=404)

        product_ids = request.data.get('product_ids', [])
        is_active = request.data.get('is_active')
        set_stock_zero = request.data.get('set_stock_zero', False)

        if is_active is None:
            return error_response('is_active 必填', status_code=400)
        if not product_ids:
            return error_response('product_ids 不能为空', status_code=400)

        try:
            is_active_val = bool(is_active)
        except (TypeError, ValueError):
            return error_response('is_active 必须是布尔值', status_code=400)

        products = Product.objects.filter(
            id__in=product_ids,
            merchant_id=merchant_id
        )
        updated_count = 0
        for product in products:
            old_active = product.is_active
            product.is_active = is_active_val
            update_fields = ['is_active']

            if set_stock_zero and not is_active_val and product.stock != -1 and product.stock != 0:
                    product.adjust_stock(
                        quantity=-product.stock,
                        reason=StockLedger.REASON_BATCH_TOGGLE,
                        operator=user,
                        remark='批量下架，库存清零',
                        allow_negative=True
                    )
                    update_fields = []
            elif set_stock_zero and is_active_val and product.stock == 0 and getattr(product, '_original_stock', None):
                    pass

            if old_active != is_active_val:
                product.save(update_fields=update_fields) if update_fields else None
                updated_count += 1

        clear_product_related_cache()
        return success_response({
            'updated_count': updated_count,
            'is_active': is_active_val
        })


class StockLedgerListView(APIView):
    def get(self, request):
        user = get_request_user(request)
        if user is None:
            return error_response('请先登录', status_code=403)
        if user.role != 'merchant':
            return error_response('仅商家可查看', status_code=403)

        merchant_id = user.merchant_id

        product_id = request.query_params.get('product_id')
        reason = request.query_params.get('reason')
        date_start = request.query_params.get('date_start')
        date_end = request.query_params.get('date_end')
        page = int(request.query_params.get('page', 1))
        page_size = int(request.query_params.get('page_size', 20))

        queryset = StockLedger.objects.filter(merchant_id=merchant_id)

        if product_id:
            try:
                product_id_val = int(product_id)
                product = Product.objects.filter(id=product_id_val, merchant_id=merchant_id).first()
                if product is None:
                    return error_response('商品不存在或不属于该商家', status_code=404)
                queryset = queryset.filter(product_id=product_id_val)
            except (TypeError, ValueError):
                return error_response('product_id 非法', status_code=400)

        if reason:
            queryset = queryset.filter(reason=reason)

        if date_start:
            queryset = queryset.filter(created_at__gte=date_start)

        if date_end:
            queryset = queryset.filter(created_at__lte=date_end + 'T23:59:59' if len(date_end) == 10 else date_end)

        paginator = Paginator(queryset, page_size)
        page_obj = paginator.get_page(page)

        serializer = StockLedgerSerializer(page_obj.object_list, many=True)
        return success_response({
            'items': serializer.data,
            'total': paginator.count,
            'page': page_obj.number,
            'page_size': page_size,
            'total_pages': paginator.num_pages,
            'has_next': page_obj.has_next(),
            'has_previous': page_obj.has_previous(),
            'reason_choices': [
                {'value': k, 'label': v} for k, v in StockLedger.REASON_CHOICES
            ]
        })
