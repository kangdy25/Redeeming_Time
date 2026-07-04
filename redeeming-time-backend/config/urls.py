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
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from accounts.views import UserViewSet
from agent_harness.views import AgentSkillViewSet
from planner.views import CalendarMemberViewSet, CalendarViewSet, CategoryViewSet, EventAttendeeViewSet, EventViewSet, TaskViewSet

router = DefaultRouter()
router.register('users', UserViewSet, basename='user')
router.register('calendars', CalendarViewSet, basename='calendar')
router.register('calendar-members', CalendarMemberViewSet, basename='calendar-member')
router.register('categories', CategoryViewSet, basename='category')
router.register('events', EventViewSet, basename='event')
router.register('event-attendees', EventAttendeeViewSet, basename='event-attendee')
router.register('tasks', TaskViewSet, basename='task')
router.register('agent/skills', AgentSkillViewSet, basename='agent-skill')

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include(router.urls)),
    path('api/auth/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
]
