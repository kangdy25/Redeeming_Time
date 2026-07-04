from rest_framework import permissions


class IsAgentRequest(permissions.BasePermission):
    message = 'Agent-Scoped JWT credentials are required.'

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and getattr(request.user, 'agent_name', None)
        )
