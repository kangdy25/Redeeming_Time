from django.contrib.auth.base_user import AbstractBaseUser, BaseUserManager
from django.contrib.auth.models import PermissionsMixin
from django.db import models, transaction


class UserManager(BaseUserManager):
    """Create users with email as the primary login identifier."""

    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('Users must provide an email address.')

        email = self.normalize_email(email)
        with transaction.atomic(using=self._db):
            user = self.model(email=email, **extra_fields)
            user.set_password(password)
            user.save(using=self._db)

            # Keep every newly registered account immediately usable.  Importing
            # here avoids a module-level dependency from the accounts app back
            # to planner while Django is loading models.
            from planner.models import Calendar, CalendarMember

            calendar = Calendar.objects.create(
                title='전체 캘린더',
                description='모든 일정을 한눈에 관리하는 기본 캘린더',
                theme_color='#2F80ED',
                is_global=True,
            )
            CalendarMember.objects.create(
                calendar=calendar,
                user=user,
                role=CalendarMember.Role.OWNER,
            )
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('is_active', True)

        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superusers must have is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superusers must have is_superuser=True.')

        return self.create_user(email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    class SocialProvider(models.TextChoices):
        LOCAL = 'LOCAL', 'Local'
        GOOGLE = 'GOOGLE', 'Google'
        KAKAO = 'KAKAO', 'Kakao'

    email = models.EmailField(unique=True)
    nickname = models.CharField(max_length=150)
    profile_image_url = models.URLField(blank=True)
    social_provider = models.CharField(
        max_length=20,
        choices=SocialProvider.choices,
        default=SocialProvider.LOCAL,
    )
    social_id = models.CharField(max_length=255, blank=True)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = UserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['nickname']

    class Meta:
        db_table = 'users'
        ordering = ['-created_at']

    def __str__(self):
        return self.email
