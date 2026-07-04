from datetime import timedelta

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


def analyze_schedule_density(calendar, start_time, end_time, excluded_event_id=None):
    day_start = timezone.localtime(start_time).replace(hour=0, minute=0, second=0, microsecond=0)
    day_end = day_start + timedelta(days=1)
    events = Event.objects.filter(
        calendar=calendar,
        start_time__lt=day_end,
        end_time__gt=day_start,
    )
    if excluded_event_id:
        events = events.exclude(id=excluded_event_id)

    event_list = list(events.only('id', 'start_time', 'end_time'))
    overlap_count = sum(1 for event in event_list if event.start_time < end_time and event.end_time > start_time)
    total_seconds = sum(max((event.end_time - event.start_time).total_seconds(), 0) for event in event_list)
    candidate_seconds = max((end_time - start_time).total_seconds(), 0)
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


def rollover_overdue_tasks(calendar_id=None, target_date=None):
    new_date = target_date or timezone.localdate()
    overdue = Task.objects.filter(is_completed=False, target_date__lt=new_date)
    if calendar_id is not None:
        overdue = overdue.filter(calendar_id=calendar_id)

    task_ids = list(overdue.values_list('id', flat=True))
    updated_count = overdue.update(target_date=new_date)
    return {
        'updated_count': updated_count,
        'target_date': new_date.isoformat(),
        'task_ids': task_ids,
    }
