from django.test import TestCase
from django.contrib.auth import get_user_model

from planner.models import CalendarMember


class UserManagerTests(TestCase):
    def test_create_user_normalizes_email_and_sets_password(self):
        user = get_user_model().objects.create_user(
            email='Planner@Example.COM',
            password='secure-pass-123',
            nickname='Planner',
        )

        self.assertEqual(user.email, 'Planner@example.com')
        self.assertTrue(user.check_password('secure-pass-123'))
        self.assertEqual(user.social_provider, 'LOCAL')

    def test_create_user_creates_owned_default_workspace(self):
        user = get_user_model().objects.create_user(
            email='workspace@example.com',
            password='secure-pass-123',
            nickname='Workspace Owner',
        )

        membership = CalendarMember.objects.get(user=user)
        self.assertEqual(membership.calendar.title, '전체 캘린더')
        self.assertEqual(membership.role, CalendarMember.Role.OWNER)

    def test_each_user_gets_a_separate_default_workspace(self):
        first_user = get_user_model().objects.create_user(
            email='first@example.com',
            password='secure-pass-123',
            nickname='First Owner',
        )
        second_user = get_user_model().objects.create_user(
            email='second@example.com',
            password='secure-pass-123',
            nickname='Second Owner',
        )

        first_calendar_id = CalendarMember.objects.get(user=first_user).calendar_id
        second_calendar_id = CalendarMember.objects.get(user=second_user).calendar_id

        self.assertNotEqual(first_calendar_id, second_calendar_id)

    def test_create_user_requires_email(self):
        with self.assertRaises(ValueError):
            get_user_model().objects.create_user(email='', password='pass', nickname='Planner')
