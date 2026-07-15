from django.core.cache import cache
from django.db import DatabaseError, connection
from django.http import JsonResponse
from django.views.decorators.http import require_GET
from redis.exceptions import RedisError


@require_GET
def healthz(request):
    """Liveness endpoint used by Render without waking a serverless database."""

    return JsonResponse({'status': 'ok'})


@require_GET
def readyz(request):
    """Readiness endpoint for explicit database and cache verification."""

    try:
        with connection.cursor() as cursor:
            cursor.execute('SELECT 1')
            cursor.fetchone()
        cache.get('healthz')
    except (DatabaseError, RedisError, OSError):
        return JsonResponse({'status': 'unavailable'}, status=503)
    return JsonResponse({'status': 'ok'})
