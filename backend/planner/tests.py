from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APITestCase

from .models import Calendar, CalendarMember, Category, Event, EventAttendee, Task
from .serializers import CategorySerializer, EventSerializer, TaskSerializer


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

    def test_global_calendar_allows_shared_tasks_but_rejects_events(self):
        global_calendar = CalendarMember.objects.get(user=self.user).calendar
        start = timezone.now()

        category = CategorySerializer(data={
            'calendar': global_calendar.id,
            'name': 'General',
            'color_code': '#E11D48',
        })
        event = EventSerializer(data={
            'calendar': global_calendar.id,
            'title': 'Should not save',
            'start_time': start,
            'end_time': start + timezone.timedelta(hours=1),
        })
        task = TaskSerializer(data={
            'calendar': global_calendar.id,
            'title': 'Should not save',
            'target_date': timezone.localdate(),
        })

        self.assertTrue(category.is_valid())
        self.assertFalse(event.is_valid())
        self.assertTrue(task.is_valid())


class PlannerAuthorizationTests(APITestCase):
    def setUp(self):
        self.owner = get_user_model().objects.create_user(
            email='api-owner@example.com',
            password='api-owner-secure-password-123',
            nickname='API Owner',
        )
        self.viewer = get_user_model().objects.create_user(
            email='api-viewer@example.com',
            password='api-viewer-secure-password-123',
            nickname='API Viewer',
        )
        self.source_calendar = Calendar.objects.create(title='Source Calendar')
        self.target_calendar = Calendar.objects.create(title='Target Calendar')
        CalendarMember.objects.create(
            calendar=self.source_calendar,
            user=self.owner,
            role=CalendarMember.Role.OWNER,
        )
        CalendarMember.objects.create(
            calendar=self.target_calendar,
            user=self.owner,
            role=CalendarMember.Role.VIEWER,
        )
        CalendarMember.objects.create(
            calendar=self.source_calendar,
            user=self.viewer,
            role=CalendarMember.Role.VIEWER,
        )
        self.category = Category.objects.create(
            calendar=self.source_calendar,
            name='Source Category',
            color_code='#E11D48',
        )
        start = timezone.now()
        self.event = Event.objects.create(
            calendar=self.source_calendar,
            creator=self.owner,
            title='Source Event',
            start_time=start,
            end_time=start + timezone.timedelta(hours=1),
        )
        self.target_event = Event.objects.create(
            calendar=self.target_calendar,
            creator=self.owner,
            title='Target Event',
            start_time=start + timezone.timedelta(hours=2),
            end_time=start + timezone.timedelta(hours=3),
        )
        self.task = Task.objects.create(
            calendar=self.source_calendar,
            creator=self.owner,
            title='Source Task',
            target_date=timezone.localdate(),
        )

    def test_cannot_move_resources_into_a_calendar_without_edit_access(self):
        attendee = EventAttendee.objects.create(event=self.event, user=self.owner)
        self.client.force_authenticate(self.owner)

        category_response = self.client.patch(
            f'/api/categories/{self.category.id}/',
            {'calendar': self.target_calendar.id},
            format='json',
        )
        event_response = self.client.patch(
            f'/api/events/{self.event.id}/',
            {'calendar': self.target_calendar.id},
            format='json',
        )
        task_response = self.client.patch(
            f'/api/tasks/{self.task.id}/',
            {'calendar': self.target_calendar.id},
            format='json',
        )
        attendee_response = self.client.patch(
            f'/api/event-attendees/{attendee.id}/',
            {'event': self.target_event.id},
            format='json',
        )

        self.assertEqual(category_response.status_code, 400)
        self.assertEqual(event_response.status_code, 400)
        self.assertEqual(task_response.status_code, 400)
        self.assertEqual(attendee_response.status_code, 400)
        self.category.refresh_from_db()
        self.event.refresh_from_db()
        self.task.refresh_from_db()
        attendee.refresh_from_db()
        self.assertEqual(self.category.calendar, self.source_calendar)
        self.assertEqual(self.event.calendar, self.source_calendar)
        self.assertEqual(self.task.calendar, self.source_calendar)
        self.assertEqual(attendee.event, self.event)

    def test_calendar_membership_cannot_be_reassigned_to_escalate_privileges(self):
        membership = CalendarMember.objects.get(calendar=self.source_calendar, user=self.owner)
        self.client.force_authenticate(self.owner)

        response = self.client.patch(
            f'/api/calendar-members/{membership.id}/',
            {
                'calendar': self.target_calendar.id,
                'user': self.owner.id,
                'role': CalendarMember.Role.OWNER,
            },
            format='json',
        )

        self.assertEqual(response.status_code, 400)
        self.assertFalse(
            CalendarMember.objects.filter(
                calendar=self.target_calendar,
                user=self.owner,
                role=CalendarMember.Role.OWNER,
            ).exists(),
        )

    def test_only_owner_can_delete_calendar_and_membership_list_is_owner_only(self):
        editor = get_user_model().objects.create_user(
            email='api-editor@example.com',
            password='api-editor-secure-password-123',
            nickname='API Editor',
        )
        CalendarMember.objects.create(
            calendar=self.source_calendar,
            user=editor,
            role=CalendarMember.Role.EDITOR,
        )

        self.client.force_authenticate(editor)
        editor_delete = self.client.delete(f'/api/calendars/{self.source_calendar.id}/')
        viewer_members = self.client.get('/api/calendar-members/')

        self.client.force_authenticate(self.owner)
        owner_members = self.client.get('/api/calendar-members/')

        self.assertEqual(editor_delete.status_code, 403)
        self.assertTrue(Calendar.objects.filter(pk=self.source_calendar.pk).exists())
        self.assertEqual(viewer_members.status_code, 200)
        self.assertNotIn(
            self.source_calendar.id,
            [member['calendar'] for member in viewer_members.data],
        )
        self.assertEqual(owner_members.status_code, 200)
        self.assertGreaterEqual(len(owner_members.data), 3)

    def test_cannot_remove_or_demote_the_last_calendar_owner(self):
        membership = CalendarMember.objects.get(calendar=self.source_calendar, user=self.owner)
        self.client.force_authenticate(self.owner)

        demote = self.client.patch(
            f'/api/calendar-members/{membership.id}/',
            {'role': CalendarMember.Role.VIEWER},
            format='json',
        )
        delete = self.client.delete(f'/api/calendar-members/{membership.id}/')

        self.assertEqual(demote.status_code, 400)
        self.assertEqual(delete.status_code, 400)
        self.assertTrue(
            CalendarMember.objects.filter(
                calendar=self.source_calendar,
                user=self.owner,
                role=CalendarMember.Role.OWNER,
            ).exists(),
        )
