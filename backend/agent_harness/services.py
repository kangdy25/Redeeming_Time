from datetime import timedelta

from django.db.models import Count, Q
from django.utils import timezone

from planner.models import Calendar, Task
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

    task_counts = (
        Task.objects.filter(
            calendar__memberships__user_id=user_id,
            target_date__gte=start_date,
            category__isnull=False,
        )
        .values('category_id', 'category__name', 'category__color_code')
        .annotate(
            task_count=Count('id'),
            completed_count=Count('id', filter=Q(is_completed=True)),
            open_count=Count('id', filter=Q(is_completed=False)),
        )
    )

    categories = [
        {
            'category_id': item['category_id'],
            'category_name': item['category__name'],
            'color_code': item['category__color_code'],
            'task_count': item['task_count'],
            'completed_count': item['completed_count'],
            'open_count': item['open_count'],
        }
        for item in task_counts
    ]

    return {'period': period, 'start_date': start_date.isoformat(), 'categories': categories}


def on_task_failed(calendar_id=None):
    return rollover_overdue_tasks(calendar_id=calendar_id)


def on_schedule_congested(calendar_id, start_time, end_time):
    calendar = Calendar.objects.filter(id=calendar_id).first()
    if not calendar:
        return {'is_congested': False, 'daily_hours': 0, 'overlap_count': 0, 'reasons': ['calendar_not_found']}
    return analyze_schedule_density(calendar, start_time, end_time)
