"""
URL configuration for config project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView
from rest_framework.routers import DefaultRouter

from accounts.views import (
    LoginView,
    LogoutView,
    PasswordChangeView,
    SocialAuthCallbackView,
    SocialAuthExchangeView,
    SocialAuthStartView,
    TokenRefreshWithThrottleView,
    UserViewSet,
)
from config.views import healthz
from planner.views import CalendarMemberViewSet, CalendarViewSet, CategoryViewSet, EventAttendeeViewSet, EventViewSet, TaskViewSet

router = DefaultRouter()
router.register('users', UserViewSet, basename='user')
router.register('calendars', CalendarViewSet, basename='calendar')
router.register('calendar-members', CalendarMemberViewSet, basename='calendar-member')
router.register('categories', CategoryViewSet, basename='category')
router.register('events', EventViewSet, basename='event')
router.register('event-attendees', EventAttendeeViewSet, basename='event-attendee')
router.register('tasks', TaskViewSet, basename='task')

urlpatterns = [
    path('healthz/', healthz, name='healthz'),
    path('admin/', admin.site.urls),
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/', include(router.urls)),
    path('api/auth/token/', LoginView.as_view(), name='token_obtain_pair'),
    path('api/auth/token/refresh/', TokenRefreshWithThrottleView.as_view(), name='token_refresh'),
    path('api/auth/token/blacklist/', LogoutView.as_view(), name='token_blacklist'),
    path('api/auth/password/change/', PasswordChangeView.as_view(), name='password_change'),
    path('api/auth/social/<str:provider>/start/', SocialAuthStartView.as_view(), name='social_auth_start'),
    path('api/auth/social/<str:provider>/callback/', SocialAuthCallbackView.as_view(), name='social_auth_callback'),
    path('api/auth/social/exchange/', SocialAuthExchangeView.as_view(), name='social_auth_exchange'),
]

handler500 = 'config.exceptions.server_error'
