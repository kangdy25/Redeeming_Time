"""Server-side OAuth helpers for the supported social identity providers."""

from __future__ import annotations

import hashlib
import json
import re
import secrets
import time
from dataclasses import dataclass
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode, urlparse
from urllib.request import Request, urlopen

from django.conf import settings
from django.core.cache import cache
from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.validators import validate_email
from django.db import IntegrityError, transaction
from django.urls import reverse
from rest_framework.exceptions import APIException, NotFound, PermissionDenied

from .models import User


GOOGLE_AUTHORIZATION_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
KAKAO_AUTHORIZATION_URL = 'https://kauth.kakao.com/oauth/authorize'
KAKAO_TOKEN_URL = 'https://kauth.kakao.com/oauth/token'
KAKAO_USER_INFO_URL = 'https://kapi.kakao.com/v2/user/me'
GOOGLE_ISSUERS = {'accounts.google.com', 'https://accounts.google.com'}

_STATE_SESSION_KEY = 'social_auth_states'
_HANDOFF_CACHE_PREFIX = 'social-auth:handoff:'
_HANDOFF_USED_SUFFIX = ':used'
_HANDOFF_VERIFIER_PATTERN = re.compile(r'[A-Za-z0-9_-]{43,128}')


class SocialAuthenticationError(APIException):
    status_code = 400
    default_detail = 'Unable to complete social sign-in.'
    default_code = 'social_authentication_failed'


class InvalidOAuthState(SocialAuthenticationError):
    default_detail = 'The social sign-in state is invalid or has expired.'
    default_code = 'invalid_oauth_state'


class SocialAuthorizationDenied(SocialAuthenticationError):
    default_detail = 'Social sign-in was not approved.'
    default_code = 'social_authorization_denied'


class SocialAuthConfigurationError(APIException):
    status_code = 503
    default_detail = 'Social sign-in is not configured.'
    default_code = 'social_authentication_unavailable'


class SocialIdentityCollision(APIException):
    status_code = 409
    default_detail = 'An account already exists with this email. Sign in with its original method.'
    default_code = 'social_identity_collision'


class InvalidSocialHandoffCode(APIException):
    status_code = 400
    default_detail = 'This sign-in code is invalid or has expired.'
    default_code = 'invalid_social_handoff_code'


class InactiveSocialAccount(PermissionDenied):
    default_detail = 'This account is inactive.'
    default_code = 'inactive_social_account'


@dataclass(frozen=True)
class SocialProfile:
    provider: str
    subject: str
    email: str
    nickname: str
    profile_image_url: str


def _required_setting(name: str) -> str:
    value = getattr(settings, name, '')
    if not isinstance(value, str) or not value.strip():
        raise SocialAuthConfigurationError()
    return value.strip()


def _handoff_verifier_digest(value: Any, error_type: type[APIException]) -> str:
    if not isinstance(value, str) or not _HANDOFF_VERIFIER_PATTERN.fullmatch(value):
        raise error_type()
    return hashlib.sha256(value.encode('utf-8')).hexdigest()


def get_callback_url(request, provider: str) -> str:
    configured_url = getattr(settings, f'SOCIAL_AUTH_{provider.upper()}_REDIRECT_URI', '')
    if isinstance(configured_url, str) and configured_url.strip():
        return configured_url.strip()
    if not settings.DEBUG:
        # Production providers require an exact, pre-registered callback URL.
        # Deriving one from an incoming host header is convenient locally, but
        # it makes the deployed OAuth boundary harder to audit.
        raise SocialAuthConfigurationError()
    return request.build_absolute_uri(
        reverse('social_auth_callback', kwargs={'provider': provider}),
    )


def _required_subject(value: Any) -> str:
    if not isinstance(value, (str, int)):
        raise SocialAuthenticationError()
    subject = str(value).strip()
    if not subject or len(subject) > 255:
        raise SocialAuthenticationError()
    return subject


def _verified_email(value: Any) -> str:
    if not isinstance(value, str):
        raise SocialAuthenticationError()
    email = User.objects.normalize_email(value.strip())
    if not email or len(email) > 254:
        raise SocialAuthenticationError()
    try:
        validate_email(email)
    except DjangoValidationError as exc:
        raise SocialAuthenticationError() from exc
    return email


def _nickname(value: Any, email: str) -> str:
    candidate = value.strip() if isinstance(value, str) else ''
    candidate = candidate[:150]
    return candidate or email.split('@', maxsplit=1)[0][:150] or 'Planner'


