import json
import logging
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from django.conf import settings
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import send_mail
from django.db import transaction
from django.http import HttpResponseRedirect
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
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
    EmailVerificationConfirmSerializer,
    EmailVerificationRequestSerializer,
    EmailVerifiedTokenObtainPairSerializer,
    PasswordChangeSerializer,
    PasswordResetConfirmSerializer,
    PasswordResetRequestSerializer,
    SocialHandoffCodeSerializer,
    SocialTokenPairSerializer,
    UserSerializer,
)
from .email_verification import make_email_verification_token


logger = logging.getLogger(__name__)


class PasswordResetDeliveryUnavailable(APIException):
    status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    default_detail = 'Password reset email is not configured.'
    default_code = 'password_reset_unavailable'


class EmailVerificationUnavailable(APIException):
    status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    default_detail = 'Email verification is not configured.'
    default_code = 'email_verification_unavailable'


class EmailDeliveryError(RuntimeError):
    """Raised when the configured transactional email provider rejects a message."""


def _email_delivery_is_configured() -> bool:
    return settings.EMAIL_DELIVERY_PROVIDER == 'django' or bool(settings.RESEND_API_KEY)


def _send_resend_email(*, subject: str, message: str, recipient: str) -> None:
    if not settings.RESEND_API_KEY:
        raise EmailDeliveryError('RESEND_API_KEY is not configured.')

    payload = json.dumps(
        {
            'from': settings.DEFAULT_FROM_EMAIL,
            'to': [recipient],
            'subject': subject,
            'text': message,
        },
    ).encode('utf-8')
    request = Request(
        f'{settings.RESEND_API_BASE_URL}/emails',
        data=payload,
        headers={
            'Authorization': f'Bearer {settings.RESEND_API_KEY}',
            'Content-Type': 'application/json',
            'User-Agent': 'Redeeming-Time/1.0',
        },
        method='POST',
    )
    try:
        with urlopen(request, timeout=settings.RESEND_API_TIMEOUT):
            return
    except HTTPError as exc:
        detail = exc.read().decode('utf-8', errors='replace')[:500]
        raise EmailDeliveryError(f'Resend API rejected the email ({exc.code}): {detail}') from exc
    except (URLError, TimeoutError) as exc:
        reason = getattr(exc, 'reason', exc)
        raise EmailDeliveryError(f'Resend API connection failed: {reason}') from exc


def _deliver_email(*, subject: str, message: str, recipient: str) -> None:
    if settings.EMAIL_DELIVERY_PROVIDER == 'resend':
        _send_resend_email(subject=subject, message=message, recipient=recipient)
        return
    send_mail(
        subject=subject,
        message=message,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[recipient],
        fail_silently=False,
    )


def _password_reset_url(user: User) -> str:
    query = urlencode(
        {
            'uid': urlsafe_base64_encode(force_bytes(user.pk)),
            'token': default_token_generator.make_token(user),
        },
    )
    return f'{settings.FRONTEND_ORIGIN}/password-reset?{query}'


def _send_password_reset_email(user: User) -> None:
    reset_url = _password_reset_url(user)
    _deliver_email(
        subject='Redeeming Time 비밀번호 재설정',
        message=(
            '비밀번호 재설정을 요청하셨습니다. 아래 링크에서 새 비밀번호를 설정해 주세요.\n\n'
            f'{reset_url}\n\n'
            f'이 링크는 {settings.PASSWORD_RESET_TIMEOUT // 60}분 동안만 유효합니다. '
            '요청하지 않으셨다면 이 메일을 무시해 주세요.'
        ),
        recipient=user.email,
    )


def _email_verification_url(user: User) -> str:
    return f'{settings.FRONTEND_ORIGIN}/verify-email?{urlencode({"token": make_email_verification_token(user)})}'


