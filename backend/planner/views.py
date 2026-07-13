from rest_framework import permissions, viewsets
from rest_framework.exceptions import ValidationError

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
        if not user_is_calendar_owner(self.request.user, instance):
            self.permission_denied(self.request, message='Only calendar owners can delete calendars.')
        if instance.is_global:
            self.permission_denied(self.request, message='The global calendar cannot be deleted.')
        instance.delete()


class CalendarMemberViewSet(viewsets.ModelViewSet):
    queryset = CalendarMember.objects.all()
    serializer_class = CalendarMemberSerializer
    permission_classes = [permissions.IsAuthenticated, IsCalendarOwner]

    def get_queryset(self):
        return CalendarMember.objects.filter(
            calendar__memberships__user=self.request.user,
            calendar__memberships__role=CalendarMember.Role.OWNER,
        ).select_related('calendar', 'user')

    def perform_create(self, serializer):
        calendar = serializer.validated_data['calendar']
        if not user_is_calendar_owner(self.request.user, calendar):
            self.permission_denied(self.request, message='Only calendar owners can add members.')
        serializer.save()

    def perform_update(self, serializer):
        instance = serializer.instance
        new_role = serializer.validated_data.get('role', instance.role)
        is_last_owner = not CalendarMember.objects.filter(
            calendar=instance.calendar,
            role=CalendarMember.Role.OWNER,
        ).exclude(pk=instance.pk).exists()
        if instance.role == CalendarMember.Role.OWNER and new_role != CalendarMember.Role.OWNER and is_last_owner:
            raise ValidationError({'role': 'A calendar must retain at least one owner.'})
        serializer.save()

    def perform_destroy(self, instance):
        is_last_owner = not CalendarMember.objects.filter(
            calendar=instance.calendar,
            role=CalendarMember.Role.OWNER,
        ).exclude(pk=instance.pk).exists()
        if instance.role == CalendarMember.Role.OWNER and is_last_owner:
            raise ValidationError({'detail': 'A calendar must retain at least one owner.'})
        instance.delete()


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

    def perform_update(self, serializer):
        calendar = serializer.validated_data.get('calendar', serializer.instance.calendar)
        if not user_can_edit_calendar(self.request.user, calendar):
            self.permission_denied(self.request, message='Only owners or editors can edit categories in the selected calendar.')
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

    def perform_update(self, serializer):
        calendar = serializer.validated_data.get('calendar', serializer.instance.calendar)
        if not user_can_edit_calendar(self.request.user, calendar):
            self.permission_denied(self.request, message='Only owners or editors can edit events in the selected calendar.')
        serializer.save()


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

    def perform_update(self, serializer):
        event = serializer.validated_data.get('event', serializer.instance.event)
        if not user_can_edit_calendar(self.request.user, event.calendar):
            self.permission_denied(self.request, message='Only owners or editors can manage attendees in the selected calendar.')
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

    def perform_update(self, serializer):
        calendar = serializer.validated_data.get('calendar', serializer.instance.calendar)
        if not user_can_edit_calendar(self.request.user, calendar):
            self.permission_denied(self.request, message='Only owners or editors can edit tasks in the selected calendar.')
        serializer.save()
