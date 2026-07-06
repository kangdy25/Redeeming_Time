from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils import timezone

from planner.models import Calendar, Task

from .services import execute_task_rollover, get_overdue_tasks


class AgentHarnessServiceTests(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(
            email='agent-owner@example.com',
            password='secure-pass-123',
            nickname='Agent Owner',
        )
        self.calendar = Calendar.objects.create(title='Agent Space')

    def test_get_overdue_tasks_excludes_completed_and_future_tasks(self):
        today = timezone.localdate()
        overdue = Task.objects.create(
            calendar=self.calendar,
            creator=self.user,
            title='Overdue',
            target_date=today - timezone.timedelta(days=1),
        )
        Task.objects.create(
            calendar=self.calendar,
            creator=self.user,
            title='Done',
            target_date=today - timezone.timedelta(days=2),
            is_completed=True,
        )
        Task.objects.create(
            calendar=self.calendar,
            creator=self.user,
            title='Future',
            target_date=today + timezone.timedelta(days=1),
        )

        self.assertEqual(list(get_overdue_tasks(self.calendar.id)), [overdue])

    def test_execute_task_rollover_moves_incomplete_tasks_to_today(self):
        task = Task.objects.create(
            calendar=self.calendar,
            creator=self.user,
            title='Move me',
            target_date=timezone.localdate() - timezone.timedelta(days=1),
        )

        result = execute_task_rollover([task.id])
        task.refresh_from_db()

        self.assertEqual(result['updated_count'], 1)
        self.assertEqual(task.target_date, timezone.localdate())
