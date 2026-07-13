from datetime import date, datetime, timedelta, timezone as datetime_timezone
from io import StringIO
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.core.management import CommandError, call_command
from django.db import connection
from django.test import TestCase, override_settings
from django.test.utils import CaptureQueriesContext
from rest_framework.test import APITestCase

from .models import Calendar, CalendarMember, Category, Event, Task
from .services import (
    analyze_schedule_density,
    analyze_schedule_density_batch,
    planner_localdate,
)


UTC = datetime_timezone.utc


class PlannerListApiTests(APITestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(
            email='lists@example.com',
            password='lists-secure-password-123',
            nickname='List Owner',
        )
        self.calendar = Calendar.objects.create(title='List Calendar')
        CalendarMember.objects.create(
            calendar=self.calendar,
            user=self.user,
            role=CalendarMember.Role.OWNER,
        )
        self.other_user = get_user_model().objects.create_user(
            email='other-lists@example.com',
            password='other-lists-secure-password-123',
            nickname='Other Owner',
        )
        self.other_calendar = Calendar.objects.create(title='Private Calendar')
        CalendarMember.objects.create(
            calendar=self.other_calendar,
            user=self.other_user,
            role=CalendarMember.Role.OWNER,
        )
        self.client.force_authenticate(self.user)

    def create_event(self, title, start_time, end_time, **kwargs):
        return Event.objects.create(
            calendar=self.calendar,
            creator=self.user,
            title=title,
            start_time=start_time,
            end_time=end_time,
            **kwargs,
        )

    def test_category_lists_use_a_stable_paginated_envelope(self):
        Category.objects.create(calendar=self.calendar, name='Alpha', color_code='#123456')
        Category.objects.create(calendar=self.calendar, name='Beta', color_code='#234567')

        first_page = self.client.get(f'/api/categories/?calendar={self.calendar.id}&page_size=1')
        second_page = self.client.get(f'/api/categories/?calendar={self.calendar.id}&page_size=1&page=2')

        self.assertEqual(first_page.status_code, 200)
        self.assertEqual(set(first_page.data), {'count', 'next', 'previous', 'results'})
        self.assertEqual(first_page.data['count'], 2)
        self.assertEqual([item['name'] for item in first_page.data['results']], ['Alpha'])
        self.assertIsNotNone(first_page.data['next'])
        self.assertEqual([item['name'] for item in second_page.data['results']], ['Beta'])

    def test_event_range_uses_half_open_overlap_and_validates_inputs(self):
        range_start = datetime(2026, 7, 13, 0, tzinfo=UTC)
        range_end = datetime(2026, 7, 13, 2, tzinfo=UTC)
        self.create_event('Spans start', range_start.replace(hour=23) - timedelta(days=1), range_start.replace(hour=1))
        self.create_event('Ends at start', range_start - timedelta(hours=1), range_start)
        self.create_event('Inside range', range_start.replace(hour=1), range_start.replace(hour=1, minute=30))
        self.create_event('Starts at end', range_end, range_end.replace(hour=3))

        response = self.client.get(
            f'/api/events/?calendar={self.calendar.id}'
            '&starts_at=2026-07-13T00:00:00Z&ends_at=2026-07-13T02:00:00Z',
        )
        missing_end = self.client.get('/api/events/?starts_at=2026-07-13T00:00:00Z')
        naive_time = self.client.get(
            '/api/events/?starts_at=2026-07-13T00:00:00&ends_at=2026-07-13T02:00:00',
        )
        oversized = self.client.get(
            '/api/events/?starts_at=2026-07-01T00:00:00Z&ends_at=2026-10-03T00:00:00Z',
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            {item['title'] for item in response.data['results']},
            {'Spans start', 'Inside range'},
        )
        self.assertEqual(missing_end.status_code, 400)
        self.assertEqual(naive_time.status_code, 400)
        self.assertEqual(oversized.status_code, 400)

    def test_task_filters_are_half_open_and_do_not_disclose_private_calendar_data(self):
        Task.objects.create(
            calendar=self.calendar,
            creator=self.user,
            title='Before range',
            target_date=date(2026, 7, 10),
        )
        Task.objects.create(
            calendar=self.calendar,
            creator=self.user,
            title='Completed in range',
            target_date=date(2026, 7, 11),
            is_completed=True,
        )
        Task.objects.create(
            calendar=self.calendar,
            creator=self.user,
            title='After range',
            target_date=date(2026, 7, 12),
        )
        Task.objects.create(
            calendar=self.other_calendar,
            creator=self.other_user,
            title='Other user task',
            target_date=date(2026, 7, 11),
        )

        completed = self.client.get(
            f'/api/tasks/?calendar={self.calendar.id}&target_date_from=2026-07-11'
            '&target_date_to=2026-07-12&is_completed=true',
        )
        incomplete = self.client.get(
            f'/api/tasks/?calendar={self.calendar.id}&target_date_from=2026-07-11'
            '&target_date_to=2026-07-12&is_completed=false',
        )
        inaccessible = self.client.get(f'/api/tasks/?calendar={self.other_calendar.id}')
        malformed = self.client.get('/api/tasks/?is_completed=yes')

        self.assertEqual([item['title'] for item in completed.data['results']], ['Completed in range'])
        self.assertEqual(incomplete.data['count'], 0)
        self.assertEqual(inaccessible.data['count'], 0)
        self.assertEqual(malformed.status_code, 400)

    def test_event_list_builds_warnings_with_a_bounded_query_count(self):
        base = datetime(2026, 7, 13, 1, tzinfo=UTC)
        for index in range(12):
            start_time = base + timedelta(minutes=30 * index)
            self.create_event(
                f'Focus {index}',
                start_time,
                start_time + timedelta(minutes=45),
            )

        with CaptureQueriesContext(connection) as queries:
            response = self.client.get(f'/api/events/?calendar={self.calendar.id}&page_size=12')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data['results']), 12)
        self.assertTrue(all('congestion_warning' in item for item in response.data['results']))
        self.assertLessEqual(len(queries), 4, [query['sql'] for query in queries.captured_queries])


