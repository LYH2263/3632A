from rest_framework.response import Response


def success_response(data=None, message='ok', status_code=200):
    return Response({'message': message, 'data': data}, status=status_code)


def error_response(message='error', status_code=400, errors=None):
    payload = {'message': message}
    if errors is not None:
        payload['errors'] = errors
    return Response(payload, status=status_code)
