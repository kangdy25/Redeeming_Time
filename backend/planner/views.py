from datetime import timedelta

from django.utils import timezone
from django.utils.dateparse import parse_date, parse_datetime
from drf_spectacular.utils import OpenApiParameter, OpenApiTypes, extend_schema
from rest_framework import permissions, viewsets
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

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
from .services import (
    analyze_schedule_density_batch,
    user_can_edit_calendar,
    user_is_calendar_owner,
)


MAX_EVENT_RANGE = timedelta(days=93)
CALENDAR_PARAMETER = OpenApiParameter(
    name='calendar',
    type=OpenApiTypes.INT,
    location=OpenApiParameter.QUERY,
    description='Limit results to one accessible calendar.',
)


def _optional_positive_integer(request, name):
    raw_value = request.query_params.get(name)
    if raw_value is None:
        return None
    try:
        value = int(raw_value)
    except (TypeError, ValueError) as exc:
        raise ValidationError({name: 'Use a positive integer.'}) from exc
    if value < 1:
        raise ValidationError({name: 'Use a positive integer.'})
    return value


def _optional_date(request, name):
    raw_value = request.query_params.get(name)
    if raw_value is None:
        return None
    try:
        value = parse_date(raw_value)
    except ValueError:
        value = None
    if value is None:
        raise ValidationError({name: 'Use an ISO date in YYYY-MM-DD format.'})
    return value


def _optional_aware_datetime(request, name):
    raw_value = request.query_params.get(name)
    if raw_value is None:
        return None
    try:
        value = parse_datetime(raw_value)
    except ValueError:
        value = None
    if value is None or timezone.is_naive(value):
        raise ValidationError({name: 'Use an ISO 8601 datetime with a timezone offset.'})
    return value


def _optional_boolean(request, name):
    raw_value = request.query_params.get(name)
    if raw_value is None:
        return None
    value = raw_value.lower()
    if value == 'true':
        return True
    if value == 'false':
        return False
    raise ValidationError({name: 'Use true or false.'})


