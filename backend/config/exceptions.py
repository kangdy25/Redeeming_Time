from collections.abc import Mapping, Sequence

from django.http import JsonResponse
from rest_framework.views import exception_handler as drf_exception_handler


def _normalize_errors(value):
    if isinstance(value, Mapping):
        return {key: _normalize_errors(item) for key, item in value.items()}
    if isinstance(value, Sequence) and not isinstance(value, (str, bytes)):
        return [_normalize_errors(item) for item in value]
    return str(value)


def _first_message(value):
    if isinstance(value, Mapping):
        if 'detail' in value:
            return _first_message(value['detail'])
        return next((_first_message(item) for item in value.values()), '요청을 처리하지 못했습니다.')
    if isinstance(value, Sequence) and not isinstance(value, (str, bytes)):
        return _first_message(value[0]) if value else '요청을 처리하지 못했습니다.'
    return str(value)


def api_exception_handler(exc, context):
    response = drf_exception_handler(exc, context)
    if response is None:
        return None

    normalized = _normalize_errors(response.data)
    code = getattr(exc, 'default_code', None) or 'request_failed'
    fields = normalized if isinstance(normalized, dict) and 'detail' not in normalized else None
    response.data = {
        'error': {
            'code': str(code).upper(),
            'message': _first_message(response.data),
            'fields': fields,
        }
    }
    return response


def server_error(request, *args, **kwargs):
    return JsonResponse(
        {
            'error': {
                'code': 'INTERNAL_SERVER_ERROR',
                'message': '서버에서 요청을 처리하지 못했습니다.',
                'fields': None,
            }
        },
        status=500,
    )