def _send_email_verification_email(user: User) -> None:
    verification_url = _email_verification_url(user)
    _deliver_email(
        subject='Redeeming Time 이메일 인증',
        message=(
            'Redeeming Time 가입을 완료하려면 아래 링크에서 이메일을 인증해 주세요.\n\n'
            f'{verification_url}\n\n'
            f'이 링크는 {settings.EMAIL_VERIFICATION_TIMEOUT // 3600}시간 동안만 유효합니다. '
            '직접 가입하지 않으셨다면 이 메일을 무시해 주세요.'
        ),
        recipient=user.email,
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
    serializer_class = EmailVerifiedTokenObtainPairSerializer
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


class PasswordResetRequestView(APIView):
    """Email an opaque, one-time reset link without revealing account existence."""

    authentication_classes = []
    permission_classes = [permissions.AllowAny]
    throttle_scope = 'password_reset_request'
    throttle_classes = [AnonRateThrottle, ScopedRateThrottle]

    @extend_schema(request=PasswordResetRequestSerializer, responses={204: None})
    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        if not settings.PASSWORD_RESET_EMAIL_ENABLED or not _email_delivery_is_configured():
            raise PasswordResetDeliveryUnavailable()

        user = (
            User.objects.filter(email__iexact=serializer.validated_data['email'])
            .filter(is_active=True)
            .first()
        )
        if user is not None and user.has_usable_password():
            try:
                _send_password_reset_email(user)
            except Exception:
                # Keep the response identical for existing and unknown emails.
                # Operators can use the server log to diagnose email delivery.
                logger.exception('Unable to send password reset email.')

        return Response(status=status.HTTP_204_NO_CONTENT)


class PasswordResetConfirmView(APIView):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]
    throttle_scope = 'password_reset_confirm'
    throttle_classes = [AnonRateThrottle, ScopedRateThrottle]

    @extend_schema(request=PasswordResetConfirmSerializer, responses={204: None})
    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']

        with transaction.atomic():
            user.set_password(serializer.validated_data['new_password'])
            user.save(update_fields=['password', 'updated_at'])
            for token in OutstandingToken.objects.filter(user=user):
                BlacklistedToken.objects.get_or_create(token=token)

        return Response(status=status.HTTP_204_NO_CONTENT)


class EmailVerificationRequestView(APIView):
    """Resend verification mail without revealing whether the address exists."""

    authentication_classes = []
    permission_classes = [permissions.AllowAny]
    throttle_scope = 'email_verification_request'
    throttle_classes = [AnonRateThrottle, ScopedRateThrottle]

    @extend_schema(request=EmailVerificationRequestSerializer, responses={204: None})
    def post(self, request):
        serializer = EmailVerificationRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        if not settings.EMAIL_VERIFICATION_ENABLED or not _email_delivery_is_configured():
            raise EmailVerificationUnavailable()

        user = (
            User.objects.filter(email__iexact=serializer.validated_data['email'])
            .filter(is_active=True, social_provider=User.SocialProvider.LOCAL, email_verified=False)
            .first()
        )
        if user is not None:
            try:
                _send_email_verification_email(user)
            except Exception:
                logger.exception('Unable to send email verification message.')

        return Response(status=status.HTTP_204_NO_CONTENT)


class EmailVerificationConfirmView(APIView):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]
    throttle_scope = 'email_verification_confirm'
    throttle_classes = [AnonRateThrottle, ScopedRateThrottle]

    @extend_schema(request=EmailVerificationConfirmSerializer, responses={204: None})
    def post(self, request):
        serializer = EmailVerificationConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']
        user.email_verified = True
        user.save(update_fields=['email_verified', 'updated_at'])
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

    def perform_create(self, serializer):
        if not settings.EMAIL_VERIFICATION_ENABLED or not _email_delivery_is_configured():
            raise EmailVerificationUnavailable()

        user = serializer.save()
        try:
            _send_email_verification_email(user)
        except Exception:
            logger.exception('Unable to send initial email verification message.')

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