def _profile_image_url(value: Any) -> str:
    if not isinstance(value, str) or len(value) > 200:
        return ''
    parsed = urlparse(value)
    if parsed.scheme not in {'http', 'https'} or not parsed.netloc:
        return ''
    return value


def _request_json(request: Request) -> dict[str, Any]:
    try:
        with urlopen(request, timeout=settings.SOCIAL_AUTH_HTTP_TIMEOUT_SECONDS) as response:
            payload = response.read().decode('utf-8')
        result = json.loads(payload)
    except (HTTPError, URLError, OSError, TimeoutError, UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise SocialAuthenticationError() from exc

    if not isinstance(result, dict):
        raise SocialAuthenticationError()
    return result


def _post_form_json(url: str, data: dict[str, str]) -> dict[str, Any]:
    request = Request(
        url,
        data=urlencode(data).encode('utf-8'),
        headers={
            'Accept': 'application/json',
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        method='POST',
    )
    return _request_json(request)


def _get_json(url: str, headers: dict[str, str]) -> dict[str, Any]:
    request = Request(url, headers={'Accept': 'application/json', **headers}, method='GET')
    return _request_json(request)


def verify_google_id_token(raw_id_token: str, audience: str) -> dict[str, Any]:
    """Verify Google signature, audience, issuer, and expiry with google-auth."""

    try:
        from google.auth.transport.requests import Request as GoogleRequest
        from google.oauth2 import id_token as google_id_token
    except ImportError as exc:
        raise SocialAuthConfigurationError() from exc

    try:
        claims = google_id_token.verify_oauth2_token(
            raw_id_token,
            GoogleRequest(),
            audience=audience,
        )
    except Exception as exc:  # google-auth intentionally owns the verification error hierarchy.
        raise SocialAuthenticationError() from exc

    if not isinstance(claims, dict):
        raise SocialAuthenticationError()
    return claims


class BaseSocialProvider:
    name: str
    authorization_url: str
    client_id_setting: str
    client_secret_setting: str

    @property
    def client_id(self) -> str:
        return _required_setting(self.client_id_setting)

    @property
    def client_secret(self) -> str:
        return _required_setting(self.client_secret_setting)

    def authorize_url(self, *, state: str, redirect_uri: str) -> str:
        raise NotImplementedError

    def fetch_profile(self, *, code: str, redirect_uri: str) -> SocialProfile:
        raise NotImplementedError


class GoogleSocialProvider(BaseSocialProvider):
    name = 'google'
    authorization_url = GOOGLE_AUTHORIZATION_URL
    client_id_setting = 'SOCIAL_AUTH_GOOGLE_CLIENT_ID'
    client_secret_setting = 'SOCIAL_AUTH_GOOGLE_CLIENT_SECRET'

    def authorize_url(self, *, state: str, redirect_uri: str) -> str:
        query = urlencode(
            {
                'client_id': self.client_id,
                'redirect_uri': redirect_uri,
                'response_type': 'code',
                'scope': 'openid email profile',
                'state': state,
                'prompt': 'select_account',
            },
        )
        return f'{self.authorization_url}?{query}'

    def fetch_profile(self, *, code: str, redirect_uri: str) -> SocialProfile:
        token_response = _post_form_json(
            GOOGLE_TOKEN_URL,
            {
                'client_id': self.client_id,
                'client_secret': self.client_secret,
                'code': code,
                'grant_type': 'authorization_code',
                'redirect_uri': redirect_uri,
            },
        )
        raw_id_token = token_response.get('id_token')
        if not isinstance(raw_id_token, str) or not raw_id_token:
            raise SocialAuthenticationError()

        claims = verify_google_id_token(raw_id_token, self.client_id)
        if claims.get('iss') not in GOOGLE_ISSUERS or claims.get('email_verified') is not True:
            raise SocialAuthenticationError()

        email = _verified_email(claims.get('email'))
        return SocialProfile(
            provider=self.name,
            subject=_required_subject(claims.get('sub')),
            email=email,
            nickname=_nickname(claims.get('name'), email),
            profile_image_url=_profile_image_url(claims.get('picture')),
        )


class KakaoSocialProvider(BaseSocialProvider):
    name = 'kakao'
    authorization_url = KAKAO_AUTHORIZATION_URL
    client_id_setting = 'SOCIAL_AUTH_KAKAO_CLIENT_ID'
    client_secret_setting = 'SOCIAL_AUTH_KAKAO_CLIENT_SECRET'

    def authorize_url(self, *, state: str, redirect_uri: str) -> str:
        query = urlencode(
            {
                'client_id': self.client_id,
                'redirect_uri': redirect_uri,
                'response_type': 'code',
                'scope': 'account_email,profile_nickname,profile_image',
                'state': state,
            },
        )
        return f'{self.authorization_url}?{query}'

    def fetch_profile(self, *, code: str, redirect_uri: str) -> SocialProfile:
        token_response = _post_form_json(
            KAKAO_TOKEN_URL,
            {
                'client_id': self.client_id,
                'client_secret': self.client_secret,
                'code': code,
                'grant_type': 'authorization_code',
                'redirect_uri': redirect_uri,
            },
        )
        access_token = token_response.get('access_token')
        if not isinstance(access_token, str) or not access_token:
            raise SocialAuthenticationError()

        user_info = _get_json(
            KAKAO_USER_INFO_URL,
            {'Authorization': f'Bearer {access_token}'},
        )
        kakao_account = user_info.get('kakao_account')
        if not isinstance(kakao_account, dict):
            raise SocialAuthenticationError()
        if kakao_account.get('is_email_valid') is not True or kakao_account.get('is_email_verified') is not True:
            raise SocialAuthenticationError()

        profile = kakao_account.get('profile')
        if not isinstance(profile, dict):
            profile = {}
        email = _verified_email(kakao_account.get('email'))
        return SocialProfile(
            provider=self.name,
            subject=_required_subject(user_info.get('id')),
            email=email,
            nickname=_nickname(profile.get('nickname'), email),
            profile_image_url=_profile_image_url(profile.get('profile_image_url')),
        )


_PROVIDERS: dict[str, BaseSocialProvider] = {
    'google': GoogleSocialProvider(),
    'kakao': KakaoSocialProvider(),
}


def get_social_provider(provider: str) -> BaseSocialProvider:
    normalized = provider.lower() if isinstance(provider, str) else ''
    try:
        return _PROVIDERS[normalized]
    except KeyError as exc:
        raise NotFound('Unsupported social provider.') from exc


def issue_oauth_state(request, provider: str, handoff_verifier: Any) -> str:
    state = secrets.token_urlsafe(32)
    handoff_verifier_digest = _handoff_verifier_digest(handoff_verifier, SocialAuthenticationError)
    now = time.time()
    stored_states = request.session.get(_STATE_SESSION_KEY, {})
    states = (
        {
            stored_state: record
            for stored_state, record in stored_states.items()
            if isinstance(stored_state, str)
            and isinstance(record, dict)
            and isinstance(record.get('expires_at'), (int, float))
            and record['expires_at'] > now
        }
        if isinstance(stored_states, dict)
        else {}
    )
    states[state] = {
        'provider': provider,
        'expires_at': now + settings.SOCIAL_AUTH_STATE_TTL_SECONDS,
        'handoff_verifier_digest': handoff_verifier_digest,
    }
    request.session[_STATE_SESSION_KEY] = states
    request.session.modified = True
    return state


def consume_oauth_state(request, provider: str, provided_state: Any) -> str:
    states = request.session.get(_STATE_SESSION_KEY, {})
    if not isinstance(states, dict) or not isinstance(provided_state, str):
        raise InvalidOAuthState()

    state_record = states.pop(provided_state, None)
    request.session[_STATE_SESSION_KEY] = states
    request.session.modified = True
    if not isinstance(state_record, dict):
        raise InvalidOAuthState()

    expected_provider = state_record.get('provider')
    expires_at = state_record.get('expires_at')
    handoff_verifier_digest = state_record.get('handoff_verifier_digest')
    if (
        not isinstance(expected_provider, str)
        or not isinstance(expires_at, (int, float))
        or not isinstance(handoff_verifier_digest, str)
        or not re.fullmatch(r'[0-9a-f]{64}', handoff_verifier_digest)
        or expires_at <= time.time()
    ):
        raise InvalidOAuthState()
    if not secrets.compare_digest(expected_provider, provider):
        raise InvalidOAuthState()
    return handoff_verifier_digest


def build_authorization_url(request, provider_name: str, handoff_verifier: Any) -> str:
    provider = get_social_provider(provider_name)
    # Validate all deployment inputs before creating state so a failed start
    # request cannot leave a usable state value in the browser session.
    _ = provider.client_id
    _ = provider.client_secret
    redirect_uri = get_callback_url(request, provider.name)
    state = issue_oauth_state(request, provider.name, handoff_verifier)
    return provider.authorize_url(state=state, redirect_uri=redirect_uri)


def _social_provider_value(provider: str) -> str:
    mapping = {
        'google': User.SocialProvider.GOOGLE,
        'kakao': User.SocialProvider.KAKAO,
    }
    return mapping[provider]


def resolve_social_user(profile: SocialProfile) -> User:
    provider_value = _social_provider_value(profile.provider)
    try:
        with transaction.atomic():
            identity_user = (
                User.objects.select_for_update()
                .filter(social_provider=provider_value, social_id=profile.subject)
                .first()
            )
            if identity_user is not None:
                if not identity_user.is_active:
                    raise InactiveSocialAccount()
                return identity_user

            email_user = User.objects.select_for_update().filter(email__iexact=profile.email).first()
            if email_user is not None:
                # Do not infer that two provider records are the same person.
                # Explicit account-linking can be added later as an authenticated flow.
                raise SocialIdentityCollision()

            return User.objects.create_user(
                email=profile.email,
                password=None,
                nickname=profile.nickname,
                profile_image_url=profile.profile_image_url,
                social_provider=provider_value,
                social_id=profile.subject,
            )
    except IntegrityError as exc:
        # Covers concurrent sign-ins racing on the unique identity or email constraint.
        raise SocialIdentityCollision() from exc


def _handoff_cache_key(code: str) -> str:
    digest = hashlib.sha256(code.encode('utf-8')).hexdigest()
    return f'{_HANDOFF_CACHE_PREFIX}{digest}'


def create_handoff_code(user: User, handoff_verifier_digest: str) -> str:
    timeout = settings.SOCIAL_AUTH_HANDOFF_TTL_SECONDS
    try:
        for _ in range(3):
            code = secrets.token_urlsafe(32)
            if cache.add(
                _handoff_cache_key(code),
                {'user_id': user.pk, 'handoff_verifier_digest': handoff_verifier_digest},
                timeout=timeout,
            ):
                return code
    except Exception as exc:  # Cache availability is part of the authentication boundary.
        raise SocialAuthConfigurationError() from exc
    raise SocialAuthConfigurationError()


def consume_handoff_code(code: str, handoff_verifier: Any) -> User:
    cache_key = _handoff_cache_key(code)
    handoff_verifier_digest = _handoff_verifier_digest(handoff_verifier, InvalidSocialHandoffCode)
    try:
        handoff = cache.get(cache_key)
        if not isinstance(handoff, dict) or not isinstance(handoff.get('user_id'), int):
            raise InvalidSocialHandoffCode()
        expected_verifier_digest = handoff.get('handoff_verifier_digest')
        if (
            not isinstance(expected_verifier_digest, str)
            or not secrets.compare_digest(expected_verifier_digest, handoff_verifier_digest)
        ):
            raise InvalidSocialHandoffCode()
        # `add` provides an atomic, cross-worker first-consumer marker for all
        # Django cache backends used by this project. If a worker fails after
        # acquiring it, failing closed is safer than issuing a second token pair.
        if not cache.add(
            f'{cache_key}{_HANDOFF_USED_SUFFIX}',
            '1',
            timeout=settings.SOCIAL_AUTH_HANDOFF_TTL_SECONDS,
        ):
            raise InvalidSocialHandoffCode()
        handoff = cache.get(cache_key)
        cache.delete(cache_key)
    except InvalidSocialHandoffCode:
        raise
    except Exception as exc:
        raise SocialAuthConfigurationError() from exc

    if not isinstance(handoff, dict) or not isinstance(handoff.get('user_id'), int):
        raise InvalidSocialHandoffCode()

    try:
        user = User.objects.get(pk=handoff['user_id'])
    except User.DoesNotExist as exc:
        raise InvalidSocialHandoffCode() from exc
    if not user.is_active:
        raise InactiveSocialAccount()
    return user


def frontend_callback_url(handoff_code: str) -> str:
    return f'{settings.FRONTEND_ORIGIN}/auth/callback?{urlencode({"code": handoff_code})}'


def frontend_callback_error_url(error_code: str) -> str:
    return f'{settings.FRONTEND_ORIGIN}/auth/callback?{urlencode({"error": error_code})}'
