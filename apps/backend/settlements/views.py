from decimal import Decimal
from django.db import transaction
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework import serializers

from common.auth import get_request_user
from common.response import error_response, success_response
from merchants.models import Merchant
from users.models import StoreUser
from .models import SettlementStatement
from .serializers import (
    SettlementStatementSerializer,
    SettlementStatementDetailSerializer,
    SettlementGenerateSerializer
)
from .services import SettlementService


def _is_admin_user(user) -> bool:
    if user is None:
        return False
    if getattr(user, 'username', '') == 'admin':
        return True
    if getattr(user, 'role', '') == 'admin':
        return True
    if getattr(user, 'is_staff', False) or getattr(user, 'is_superuser', False):
        return True
    return False


def require_merchant_permission(request, merchant_id: int):
    user = get_request_user(request)
    if user is None:
        return error_response('请先登录', status_code=403)
    if _is_admin_user(user):
        return None
    if user.role != 'merchant':
        return error_response('仅商家可操作', status_code=403)
    if user.merchant_id != merchant_id:
        return error_response('无权操作该商家对账单', status_code=403)
    return None


def require_admin_permission(request):
    user = get_request_user(request)
    if user is None:
        return error_response('请先登录', status_code=403)
    if not _is_admin_user(user):
        return error_response('仅管理员可操作', status_code=403)
    return None, user


class SettlementStatementListView(APIView):
    def get(self, request):
        merchant_id = request.query_params.get('merchant_id')
        status = request.query_params.get('status')
        year = request.query_params.get('year')
        month = request.query_params.get('month')

        user = get_request_user(request)
        queryset = SettlementStatement.objects.all().order_by('-period_year', '-period_month', '-created_at')

        if user is not None and user.role == 'merchant':
            queryset = queryset.filter(merchant_id=user.merchant_id)
        elif user is not None and _is_admin_user(user):
            pass
        elif user is not None and user.role == 'buyer':
            return error_response('买家无权限查看对账单', status_code=403)
        else:
            return error_response('请先登录', status_code=403)

        if merchant_id:
            try:
                mid = int(merchant_id)
            except (TypeError, ValueError):
                return error_response('merchant_id 非法', status_code=400)

            permission_error = require_merchant_permission(request, mid)
            if permission_error is not None:
                return permission_error
            queryset = queryset.filter(merchant_id=mid)

        if status:
            if status not in ('draft', 'confirmed'):
                return error_response('status 非法', status_code=400)
            queryset = queryset.filter(status=status)

        if year:
            try:
                queryset = queryset.filter(period_year=int(year))
            except (TypeError, ValueError):
                return error_response('year 非法', status_code=400)

        if month:
            try:
                m = int(month)
                if m < 1 or m > 12:
                    return error_response('month 必须在 1-12 之间', status_code=400)
                queryset = queryset.filter(period_month=m)
            except (TypeError, ValueError):
                return error_response('month 非法', status_code=400)

        serializer = SettlementStatementSerializer(queryset, many=True)
        return success_response(serializer.data)


class SettlementStatementDetailView(APIView):
    def get(self, request, statement_id: int):
        statement = SettlementStatement.objects.filter(id=statement_id).first()
        if statement is None:
            return error_response('对账单不存在', status_code=404)

        user = get_request_user(request)
        if user is None:
            return error_response('请先登录', status_code=403)

        if user.role == 'merchant':
            if user.merchant_id != statement.merchant_id:
                return error_response('无权查看该对账单', status_code=403)
        elif user.role == 'buyer':
            return error_response('买家无权限查看对账单', status_code=403)
        else:
            if not _is_admin_user(user):
                return error_response('无权查看该对账单', status_code=403)

        serializer = SettlementStatementDetailSerializer(statement)
        return success_response(serializer.data)


class SettlementStatementConfirmView(APIView):
    @transaction.atomic
    def post(self, request, statement_id: int):
        statement = SettlementStatement.objects.filter(id=statement_id).first()
        if statement is None:
            return error_response('对账单不存在', status_code=404)

        user = get_request_user(request)
        if user is None:
            return error_response('请先登录', status_code=403)

        if user.role == 'merchant':
            if user.merchant_id != statement.merchant_id:
                return error_response('无权确认该对账单', status_code=403)
        else:
            if not _is_admin_user(user):
                return error_response('无权确认该对账单', status_code=403)

        try:
            statement = SettlementService.confirm_statement(statement, user)
        except ValueError as e:
            return error_response(str(e), status_code=400)

        serializer = SettlementStatementDetailSerializer(statement)
        return success_response(serializer.data)


class SettlementGenerateView(APIView):
    @transaction.atomic
    def post(self, request):
        serializer = SettlementGenerateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        user = get_request_user(request)
        if user is None:
            return error_response('请先登录', status_code=403)

        is_admin = _is_admin_user(user)
        year = data['year']
        month = data['month']
        commission_rate = data['commission_rate']

        results = []

        if data['merchant_id'] is not None:
            merchant = Merchant.objects.filter(id=data['merchant_id']).first()
            if merchant is None:
                return error_response('商家不存在', status_code=404)

            if not is_admin:
                permission_error = require_merchant_permission(request, merchant.id)
                if permission_error is not None:
                    return permission_error
            if commission_rate is not None and not is_admin:
                return error_response('仅管理员可自定义佣金率', status_code=403)

            statement, created = SettlementService.generate_statement(
                merchant, year, month, commission_rate
            )
            results.append({
                'merchant_id': merchant.id,
                'merchant_name': merchant.name,
                'statement_id': statement.id,
                'statement_no': statement.statement_no,
                'created': created
            })
        else:
            if not is_admin:
                return error_response('批量生成仅管理员可操作', status_code=403)

            generated = SettlementService.generate_all_merchants(year, month, commission_rate)
            for statement, created in generated:
                results.append({
                    'merchant_id': statement.merchant_id,
                    'merchant_name': statement.merchant.name,
                    'statement_id': statement.id,
                    'statement_no': statement.statement_no,
                    'created': created
                })

        return success_response({'year': year, 'month': month, 'results': results})
