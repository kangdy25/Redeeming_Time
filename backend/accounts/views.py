from django.db import transaction
from drf_spectacular.utils import extend_schema
from rest_framework import permissions, status, viewsets
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle, ScopedRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken, OutstandingToken
from rest_framework_simplejwt.views import TokenBlacklistView, TokenObtainPairView, TokenRefreshView

from planner.models import CalendarMember

from .models import User
from .serializers import PasswordChangeSerializer, UserSerializer


class LoginView(TokenObtainPairView):
    throttle_scope = 'login'
    throttle_classes = [AnonRateThrottle, ScopedRateThrottle]


class TokenRefreshWithThrottleView(TokenRefreshView):
    throttle_scope = 'token_refresh'
    throttle_classes = [AnonRateThrottle, ScopedRateThrottle]


class LogoutView(TokenBlacklistView):
    permission_classes = [permissions.IsAuthenticated]
    throttle_scope = 'logout'
    throttle_classes = [ScopedRateThrottle]


class PasswordChangeView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    throttle_scope = 'password_change'
    throttle_classes = [ScopedRateThrottle]

    @extend_schema(request=PasswordChangeSerializer, responses={204: None})
    def post(self, request):
        serializer = PasswordChangeSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)

        with transaction.atomic():
            request.user.set_password(serializer.validated_data['new_password'])
            request.user.save(update_fields=['password', 'updated_at'])
            for token in OutstandingToken.objects.filter(user=request.user):
                BlacklistedToken.objects.get_or_create(token=token)

        return Response(status=status.HTTP_204_NO_CONTENT)


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]
    throttle_scope = 'registration'

    def get_queryset(self):
        if self.request.user.is_staff:
            return User.objects.all()
        return User.objects.filter(id=self.request.user.id)

    def get_permissions(self):
        if self.action == 'create':
            return [permissions.AllowAny()]
        return super().get_permissions()

    def get_throttles(self):
        if self.action == 'create':
            return [AnonRateThrottle(), ScopedRateThrottle()]
        return super().get_throttles()

    def perform_destroy(self, instance):
        sole_owned_memberships = CalendarMember.objects.filter(
            user=instance,
            role=CalendarMember.Role.OWNER,
        ).select_related('calendar')
        calendars_to_delete = []

        for membership in sole_owned_memberships:
            other_members_exist = CalendarMember.objects.filter(
                calendar=membership.calendar,
            ).exclude(user=instance).exists()
            another_owner_exists = CalendarMember.objects.filter(
                calendar=membership.calendar,
                role=CalendarMember.Role.OWNER,
            ).exclude(user=instance).exists()
            if other_members_exist and not another_owner_exists:
                raise ValidationError(
                    {
                        'detail': (
                            'Transfer ownership of shared calendars before deleting your account.'
                        )
                    },
                )
            if not other_members_exist:
                calendars_to_delete.append(membership.calendar)

        with transaction.atomic():
            for calendar in calendars_to_delete:
                calendar.delete()
            instance.delete()
