from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin

from .models import User


@admin.register(User)
class UserAdmin(DjangoUserAdmin):
    model = User
    list_display = (
        'email',
        'nickname',
        'social_provider',
        'is_active',
        'is_staff',
        'created_at',
    )
    list_filter = ('social_provider', 'is_active', 'is_staff', 'is_superuser')
    search_fields = ('email', 'nickname', 'social_id')
    ordering = ('email',)

    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        ('Profile', {'fields': ('nickname', 'profile_image_url')}),
        ('Social Auth', {'fields': ('social_provider', 'social_id')}),
        ('Permissions', {'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
        ('Important dates', {'fields': ('last_login', 'created_at', 'updated_at')}),
    )
    readonly_fields = ('created_at', 'updated_at', 'last_login')
    add_fieldsets = (
        (
            None,
            {
                'classes': ('wide',),
                'fields': ('email', 'nickname', 'password1', 'password2', 'is_active', 'is_staff'),
            },
        ),
    )
