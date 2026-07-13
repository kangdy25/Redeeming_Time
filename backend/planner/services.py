from collections import defaultdict
from datetime import timedelta
from zoneinfo import ZoneInfo

from django.conf import settings
from django.db.models import Q
from django.utils import timezone

from .models import CalendarMember, Event, Task


def membership_for(user, calendar):
    if not user or not user.is_authenticated:
        return None
    return CalendarMember.objects.filter(user=user, calendar=calendar).first()


def user_can_edit_calendar(user, calendar):
    membership = membership_for(user, calendar)
    return bool(membership and membership.can_edit)


def user_is_calendar_owner(user, calendar):
    membership = membership_for(user, calendar)
    return bool(membership and membership.role == CalendarMember.Role.OWNER)


def planner_timezone():
    return ZoneInfo(settings.PLANNER_TIME_ZONE)


def planner_localdate():
    return timezone.localdate(timezone=planner_timezone())


def _day_bounds(value):
    day_start = timezone.localtime(value, timezone=planner_timezone()).replace(
        hour=0,
        minute=0,
        second=0,
        microsecond=0,
    )
    day_end = day_start + timedelta(days=1)
    return day_start, day_end


def _seconds_within_day(start_time, end_time, day_start, day_end):
    overlap_start = max(start_time, day_start)
    overlap_end = min(end_time, day_end)
    return max((overlap_end - overlap_start).total_seconds(), 0)


def _density_warning(
    event_list,
    start_time,
    end_time,
    is_all_day,
    day_start,
    day_end,
    excluded_event_id=None,
):
    timed_events = [
        event
        for event in event_list
        if event.id != excluded_event_id and not event.is_all_day
    ]
    overlap_count = (
        0
        if is_all_day
        else sum(
            1
            for event in timed_events
            if event.start_time < end_time and event.end_time > start_time
        )
    )
    total_seconds = sum(
        _seconds_within_day(event.start_time, event.end_time, day_start, day_end)
        for event in timed_events
    )
    candidate_seconds = (
        0
        if is_all_day
        else _seconds_within_day(start_time, end_time, day_start, day_end)
    )
    daily_hours = round((total_seconds + candidate_seconds) / 3600, 2)

    return {
        'is_congested': daily_hours > 8 or overlap_count >= 3,
        'daily_hours': daily_hours,
        'overlap_count': overlap_count,
        'reasons': [
            reason
            for reason, active in (
                ('daily_event_duration_exceeds_8_hours', daily_hours > 8),
                ('three_or_more_overlapping_events', overlap_count >= 3),
            )
            if active
        ],
    }


def analyze_schedule_density(calendar, start_time, end_time, excluded_event_id=None, is_all_day=False):
    day_start, day_end = _day_bounds(start_time)
    events = Event.objects.filter(
        calendar=calendar,
        start_time__lt=day_end,
        end_time__gt=day_start,
    ).only('id', 'calendar_id', 'start_time', 'end_time', 'is_all_day')
    return _density_warning(
        events,
        start_time,
        end_time,
        is_all_day,
        day_start,
        day_end,
        excluded_event_id=excluded_event_id,
    )


def analyze_schedule_density_batch(events):
    """Calculate list-page congestion warnings with one shared event query.

    Each event is evaluated against its start-day in ``PLANNER_TIME_ZONE``. A
    single query collects every event that may affect a calendar/day window on
    the response page; individual event serialization then only reads this
    in-memory map.
    """

    candidates = list(events)
    if not candidates:
        return {}

    windows = {}
    candidate_windows = {}
    filters = Q()
    for candidate in candidates:
        day_start, day_end = _day_bounds(candidate.start_time)
        key = (candidate.calendar_id, day_start)
        candidate_windows[candidate.id] = (key, day_start, day_end)
        if key not in windows:
            windows[key] = (day_start, day_end)
            filters |= Q(
                calendar_id=candidate.calendar_id,
                start_time__lt=day_end,
                end_time__gt=day_start,
            )

    events_by_calendar = defaultdict(list)
    for event in Event.objects.filter(filters).only(
        'id',
        'calendar_id',
        'start_time',
        'end_time',
        'is_all_day',
    ):
        events_by_calendar[event.calendar_id].append(event)

    events_by_window = {}
    for (calendar_id, day_start), (_, day_end) in windows.items():
        events_by_window[(calendar_id, day_start)] = [
            event
            for event in events_by_calendar[calendar_id]
            if event.start_time < day_end and event.end_time > day_start
        ]

    warnings = {}
    for candidate in candidates:
        key, day_start, day_end = candidate_windows[candidate.id]
        warnings[candidate.id] = _density_warning(
            events_by_window[key],
            candidate.start_time,
            candidate.end_time,
            candidate.is_all_day,
            day_start,
            day_end,
            excluded_event_id=candidate.id,
        )
    return warnings


def rollover_overdue_tasks(calendar_id=None, target_date=None, dry_run=False):
    new_date = target_date or planner_localdate()
    overdue = Task.objects.filter(is_completed=False, target_date__lt=new_date)
    if calendar_id is not None:
        overdue = overdue.filter(calendar_id=calendar_id)

    updated_count = (
        overdue.count()
        if dry_run
        else overdue.update(target_date=new_date, updated_at=timezone.now())
    )
    return {
        'updated_count': updated_count,
        'target_date': new_date.isoformat(),
        'dry_run': dry_run,
    }
