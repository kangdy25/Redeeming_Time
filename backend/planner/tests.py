from django.test import TestCase
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.utils import timezone

from .models import Calendar, CalendarMember, Category, Event, Task


class PlannerModelTests(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(
            email='owner@example.com',
            password='secure-pass-123',
            nickname='Owner',
        )
        self.calendar = Calendar.objects.create(title='Personal Space', theme_color='#1F9D8A')

    def test_calendar_member_editor_roles_can_edit(self):
        owner = CalendarMember.objects.create(
            calendar=self.calendar,
            user=self.user,
            role=CalendarMember.Role.OWNER,
        )

        self.assertTrue(owner.can_edit)

    def test_category_rejects_invalid_hex_color(self):
        category = Category(calendar=self.calendar, name='Deep Work', color_code='teal')

        with self.assertRaises(ValidationError):
            category.full_clean()

    def test_task_and_event_attach_to_calendar(self):
        category = Category.objects.create(calendar=self.calendar, name='Deep Work', color_code='#E11D48')
        start = timezone.now()
        Event.objects.create(
            calendar=self.calendar,
            creator=self.user,
            title='Focus Block',
            start_time=start,
            end_time=start + timezone.timedelta(hours=1),
        )
        task = Task.objects.create(
            calendar=self.calendar,
            category=category,
            creator=self.user,
            title='Review plan',
            target_date=timezone.localdate(),
            priority=Task.Priority.HIGH,
        )

        self.assertEqual(self.calendar.events.count(), 1)
        self.assertEqual(self.calendar.tasks.count(), 1)
        self.assertEqual(category.tasks.first(), task)
