from users.models import StoreUser


def parse_bearer_token(authorization: str | None) -> str | None:
    if not authorization:
        return None

    if not authorization.startswith('Bearer '):
        return None

    token = authorization.split(' ', 1)[1].strip()
    if not token:
        return None
    return token


def get_user_by_token(token: str | None) -> StoreUser | None:
    if not token:
        return None

    prefix = 'django-token-'
    if not token.startswith(prefix):
        return None

    user_id_raw = token[len(prefix):]
    if not user_id_raw.isdigit():
        return None

    return StoreUser.objects.filter(id=int(user_id_raw)).first()


def get_request_user(request) -> StoreUser | None:
    token = parse_bearer_token(request.headers.get('Authorization'))
    return get_user_by_token(token)
