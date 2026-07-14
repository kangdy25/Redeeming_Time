from django.db import transaction
from django.http import HttpResponseRedirect
from drf_spectacular.utils import extend_schema
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import APIException, NotFound, Throttled, ValidationError
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle, ScopedRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken, OutstandingToken
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenBlacklistView, TokenObtainPairView, TokenRefreshView

from planner.models import CalendarMember

from .models import User
from .serializers import (
    PasswordChangeSerializer,
    SocialHandoffCodeSerializer,
    SocialTokenPairSerializer,
    UserSerializer,
)
from .social import (
    InactiveSocialAccount,
    InvalidOAuthState,
    SocialAuthConfigurationError,
    SocialAuthenticationError,
    SocialAuthorizationDenied,
    SocialIdentityCollision,
    build_authorization_url,
    consume_handoff_code,
    consume_oauth_state,
    create_handoff_code,
    frontend_callback_error_url,
    frontend_callback_url,
    get_callback_url,
    get_social_provider,
    resolve_social_user,
)


class LoginView(TokenObtainPairView):
    throttle_scope = 'login'
    throttle_classes = [AnonRateThrottle, ScopedRateThrottle]


class TokenRefreshWithThrottleView(TokenRefreshView):
    throttle_scope = 'token_refresh'
    throttle_classes = [AnonRateThrottle, ScopedRateThrottle]


class SocialAuthBrowserRedirectView(APIView):
    """Keep browser-facing OAuth errors on the fixed frontend callback route."""

    @staticmethod
    def _redirect(url: str) -> HttpResponseRedirect:
        response = HttpResponseRedirect(url)
        # The URL contains either a CSRF state or a short-lived handoff code.
        # Keep it out of navigation caches and downstream Referer headers.
        response['Cache-Control'] = 'no-store'
        response['Referrer-Policy'] = 'no-referrer'
        return response

    @staticmethod
    def _safe_error_code(exc: APIException) -> str:
        if isinstance(exc, Throttled):
            return 'RATE_LIMITED'
        if isinstance(exc, SocialAuthorizationDenied):
            return 'ACCESS_DENIED'
        if isinstance(exc, InvalidOAuthState):
            return 'INVALID_STATE'
        if isinstance(exc, (SocialAuthConfigurationError, NotFound)):
            return 'PROVIDER_UNAVAILABLE'
        if isinstance(exc, SocialIdentityCollision):
            return 'ACCOUNT_CONFLICT'
        if isinstance(exc, InactiveSocialAccount):
            return 'ACCOUNT_DISABLED'
        return 'OAUTH_FAILED'

    def handle_exception(self, exc):
        if isinstance(exc, APIException):
            return self._redirect(frontend_callback_error_url(self._safe_error_code(exc)))
        return super().handle_exception(exc)


class SocialAuthStartView(SocialAuthBrowserRedirectView):
    """Begin a provider redirect after binding a random state to this session."""

    authentication_classes = []
    permission_classes = [permissions.AllowAny]
    throttle_scope = 'social_auth_start'
    throttle_classes = [AnonRateThrottle, ScopedRateThrottle]

    @extend_schema(responses={302: None})
    def get(self, request, provider):
        return self._redirect(
            build_authorization_url(request, provider, request.query_params.get('handoff_verifier')),
        )


class SocialAuthCallbackView(SocialAuthBrowserRedirectView):
    """Complete a provider callback without ever putting JWTs in the redirect URL."""

    authentication_classes = []
    permission_classes = [permissions.AllowAny]
    throttle_scope = 'social_auth_callback'
    throttle_classes = [AnonRateThrottle, ScopedRateThrottle]

    @extend_schema(responses={302: None})
    def get(self, request, provider):
        social_provider = get_social_provider(provider)
        handoff_verifier_digest = consume_oauth_state(
            request,
            social_provider.name,
            request.query_params.get('state'),
        )

        if request.query_params.get('error'):
            # The provider may send a descriptive error string. Do not reflect it
            # back to the browser or logs because it is outside our trust boundary.
            raise SocialAuthorizationDenied()

        authorization_code = request.query_params.get('code')
        if not isinstance(authorization_code, str) or not authorization_code:
            raise SocialAuthenticationError()

        profile = social_provider.fetch_profile(
            code=authorization_code,
            redirect_uri=get_callback_url(request, social_provider.name),
        )
        user = resolve_social_user(profile)
        handoff_code = create_handoff_code(user, handoff_verifier_digest)
        return self._redirect(frontend_callback_url(handoff_code))


class SocialAuthExchangeView(APIView):
    """Exchange one opaque callback code for a normal SimpleJWT token pair."""

    authentication_classes = []
    permission_classes = [permissions.AllowAny]
    throttle_scope = 'social_auth_exchange'
    throttle_classes = [AnonRateThrottle, ScopedRateThrottle]

    @extend_schema(request=SocialHandoffCodeSerializer, responses={200: SocialTokenPairSerializer})
    def post(self, request):
        serializer = SocialHandoffCodeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = consume_handoff_code(
            serializer.validated_data['code'],
            serializer.validated_data['verifier'],
        )
        refresh = RefreshToken.for_user(user)
        response = Response({'access': str(refresh.access_token), 'refresh': str(refresh)})
        response['Cache-Control'] = 'no-store'
        response['Pragma'] = 'no-cache'
        return response


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

    @action(detail=False, methods=['get'], url_path='me')
    def me(self, request):
        """Return the authenticated account without relying on a list response."""

        return Response(self.get_serializer(request.user).data)

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