class CalendarViewSet(viewsets.ModelViewSet):
    queryset = Calendar.objects.all()
    serializer_class = CalendarSerializer
    permission_classes = [permissions.IsAuthenticated, IsCalendarMemberReadEditorWrite]

    def get_queryset(self):
        return Calendar.objects.filter(memberships__user=self.request.user).distinct().order_by(
            '-is_global',
            'title',
            'id',
        )

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

    @extend_schema(parameters=[CALENDAR_PARAMETER])
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)

    def get_queryset(self):
        queryset = CalendarMember.objects.filter(
            calendar__memberships__user=self.request.user,
            calendar__memberships__role=CalendarMember.Role.OWNER,
        ).select_related('calendar', 'user').distinct().order_by(
            'calendar_id',
            'user_id',
            'id',
        )
        calendar_id = _optional_positive_integer(self.request, 'calendar')
        if calendar_id is not None:
            queryset = queryset.filter(calendar_id=calendar_id)
        return queryset

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

    @extend_schema(parameters=[CALENDAR_PARAMETER])
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)

    def get_queryset(self):
        queryset = Category.objects.filter(
            calendar__memberships__user=self.request.user,
        ).select_related('calendar')
        calendar_id = _optional_positive_integer(self.request, 'calendar')
        if calendar_id is not None:
            queryset = queryset.filter(calendar_id=calendar_id)
        return queryset.order_by('name', 'id')

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

    @extend_schema(
        parameters=[
            CALENDAR_PARAMETER,
            OpenApiParameter(
                name='starts_at',
                type=OpenApiTypes.DATETIME,
                location=OpenApiParameter.QUERY,
                description='Inclusive ISO 8601 range start. Must be used with ends_at.',
            ),
            OpenApiParameter(
                name='ends_at',
                type=OpenApiTypes.DATETIME,
                location=OpenApiParameter.QUERY,
                description=(
                    'Exclusive ISO 8601 range end. Must be used with starts_at; '
                    'maximum span is 93 days.'
                ),
            ),
        ],
    )
    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        events = list(page) if page is not None else list(queryset)
        serializer = self.get_serializer(
            events,
            many=True,
            context={
                **self.get_serializer_context(),
                'congestion_warnings': analyze_schedule_density_batch(events),
            },
        )
        if page is not None:
            return self.get_paginated_response(serializer.data)
        return Response(serializer.data)

    def get_queryset(self):
        queryset = Event.objects.filter(calendar__memberships__user=self.request.user).select_related(
            'calendar',
            'creator',
        )
        calendar_id = _optional_positive_integer(self.request, 'calendar')
        if calendar_id is not None:
            queryset = queryset.filter(calendar_id=calendar_id)

        starts_at = _optional_aware_datetime(self.request, 'starts_at')
        ends_at = _optional_aware_datetime(self.request, 'ends_at')
        if (starts_at is None) != (ends_at is None):
            raise ValidationError({'starts_at': 'starts_at and ends_at must be supplied together.'})
        if starts_at is not None:
            if ends_at <= starts_at:
                raise ValidationError({'ends_at': 'ends_at must be after starts_at.'})
            if ends_at - starts_at > MAX_EVENT_RANGE:
                raise ValidationError({'ends_at': 'The event range cannot exceed 93 days.'})
            queryset = queryset.filter(start_time__lt=ends_at, end_time__gt=starts_at)

        return queryset.order_by('start_time', 'title', 'id')

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

    @extend_schema(
        parameters=[
            OpenApiParameter(
                name='event',
                type=OpenApiTypes.INT,
                location=OpenApiParameter.QUERY,
                description='Limit results to one accessible event.',
            ),
        ],
    )
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)

    def get_queryset(self):
        queryset = EventAttendee.objects.filter(
            event__calendar__memberships__user=self.request.user,
        ).select_related('event', 'user')
        event_id = _optional_positive_integer(self.request, 'event')
        if event_id is not None:
            queryset = queryset.filter(event_id=event_id)
        return queryset.order_by('event_id', 'user_id', 'id')

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

    @extend_schema(
        parameters=[
            CALENDAR_PARAMETER,
            OpenApiParameter(
                name='target_date_from',
                type=OpenApiTypes.DATE,
                location=OpenApiParameter.QUERY,
                description='Inclusive task date in YYYY-MM-DD format.',
            ),
            OpenApiParameter(
                name='target_date_to',
                type=OpenApiTypes.DATE,
                location=OpenApiParameter.QUERY,
                description='Exclusive task date in YYYY-MM-DD format.',
            ),
            OpenApiParameter(
                name='is_completed',
                type=OpenApiTypes.BOOL,
                location=OpenApiParameter.QUERY,
                description='Limit results to true or false completion state.',
            ),
        ],
    )
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)

    def get_queryset(self):
        queryset = Task.objects.filter(calendar__memberships__user=self.request.user).select_related(
            'calendar',
            'category',
            'creator',
        )
        calendar_id = _optional_positive_integer(self.request, 'calendar')
        if calendar_id is not None:
            queryset = queryset.filter(calendar_id=calendar_id)

        target_date_from = _optional_date(self.request, 'target_date_from')
        target_date_to = _optional_date(self.request, 'target_date_to')
        if target_date_from is not None and target_date_to is not None:
            if target_date_to <= target_date_from:
                raise ValidationError({'target_date_to': 'target_date_to must be after target_date_from.'})
        if target_date_from is not None:
            queryset = queryset.filter(target_date__gte=target_date_from)
        if target_date_to is not None:
            queryset = queryset.filter(target_date__lt=target_date_to)

        is_completed = _optional_boolean(self.request, 'is_completed')
        if is_completed is not None:
            queryset = queryset.filter(is_completed=is_completed)
        return queryset.order_by('target_date', 'order', 'created_at', 'id')

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
