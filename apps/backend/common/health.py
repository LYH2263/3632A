from django.core.cache import cache
from django.db import connection
from rest_framework.views import APIView

from common.response import error_response, success_response


class HealthView(APIView):
    authentication_classes = []

    def get(self, request):
        try:
            connection.ensure_connection()
            cache.set('health-check', 'ok', 5)
            if cache.get('health-check') != 'ok':
                raise RuntimeError('redis unavailable')
            return success_response({'status': 'ok'})
        except Exception as exc:
            return error_response(str(exc), status_code=503)
