from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.contrib.auth.tokens import default_token_generator
from django.utils.encoding import force_str
from django.utils.http import urlsafe_base64_decode
from rest_framework import serializers
from rest_framework_simplejwt.exceptions import AuthenticationFailed
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .email_verification import consume_email_verification_token
from .models import User


class EmailNotVerified(AuthenticationFailed):
    default_detail = 'Verify your email address before signing in.'
    default_code = 'email_not_verified'


class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8, required=False)

    class Meta:
        model = User
        fields = [
            'id',
            'email',
            'password',
            'nickname',
            'profile_image_url',
            'social_provider',
            'email_verified',
            'is_active',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id',
            'social_provider',
            'email_verified',
            'is_active',
            'created_at',
            'updated_at',
        ]

    def validate_email(self, value):
        if self.instance and value != self.instance.email:
            raise serializers.ValidationError('Email cannot be changed after registration.')
        return value

    def validate(self, attrs):
        password = attrs.get('password')
        if not self.instance and not password:
            raise serializers.ValidationError({'password': 'Password is required for local registration.'})
        if self.instance and password:
            raise serializers.ValidationError(
                {'password': 'Use the password-change endpoint to change your password.'},
            )
        if password:
            candidate = User(
                email=attrs.get('email', ''),
                nickname=attrs.get('nickname', ''),
            )
            try:
                validate_password(password, candidate)
            except DjangoValidationError as exc:
                raise serializers.ValidationError({'password': list(exc.messages)}) from exc
        return attrs

    def create(self, validated_data):
        password = validated_data.pop('password', None)
        return User.objects.create_user(password=password, **validated_data)

    def update(self, instance, validated_data):
        for field, value in validated_data.items():
            setattr(instance, field, value)
        instance.save()
        return instance


class PasswordChangeSerializer(serializers.Serializer):
    current_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, min_length=8)

    def validate(self, attrs):
        user = self.context['request'].user
        if not user.check_password(attrs['current_password']):
            raise serializers.ValidationError({'current_password': 'Current password is incorrect.'})
        if attrs['current_password'] == attrs['new_password']:
            raise serializers.ValidationError({'new_password': 'New password must be different from the current password.'})
        try:
            validate_password(attrs['new_password'], user)
        except DjangoValidationError as exc:
            raise serializers.ValidationError({'new_password': list(exc.messages)}) from exc
        return attrs


class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()


class PasswordResetConfirmSerializer(serializers.Serializer):
    uid = serializers.CharField(write_only=True, max_length=128, trim_whitespace=False)
    token = serializers.CharField(write_only=True, max_length=256, trim_whitespace=False)
    new_password = serializers.CharField(write_only=True, min_length=8)

    def validate(self, attrs):
        try:
            user_id = force_str(urlsafe_base64_decode(attrs['uid']))
            user = User.objects.get(pk=user_id)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist) as exc:
            raise serializers.ValidationError('This password reset link is invalid or has expired.') from exc

        if (
            not user.is_active
            or not user.has_usable_password()
            or not default_token_generator.check_token(user, attrs['token'])
        ):
            raise serializers.ValidationError('This password reset link is invalid or has expired.')

        try:
            validate_password(attrs['new_password'], user)
        except DjangoValidationError as exc:
            raise serializers.ValidationError({'new_password': list(exc.messages)}) from exc

        attrs['user'] = user
        return attrs


class EmailVerificationRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()


class EmailVerificationConfirmSerializer(serializers.Serializer):
    token = serializers.CharField(write_only=True, max_length=512, trim_whitespace=False)

    def validate(self, attrs):
        user = consume_email_verification_token(attrs['token'])
        if user is None:
            raise serializers.ValidationError('This email verification link is invalid or has expired.')
        attrs['user'] = user
        return attrs


class EmailVerifiedTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Do not issue local-account JWTs until the mailbox is verified."""

    def validate(self, attrs):
        data = super().validate(attrs)
        if self.user.social_provider == User.SocialProvider.LOCAL and not self.user.email_verified:
            raise EmailNotVerified()
        return data


class SocialHandoffCodeSerializer(serializers.Serializer):
    """Validate the opaque code returned only by a successful OAuth callback."""

    code = serializers.CharField(
        write_only=True,
        min_length=32,
        max_length=128,
        trim_whitespace=False,
    )
    verifier = serializers.CharField(
        write_only=True,
        min_length=43,
        max_length=128,
        trim_whitespace=False,
    )


class SocialTokenPairSerializer(serializers.Serializer):
    access = serializers.CharField(read_only=True)
    refresh = serializers.CharField(read_only=True)
