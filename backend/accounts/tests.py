from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import TestCase
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from planner.models import Calendar, CalendarMember, Task


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


class AccountApiSecurityTests(APITestCase):
    def setUp(self):
        cache.clear()
        self.user = get_user_model().objects.create_user(
            email='account@example.com',
            password='current-secure-password-123',
            nickname='Account Owner',
        )

    def test_registration_requires_a_valid_local_password_and_ignores_social_identity_claims(self):
        missing_password = self.client.post(
            '/api/users/',
            {'email': 'missing@example.com', 'nickname': 'Missing Password'},
            format='json',
        )
        numeric_password = self.client.post(
            '/api/users/',
            {'email': 'numeric@example.com', 'nickname': 'Numeric', 'password': '12345678'},
            format='json',
        )
        response = self.client.post(
            '/api/users/',
            {
                'email': 'normal@example.com',
                'nickname': 'Normal User',
                'password': 'normal-secure-password-123',
                'social_provider': 'GOOGLE',
                'social_id': 'forged-provider-id',
            },
            format='json',
        )

        self.assertEqual(missing_password.status_code, 400)
        self.assertEqual(numeric_password.status_code, 400)
        self.assertEqual(response.status_code, 201)
        registered = get_user_model().objects.get(email='normal@example.com')
        self.assertEqual(registered.social_provider, 'LOCAL')
        self.assertEqual(registered.social_id, '')
        self.assertNotIn('social_id', response.data)

    def test_profile_endpoint_cannot_change_email_or_password(self):
        self.client.force_authenticate(self.user)

        email_response = self.client.patch(
            f'/api/users/{self.user.id}/',
            {'email': 'changed@example.com'},
            format='json',
        )
        password_response = self.client.patch(
            f'/api/users/{self.user.id}/',
            {'password': 'replacement-secure-password-123'},
            format='json',
        )

        self.assertEqual(email_response.status_code, 400)
        self.assertEqual(password_response.status_code, 400)
        self.user.refresh_from_db()
        self.assertEqual(self.user.email, 'account@example.com')
        self.assertTrue(self.user.check_password('current-secure-password-123'))

    def test_password_change_requires_current_password_and_revokes_existing_tokens(self):
        refresh = RefreshToken.for_user(self.user)
        access = str(refresh.access_token)
        self.client.force_authenticate(self.user)

        wrong_password = self.client.post(
            '/api/auth/password/change/',
            {'current_password': 'wrong-password', 'new_password': 'replacement-secure-password-123'},
            format='json',
        )
        changed = self.client.post(
            '/api/auth/password/change/',
            {
                'current_password': 'current-secure-password-123',
                'new_password': 'replacement-secure-password-123',
            },
            format='json',
        )

        self.assertEqual(wrong_password.status_code, 400)
        self.assertEqual(changed.status_code, 204)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password('replacement-secure-password-123'))

        self.client.force_authenticate(user=None)
        old_refresh = self.client.post('/api/auth/token/refresh/', {'refresh': str(refresh)}, format='json')
        old_access = self.client.get('/api/calendars/', HTTP_AUTHORIZATION=f'Bearer {access}')

        self.assertEqual(old_refresh.status_code, 401)
        self.assertEqual(old_access.status_code, 401)

    def test_login_and_registration_are_rate_limited(self):
        for _ in range(5):
            login = self.client.post(
                '/api/auth/token/',
                {'email': self.user.email, 'password': 'wrong-password'},
                format='json',
            )
            self.assertEqual(login.status_code, 401)
        blocked_login = self.client.post(
            '/api/auth/token/',
            {'email': self.user.email, 'password': 'wrong-password'},
            format='json',
        )

        cache.clear()
        for _ in range(5):
            registration = self.client.post('/api/users/', {}, format='json')
            self.assertEqual(registration.status_code, 400)
        blocked_registration = self.client.post('/api/users/', {}, format='json')

        self.assertEqual(blocked_login.status_code, 429)
        self.assertEqual(blocked_registration.status_code, 429)

    def test_account_deletion_requires_ownership_transfer_for_shared_calendar(self):
        shared_calendar = Calendar.objects.create(title='Shared Calendar')
        CalendarMember.objects.create(
            calendar=shared_calendar,
            user=self.user,
            role=CalendarMember.Role.OWNER,
        )
        collaborator = get_user_model().objects.create_user(
            email='collaborator@example.com',
            password='collaborator-secure-password-123',
            nickname='Collaborator',
        )
        CalendarMember.objects.create(
            calendar=shared_calendar,
            user=collaborator,
            role=CalendarMember.Role.EDITOR,
        )

        self.client.force_authenticate(self.user)
        response = self.client.delete(f'/api/users/{self.user.id}/')

        self.assertEqual(response.status_code, 400)
        self.assertTrue(get_user_model().objects.filter(pk=self.user.pk).exists())
        self.assertTrue(
            CalendarMember.objects.filter(
                calendar=shared_calendar,
                role=CalendarMember.Role.OWNER,
            ).exists(),
        )

    def test_account_deletion_removes_private_calendars_and_preserves_shared_tasks(self):
        private_calendar = CalendarMember.objects.get(user=self.user).calendar
        shared_calendar = Calendar.objects.create(title='Owned Together')
        CalendarMember.objects.create(
            calendar=shared_calendar,
            user=self.user,
            role=CalendarMember.Role.OWNER,
        )
        second_owner = get_user_model().objects.create_user(
            email='second-owner@example.com',
            password='second-owner-secure-password-123',
            nickname='Second Owner',
        )
        CalendarMember.objects.create(
            calendar=shared_calendar,
            user=second_owner,
            role=CalendarMember.Role.OWNER,
        )
        shared_task = Task.objects.create(
            calendar=shared_calendar,
            creator=self.user,
            title='Retain after account deletion',
            target_date='2026-07-13',
        )

        self.client.force_authenticate(self.user)
        response = self.client.delete(f'/api/users/{self.user.id}/')

        self.assertEqual(response.status_code, 204)
        self.assertFalse(Calendar.objects.filter(pk=private_calendar.pk).exists())
        shared_task.refresh_from_db()
        self.assertIsNone(shared_task.creator)
