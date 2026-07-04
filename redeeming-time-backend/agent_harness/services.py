from datetime import timedelta

from django.utils import timezone

from planner.models import Calendar, Event, Task
from planner.services import analyze_schedule_density, rollover_overdue_tasks


def get_overdue_tasks(calendar_id):
    today = timezone.localdate()
    return Task.objects.filter(calendar_id=calendar_id, is_completed=False, target_date__lt=today).order_by('target_date', 'order')


def execute_task_rollover(task_ids, new_date=None):
    target_date = new_date or timezone.localdate()
    tasks = Task.objects.filter(id__in=task_ids, is_completed=False)
    ids = list(tasks.values_list('id', flat=True))
    updated_count = tasks.update(target_date=target_date)
    return {'updated_count': updated_count, 'target_date': target_date.isoformat(), 'task_ids': ids}


def adjust_task_priority(task_id, new_priority):
    task = Task.objects.get(id=task_id)
    task.priority = new_priority
    task.save(update_fields=['priority', 'updated_at'])
    return task


def fetch_calendar_analytics(user_id, period):
    today = timezone.localdate()
    if period == 'month':
        start_date = today.replace(day=1)
    elif period == 'week':
        start_date = today - timedelta(days=today.weekday())
    else:
        start_date = today

    events = Event.objects.filter(
        calendar__memberships__user_id=user_id,
        start_time__date__gte=start_date,
        category__isnull=False,
    )
    duration_by_category = {}
    for event in events.select_related('category'):
        seconds = max((event.end_time - event.start_time).total_seconds(), 0)
        bucket = duration_by_category.setdefault(
            event.category_id,
            {'category_id': event.category_id, 'category_name': event.category.name, 'color_code': event.category.color_code, 'hours': 0},
        )
        bucket['hours'] += round(seconds / 3600, 2)

    return {'period': period, 'start_date': start_date.isoformat(), 'categories': list(duration_by_category.values())}


def on_task_failed(calendar_id=None):
    return rollover_overdue_tasks(calendar_id=calendar_id)


def on_schedule_congested(calendar_id, start_time, end_time):
    calendar = Calendar.objects.filter(id=calendar_id).first()
    if not calendar:
        return {'is_congested': False, 'daily_hours': 0, 'overlap_count': 0, 'reasons': ['calendar_not_found']}
    return analyze_schedule_density(calendar, start_time, end_time)
