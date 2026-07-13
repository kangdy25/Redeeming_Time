from django.conf import settings
from rest_framework.permissions import BasePermission


class IsStaffOrDebug(BasePermission):
    """Keep API documentation available locally but staff-only in production."""

    def has_permission(self, request, view):
        return settings.DEBUG or bool(request.user and request.user.is_staff)
