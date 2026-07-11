from rest_framework import permissions, viewsets

from .models import Calendar, CalendarMember, Category, Event, EventAttendee, Task
from .permissions import IsCalendarMemberReadEditorWrite, IsCalendarOwner
from .serializers import (
    CalendarMemberSerializer,
    CalendarSerializer,
    CategorySerializer,
    EventAttendeeSerializer,
    EventSerializer,
    TaskSerializer,
)
from .services import user_can_edit_calendar, user_is_calendar_owner


class CalendarViewSet(viewsets.ModelViewSet):
    queryset = Calendar.objects.all()
    serializer_class = CalendarSerializer
    permission_classes = [permissions.IsAuthenticated, IsCalendarMemberReadEditorWrite]

    def get_queryset(self):
        return Calendar.objects.filter(memberships__user=self.request.user).distinct().order_by('-is_global', 'title')

    def perform_create(self, serializer):
        calendar = serializer.save()
        CalendarMember.objects.create(calendar=calendar, user=self.request.user, role=CalendarMember.Role.OWNER)

    def perform_destroy(self, instance):
        if instance.is_global:
            self.permission_denied(self.request, message='The global calendar cannot be deleted.')
        instance.delete()


class CalendarMemberViewSet(viewsets.ModelViewSet):
    queryset = CalendarMember.objects.all()
    serializer_class = CalendarMemberSerializer
    permission_classes = [permissions.IsAuthenticated, IsCalendarOwner]

    def get_queryset(self):
        return CalendarMember.objects.filter(calendar__memberships__user=self.request.user).select_related('calendar', 'user')

    def perform_create(self, serializer):
        calendar = serializer.validated_data['calendar']
        if not user_is_calendar_owner(self.request.user, calendar):
            self.permission_denied(self.request, message='Only calendar owners can add members.')
        serializer.save()


class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [permissions.IsAuthenticated, IsCalendarMemberReadEditorWrite]

    def get_queryset(self):
        return Category.objects.filter(calendar__memberships__user=self.request.user).select_related('calendar')

    def perform_create(self, serializer):
        calendar = serializer.validated_data['calendar']
        if not user_can_edit_calendar(self.request.user, calendar):
            self.permission_denied(self.request, message='Only owners or editors can create categories.')
        serializer.save()


class EventViewSet(viewsets.ModelViewSet):
    queryset = Event.objects.all()
    serializer_class = EventSerializer
    permission_classes = [permissions.IsAuthenticated, IsCalendarMemberReadEditorWrite]

    def get_queryset(self):
        return Event.objects.filter(calendar__memberships__user=self.request.user).select_related('calendar', 'creator')

    def perform_create(self, serializer):
        calendar = serializer.validated_data['calendar']
        if not user_can_edit_calendar(self.request.user, calendar):
            self.permission_denied(self.request, message='Only owners or editors can create events.')
        serializer.save(creator=self.request.user)


class EventAttendeeViewSet(viewsets.ModelViewSet):
    queryset = EventAttendee.objects.all()
    serializer_class = EventAttendeeSerializer
    permission_classes = [permissions.IsAuthenticated, IsCalendarMemberReadEditorWrite]

    def get_queryset(self):
        return EventAttendee.objects.filter(event__calendar__memberships__user=self.request.user).select_related('event', 'user')

    def perform_create(self, serializer):
        event = serializer.validated_data['event']
        if not user_can_edit_calendar(self.request.user, event.calendar):
            self.permission_denied(self.request, message='Only owners or editors can manage attendees.')
        serializer.save()


class TaskViewSet(viewsets.ModelViewSet):
    queryset = Task.objects.all()
    serializer_class = TaskSerializer
    permission_classes = [permissions.IsAuthenticated, IsCalendarMemberReadEditorWrite]

    def get_queryset(self):
        return Task.objects.filter(calendar__memberships__user=self.request.user).select_related('calendar', 'category', 'creator')

    def perform_create(self, serializer):
        calendar = serializer.validated_data['calendar']
        if not user_can_edit_calendar(self.request.user, calendar):
            self.permission_denied(self.request, message='Only owners or editors can create tasks.')
        serializer.save(creator=self.request.user)