class PlannerServiceTests(TestCase):
    def setUp(self):
        self.calendar = Calendar.objects.create(title='Service Calendar')

    @override_settings(PLANNER_TIME_ZONE='Asia/Seoul')
    def test_density_clips_midnight_duration_and_ignores_all_day_markers(self):
        Event.objects.create(
            calendar=self.calendar,
            title='Crosses midnight',
            start_time=datetime(2026, 7, 13, 13, tzinfo=UTC),
            end_time=datetime(2026, 7, 13, 16, tzinfo=UTC),
        )
        Event.objects.create(
            calendar=self.calendar,
            title='All day marker',
            start_time=datetime(2026, 7, 12, 15, tzinfo=UTC),
            end_time=datetime(2026, 7, 13, 15, tzinfo=UTC),
            is_all_day=True,
        )

        warning = analyze_schedule_density(
            self.calendar,
            datetime(2026, 7, 13, 14, tzinfo=UTC),
            datetime(2026, 7, 13, 17, tzinfo=UTC),
        )

        self.assertEqual(warning['daily_hours'], 3.0)
        self.assertEqual(warning['overlap_count'], 1)

    def test_batch_density_matches_single_event_calculation(self):
        first = Event.objects.create(
            calendar=self.calendar,
            title='First',
            start_time=datetime(2026, 7, 13, 1, tzinfo=UTC),
            end_time=datetime(2026, 7, 13, 2, tzinfo=UTC),
        )
        second = Event.objects.create(
            calendar=self.calendar,
            title='Second',
            start_time=datetime(2026, 7, 13, 1, 30, tzinfo=UTC),
            end_time=datetime(2026, 7, 13, 3, tzinfo=UTC),
        )

        warnings = analyze_schedule_density_batch([first, second])

        for event in (first, second):
            self.assertEqual(
                warnings[event.id],
                analyze_schedule_density(
                    event.calendar,
                    event.start_time,
                    event.end_time,
                    excluded_event_id=event.id,
                    is_all_day=event.is_all_day,
                ),
            )

    @override_settings(PLANNER_TIME_ZONE='Asia/Seoul')
    def test_planner_localdate_uses_the_explicit_planner_timezone(self):
        with patch(
            'planner.services.timezone.now',
            return_value=datetime(2026, 7, 13, 15, 5, tzinfo=UTC),
        ):
            self.assertEqual(planner_localdate(), date(2026, 7, 14))


class RolloverCommandTests(TestCase):
    def setUp(self):
        self.calendar = Calendar.objects.create(title='Rollover Calendar')
        self.other_calendar = Calendar.objects.create(title='Other Rollover Calendar')
        self.overdue = Task.objects.create(
            calendar=self.calendar,
            title='Overdue',
            target_date=date(2026, 7, 10),
        )
        self.completed = Task.objects.create(
            calendar=self.calendar,
            title='Completed',
            target_date=date(2026, 7, 10),
            is_completed=True,
        )
        self.today = Task.objects.create(
            calendar=self.calendar,
            title='Today',
            target_date=date(2026, 7, 13),
        )
        self.future = Task.objects.create(
            calendar=self.calendar,
            title='Future',
            target_date=date(2026, 7, 14),
        )
        self.other_overdue = Task.objects.create(
            calendar=self.other_calendar,
            title='Other overdue',
            target_date=date(2026, 7, 10),
        )

    def test_command_rolls_over_only_incomplete_past_tasks_and_is_idempotent(self):
        original_updated_at = self.overdue.updated_at
        output = StringIO()

        call_command('rollover_overdue_tasks', '--date', '2026-07-13', stdout=output)
        self.overdue.refresh_from_db()
        self.completed.refresh_from_db()
        self.today.refresh_from_db()
        self.future.refresh_from_db()

        self.assertEqual(self.overdue.target_date, date(2026, 7, 13))
        self.assertNotEqual(self.overdue.updated_at, original_updated_at)
        self.assertEqual(self.completed.target_date, date(2026, 7, 10))
        self.assertEqual(self.today.target_date, date(2026, 7, 13))
        self.assertEqual(self.future.target_date, date(2026, 7, 14))
        self.assertIn('Rolled over 2 overdue task(s) to 2026-07-13.', output.getvalue())

        repeat_output = StringIO()
        call_command('rollover_overdue_tasks', '--date', '2026-07-13', stdout=repeat_output)
        self.assertIn('Rolled over 0 overdue task(s) to 2026-07-13.', repeat_output.getvalue())

    def test_command_supports_calendar_scope_dry_run_and_invalid_dates(self):
        output = StringIO()
        call_command(
            'rollover_overdue_tasks',
            '--date',
            '2026-07-13',
            '--calendar-id',
            str(self.calendar.id),
            '--dry-run',
            stdout=output,
        )
        self.overdue.refresh_from_db()
        self.other_overdue.refresh_from_db()

        self.assertEqual(self.overdue.target_date, date(2026, 7, 10))
        self.assertEqual(self.other_overdue.target_date, date(2026, 7, 10))
        self.assertIn('Would roll over 1 overdue task(s) to 2026-07-13.', output.getvalue())
        with self.assertRaises(CommandError):
            call_command('rollover_overdue_tasks', '--date', '2026-07-40')
