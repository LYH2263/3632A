from django.utils import timezone
from rest_framework.views import APIView

from common.auth import get_request_user
from common.response import error_response, success_response
from .models import Message
from .serializers import MessageSerializer


class MessageListView(APIView):
    def get(self, request):
        user = get_request_user(request)
        if user is None:
            return error_response('请先登录', status_code=403)
        if user.role != 'buyer':
            return error_response('仅买家可查看消息', status_code=403)

        page = int(request.query_params.get('page', 1))
        page_size = int(request.query_params.get('page_size', 20))
        if page < 1:
            page = 1
        if page_size < 1 or page_size > 100:
            page_size = 20

        queryset = Message.objects.filter(buyer=user).order_by('-created_at')
        total = queryset.count()
        unread_count = queryset.filter(is_read=False).count()

        start = (page - 1) * page_size
        end = start + page_size
        items = queryset[start:end]

        serializer = MessageSerializer(items, many=True)
        return success_response({
            'items': serializer.data,
            'total': total,
            'unread_count': unread_count,
            'page': page,
            'page_size': page_size,
            'has_more': end < total
        })


class MessageUnreadCountView(APIView):
    def get(self, request):
        user = get_request_user(request)
        if user is None:
            return error_response('请先登录', status_code=403)
        if user.role != 'buyer':
            return error_response('仅买家可查看消息', status_code=403)

        count = Message.objects.filter(buyer=user, is_read=False).count()
        return success_response({'unread_count': count})


class MessageReadView(APIView):
    def patch(self, request, message_id: int):
        user = get_request_user(request)
        if user is None:
            return error_response('请先登录', status_code=403)
        if user.role != 'buyer':
            return error_response('仅买家可操作消息', status_code=403)

        message = Message.objects.filter(id=message_id, buyer=user).first()
        if message is None:
            return error_response('消息不存在', status_code=404)

        message.is_read = True
        message.save(update_fields=['is_read'])
        return success_response(None)


class MessageReadAllView(APIView):
    def post(self, request):
        user = get_request_user(request)
        if user is None:
            return error_response('请先登录', status_code=403)
        if user.role != 'buyer':
            return error_response('仅买家可操作消息', status_code=403)

        Message.objects.filter(buyer=user, is_read=False).update(is_read=True)
        return success_response(None)
