import hashlib

from django.conf import settings
from django.core.signing import BadSignature, SignatureExpired, TimestampSigner

from .models import User

_SIGNER_SALT = 'accounts.email-verification'


def _password_digest(user: User) -> str:
    return hashlib.sha256(user.password.encode('utf-8')).hexdigest()


def make_email_verification_token(user: User) -> str:
    """Create an expiring token bound to the user's current password hash."""

    return TimestampSigner(salt=_SIGNER_SALT).sign(f'{user.pk}:{_password_digest(user)}')


def consume_email_verification_token(token: str) -> User | None:
    try:
        value = TimestampSigner(salt=_SIGNER_SALT).unsign(
            token,
            max_age=settings.EMAIL_VERIFICATION_TIMEOUT,
        )
        user_id, password_digest = value.split(':', maxsplit=1)
        user = User.objects.get(pk=user_id)
    except (BadSignature, SignatureExpired, User.DoesNotExist, ValueError):
        return None

    if user.email_verified or not user.is_active or user.social_provider != User.SocialProvider.LOCAL:
        return None
    return user if _password_digest(user) == password_digest else None
