from rest_framework.response import Response
from rest_framework import status


def success_response(data=None, message='ok', status_code=200):
    return Response({'message': message, 'data': data}, status=status_code)


def no_content_response():
    return Response(status=status.HTTP_204_NO_CONTENT)


def error_response(message='error', status_code=400, errors=None):
    payload = {'message': message}
    if errors is not None:
        payload['errors'] = errors
    return Response(payload, status=status_code)
