import time
from urllib.parse import parse_qs, urlparse
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.conf import settings
from django.core.cache import cache
from django.db import IntegrityError, transaction
from django.test import TestCase, override_settings
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from rest_framework.test import APITestCase
from rest_framework.throttling import ScopedRateThrottle
from rest_framework_simplejwt.tokens import AccessToken, RefreshToken

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

    def test_social_provider_and_subject_are_unique_when_subject_is_present(self):
        user_model = get_user_model()
        user_model.objects.create_user(
            email='first-social@example.com',
            password=None,
            nickname='First Social',
            social_provider=user_model.SocialProvider.GOOGLE,
            social_id='google-subject-1',
        )

        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                user_model.objects.create_user(
                    email='second-social@example.com',
                    password=None,
                    nickname='Second Social',
                    social_provider=user_model.SocialProvider.GOOGLE,
                    social_id='google-subject-1',
                )


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

    @override_settings(EMAIL_VERIFICATION_ENABLED=True)
    @patch('accounts.views.send_mail')
    def test_local_registration_requires_email_verification_before_login(self, send_mail_mock):
        registration = self.client.post(
            '/api/users/',
            {
                'email': 'verify-me@example.com',
                'nickname': 'Verify Me',
                'password': 'verify-me-secure-password-123',
            },
            format='json',
        )

        self.assertEqual(registration.status_code, 201)
        user = get_user_model().objects.get(email='verify-me@example.com')
        self.assertFalse(user.email_verified)
        send_mail_mock.assert_called_once()
        message = send_mail_mock.call_args.kwargs['message']
        verification_url = next(line for line in message.splitlines() if line.startswith('http'))
        token = parse_qs(urlparse(verification_url).query)['token'][0]

        blocked_login = self.client.post(
            '/api/auth/token/',
            {'email': user.email, 'password': 'verify-me-secure-password-123'},
            format='json',
        )
        self.assertEqual(blocked_login.status_code, 401)
        self.assertEqual(blocked_login.data['error']['code'], 'EMAIL_NOT_VERIFIED')

        verified = self.client.post(
            '/api/auth/email-verification/confirm/',
            {'token': token},
            format='json',
        )
        self.assertEqual(verified.status_code, 204)
        user.refresh_from_db()
        self.assertTrue(user.email_verified)
        self.assertEqual(
            self.client.post(
                '/api/auth/token/',
                {'email': user.email, 'password': 'verify-me-secure-password-123'},
                format='json',
            ).status_code,
            200,
        )

    @override_settings(EMAIL_VERIFICATION_ENABLED=True)
    @patch('accounts.views.send_mail')
    def test_email_verification_resend_hides_unknown_addresses(self, send_mail_mock):
        response = self.client.post(
            '/api/auth/email-verification/',
            {'email': self.user.email},
            format='json',
        )
        unknown = self.client.post(
            '/api/auth/email-verification/',
            {'email': 'unknown@example.com'},
            format='json',
        )

        self.assertEqual(response.status_code, 204)
        self.assertEqual(unknown.status_code, 204)
        self.assertEqual(send_mail_mock.call_count, 1)

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

    def test_current_user_endpoint_returns_the_authenticated_account(self):
        staff = get_user_model().objects.create_superuser(
            email='staff@example.com',
            password='staff-secure-password-123',
            nickname='Staff',
        )
        self.client.force_authenticate(staff)

        response = self.client.get('/api/users/me/')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['id'], staff.id)
        self.assertEqual(response.data['email'], staff.email)

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

    @override_settings(PASSWORD_RESET_EMAIL_ENABLED=True)
    @patch('accounts.views.send_mail')
    def test_password_reset_request_emails_a_one_time_link_without_revealing_unknown_accounts(
        self,
        send_mail_mock,
    ):
        response = self.client.post(
            '/api/auth/password/reset/',
            {'email': self.user.email},
            format='json',
        )
        unknown = self.client.post(
            '/api/auth/password/reset/',
            {'email': 'unknown@example.com'},
            format='json',
        )

        self.assertEqual(response.status_code, 204)
        self.assertEqual(unknown.status_code, 204)
        send_mail_mock.assert_called_once()
        message = send_mail_mock.call_args.kwargs['message']
        reset_url = next(line for line in message.splitlines() if line.startswith('http'))
        query = parse_qs(urlparse(reset_url).query)
        self.assertEqual(query['uid'], [urlsafe_base64_encode(force_bytes(self.user.pk))])
        self.assertTrue(default_token_generator.check_token(self.user, query['token'][0]))

    @override_settings(PASSWORD_RESET_EMAIL_ENABLED=False)
    def test_password_reset_request_requires_an_enabled_email_service(self):
        response = self.client.post(
            '/api/auth/password/reset/',
            {'email': self.user.email},
            format='json',
        )

        self.assertEqual(response.status_code, 503)
        self.assertEqual(response.data['error']['code'], 'PASSWORD_RESET_UNAVAILABLE')

    def test_password_reset_confirm_changes_password_and_revokes_existing_tokens(self):
        refresh = RefreshToken.for_user(self.user)
        uid = urlsafe_base64_encode(force_bytes(self.user.pk))
        token = default_token_generator.make_token(self.user)

        response = self.client.post(
            '/api/auth/password/reset/confirm/',
            {
                'uid': uid,
                'token': token,
                'new_password': 'replacement-secure-password-123',
            },
            format='json',
        )

        self.assertEqual(response.status_code, 204)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password('replacement-secure-password-123'))
        self.assertEqual(
            self.client.post('/api/auth/token/refresh/', {'refresh': str(refresh)}, format='json').status_code,
            401,
        )
        reused = self.client.post(
            '/api/auth/password/reset/confirm/',
            {
                'uid': uid,
                'token': token,
                'new_password': 'another-secure-password-123',
            },
            format='json',
        )
        self.assertEqual(reused.status_code, 400)

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


@override_settings(
    FRONTEND_ORIGIN='https://redeeming-time.vercel.app',
    SOCIAL_AUTH_GOOGLE_CLIENT_ID='google-client-id',
    SOCIAL_AUTH_GOOGLE_CLIENT_SECRET='google-client-secret',
    SOCIAL_AUTH_GOOGLE_REDIRECT_URI='https://api.example.com/api/auth/social/google/callback/',
    SOCIAL_AUTH_KAKAO_CLIENT_ID='kakao-rest-api-key',
    SOCIAL_AUTH_KAKAO_CLIENT_SECRET='kakao-client-secret',
    SOCIAL_AUTH_KAKAO_REDIRECT_URI='https://api.example.com/api/auth/social/kakao/callback/',
)
class SocialAuthApiTests(APITestCase):
    handoff_verifier = 'a' * 64

    def setUp(self):
        cache.clear()

    def _start(self, provider, handoff_verifier=None):
        response = self.client.get(
            f'/api/auth/social/{provider}/start/',
            {'handoff_verifier': handoff_verifier or self.handoff_verifier},
        )
        self.assertEqual(response.status_code, 302)
        return response, parse_qs(urlparse(response['Location']).query)

    def _frontend_query(self, response):
        self.assertEqual(response.status_code, 302)
        parsed = urlparse(response['Location'])
        self.assertEqual(parsed.scheme, 'https')
        self.assertEqual(parsed.netloc, 'redeeming-time.vercel.app')
        self.assertEqual(parsed.path, '/auth/callback')
        return parse_qs(parsed.query)

    @staticmethod
    def _google_claims(**overrides):
        claims = {
            'sub': 'google-subject-123',
            'email': 'google-user@example.com',
            'email_verified': True,
            'iss': 'https://accounts.google.com',
            'name': 'Google Planner',
            'picture': 'https://images.example.com/google-user.png',
        }
        claims.update(overrides)
        return claims

    def test_google_callback_exchanges_a_server_verified_identity_for_one_time_tokens(self):
        start_response, start_query = self._start('google')
        self.assertEqual(urlparse(start_response['Location']).netloc, 'accounts.google.com')
        self.assertEqual(start_query['client_id'], ['google-client-id'])
        self.assertEqual(start_query['scope'], ['openid email profile'])
        self.assertNotIn('access_type', start_query)

        with (
            patch('accounts.social._post_form_json', return_value={'id_token': 'signed-google-token'}) as post_form,
            patch('accounts.social.verify_google_id_token', return_value=self._google_claims()) as verify_token,
        ):
            callback = self.client.get(
                '/api/auth/social/google/callback/',
                {'code': 'provider-code', 'state': start_query['state'][0]},
            )

        callback_query = self._frontend_query(callback)
        self.assertEqual(set(callback_query), {'code'})
        self.assertNotIn('access', callback['Location'])
        self.assertNotIn('refresh', callback['Location'])
        self.assertEqual(callback['Cache-Control'], 'no-store')
        self.assertEqual(callback['Referrer-Policy'], 'no-referrer')
        handoff_code = callback_query['code'][0]

        post_form.assert_called_once()
        self.assertEqual(post_form.call_args.args[0], 'https://oauth2.googleapis.com/token')
        self.assertEqual(post_form.call_args.args[1]['client_id'], 'google-client-id')
        self.assertEqual(post_form.call_args.args[1]['client_secret'], 'google-client-secret')
        self.assertEqual(
            post_form.call_args.args[1]['redirect_uri'],
            'https://api.example.com/api/auth/social/google/callback/',
        )
        verify_token.assert_called_once_with('signed-google-token', 'google-client-id')

        wrong_browser = self.client.post(
            '/api/auth/social/exchange/',
            {'code': handoff_code, 'verifier': 'b' * 64},
            format='json',
        )
        self.assertEqual(wrong_browser.status_code, 400)
        self.assertEqual(wrong_browser.data['error']['code'], 'INVALID_SOCIAL_HANDOFF_CODE')

        exchange = self.client.post(
            '/api/auth/social/exchange/',
            {'code': handoff_code, 'verifier': self.handoff_verifier},
            format='json',
        )
        self.assertEqual(exchange.status_code, 200)
        self.assertEqual(set(exchange.data), {'access', 'refresh'})
        self.assertEqual(exchange['Cache-Control'], 'no-store')
        self.assertEqual(exchange['Pragma'], 'no-cache')
        user = get_user_model().objects.get(email='google-user@example.com')
        self.assertEqual(user.social_provider, user.SocialProvider.GOOGLE)
        self.assertEqual(user.social_id, 'google-subject-123')
        self.assertEqual(int(AccessToken(exchange.data['access'])['user_id']), user.id)

        reused = self.client.post(
            '/api/auth/social/exchange/',
            {'code': handoff_code, 'verifier': self.handoff_verifier},
            format='json',
        )
        self.assertEqual(reused.status_code, 400)
        self.assertEqual(reused.data['error']['code'], 'INVALID_SOCIAL_HANDOFF_CODE')

    def test_callback_state_is_bound_to_the_session_and_consumed_after_its_callback(self):
        _, start_query = self._start('google')
        state = start_query['state'][0]

        with patch('accounts.social._post_form_json') as post_form:
            invalid = self.client.get(
                '/api/auth/social/google/callback/',
                {'code': 'provider-code', 'state': 'wrong-state'},
            )
            replayed = self.client.get(
                '/api/auth/social/google/callback/',
                {'code': 'provider-code', 'state': state},
            )

        self.assertEqual(self._frontend_query(invalid), {'error': ['INVALID_STATE']})
        self.assertEqual(self._frontend_query(replayed), {'error': ['OAUTH_FAILED']})
        post_form.assert_called_once()

    def test_multiple_pending_states_for_the_same_provider_do_not_overwrite_each_other(self):
        _, first_start = self._start('google', 'a' * 64)
        _, second_start = self._start('google', 'b' * 64)

        with (
            patch('accounts.social._post_form_json', return_value={'id_token': 'signed-google-token'}),
            patch('accounts.social.verify_google_id_token', return_value=self._google_claims()),
        ):
            first_callback = self.client.get(
                '/api/auth/social/google/callback/',
                {'code': 'first-provider-code', 'state': first_start['state'][0]},
            )
            second_callback = self.client.get(
                '/api/auth/social/google/callback/',
                {'code': 'second-provider-code', 'state': second_start['state'][0]},
            )

        self.assertEqual(set(self._frontend_query(first_callback)), {'code'})
        self.assertEqual(set(self._frontend_query(second_callback)), {'code'})

    def test_expired_callback_state_redirects_without_calling_the_provider(self):
        _, start_query = self._start('google')
        session = self.client.session
        states = session['social_auth_states']
        states[start_query['state'][0]]['expires_at'] = time.time() - 1
        session['social_auth_states'] = states
        session.save()

        with patch('accounts.social._post_form_json') as post_form:
            response = self.client.get(
                '/api/auth/social/google/callback/',
                {'code': 'provider-code', 'state': start_query['state'][0]},
            )

        self.assertEqual(self._frontend_query(response), {'error': ['INVALID_STATE']})
        post_form.assert_not_called()

    def test_provider_cancellation_redirects_to_a_safe_frontend_error(self):
        _, start_query = self._start('google')

        response = self.client.get(
            '/api/auth/social/google/callback/',
            {'error': 'access_denied', 'state': start_query['state'][0]},
        )

        self.assertEqual(self._frontend_query(response), {'error': ['ACCESS_DENIED']})

    def test_missing_provider_configuration_and_unknown_provider_stay_on_frontend_callback(self):
        with override_settings(SOCIAL_AUTH_GOOGLE_CLIENT_SECRET=''):
            missing_configuration = self.client.get('/api/auth/social/google/start/')
        unknown_provider = self.client.get('/api/auth/social/github/start/')

        self.assertEqual(
            self._frontend_query(missing_configuration),
            {'error': ['PROVIDER_UNAVAILABLE']},
        )
        self.assertEqual(self._frontend_query(unknown_provider), {'error': ['PROVIDER_UNAVAILABLE']})

    def test_production_requires_an_explicit_registered_callback_url(self):
        with override_settings(DEBUG=False, SOCIAL_AUTH_GOOGLE_REDIRECT_URI=''):
            response = self.client.get('/api/auth/social/google/start/')

        self.assertEqual(self._frontend_query(response), {'error': ['PROVIDER_UNAVAILABLE']})

    def test_existing_local_email_is_not_linked_to_google_and_redirects_with_conflict(self):
        get_user_model().objects.create_user(
            email='google-user@example.com',
            password='local-secure-password-123',
            nickname='Local Account',
        )
        _, start_query = self._start('google')

        with (
            patch('accounts.social._post_form_json', return_value={'id_token': 'signed-google-token'}),
            patch('accounts.social.verify_google_id_token', return_value=self._google_claims()),
        ):
            response = self.client.get(
                '/api/auth/social/google/callback/',
                {'code': 'provider-code', 'state': start_query['state'][0]},
            )

        self.assertEqual(self._frontend_query(response), {'error': ['ACCOUNT_CONFLICT']})
        self.assertEqual(get_user_model().objects.filter(email='google-user@example.com').count(), 1)

    def test_existing_kakao_email_is_not_linked_to_google(self):
        user_model = get_user_model()
        user_model.objects.create_user(
            email='google-user@example.com',
            password=None,
            nickname='Existing Kakao Account',
            social_provider=user_model.SocialProvider.KAKAO,
            social_id='kakao-subject-123',
        )
        _, start_query = self._start('google')

        with (
            patch('accounts.social._post_form_json', return_value={'id_token': 'signed-google-token'}),
            patch('accounts.social.verify_google_id_token', return_value=self._google_claims()),
        ):
            response = self.client.get(
                '/api/auth/social/google/callback/',
                {'code': 'provider-code', 'state': start_query['state'][0]},
            )

        self.assertEqual(self._frontend_query(response), {'error': ['ACCOUNT_CONFLICT']})
        self.assertEqual(get_user_model().objects.filter(email='google-user@example.com').count(), 1)

    def test_inactive_social_identity_is_rejected_before_a_handoff_code_is_issued(self):
        user_model = get_user_model()
        user_model.objects.create_user(
            email='google-user@example.com',
            password=None,
            nickname='Disabled Google Account',
            social_provider=user_model.SocialProvider.GOOGLE,
            social_id='google-subject-123',
            is_active=False,
        )
        _, start_query = self._start('google')

        with (
            patch('accounts.social._post_form_json', return_value={'id_token': 'signed-google-token'}),
            patch('accounts.social.verify_google_id_token', return_value=self._google_claims()),
        ):
            response = self.client.get(
                '/api/auth/social/google/callback/',
                {'code': 'provider-code', 'state': start_query['state'][0]},
            )

        self.assertEqual(self._frontend_query(response), {'error': ['ACCOUNT_DISABLED']})

    def test_google_requires_a_verified_email_and_a_google_issuer(self):
        _, unverified_start = self._start('google')
        with (
            patch('accounts.social._post_form_json', return_value={'id_token': 'signed-google-token'}),
            patch(
                'accounts.social.verify_google_id_token',
                return_value=self._google_claims(email_verified=False),
            ),
        ):
            unverified = self.client.get(
                '/api/auth/social/google/callback/',
                {'code': 'provider-code', 'state': unverified_start['state'][0]},
            )

        _, bad_issuer_start = self._start('google')
        with (
            patch('accounts.social._post_form_json', return_value={'id_token': 'signed-google-token'}),
            patch(
                'accounts.social.verify_google_id_token',
                return_value=self._google_claims(iss='https://malicious.example'),
            ),
        ):
            bad_issuer = self.client.get(
                '/api/auth/social/google/callback/',
                {'code': 'provider-code', 'state': bad_issuer_start['state'][0]},
            )

        self.assertEqual(self._frontend_query(unverified), {'error': ['OAUTH_FAILED']})
        self.assertEqual(self._frontend_query(bad_issuer), {'error': ['OAUTH_FAILED']})
        self.assertFalse(get_user_model().objects.filter(email='google-user@example.com').exists())

    def test_kakao_exchanges_code_with_its_secret_and_requires_verified_email(self):
        start_response, start_query = self._start('kakao')
        self.assertEqual(urlparse(start_response['Location']).netloc, 'kauth.kakao.com')
        self.assertEqual(start_query['client_id'], ['kakao-rest-api-key'])
        self.assertNotIn('client_secret', start_query)

        kakao_user_info = {
            'id': 123456789,
            'kakao_account': {
                'email': 'kakao-user@example.com',
                'is_email_valid': True,
                'is_email_verified': True,
                'profile': {
                    'nickname': 'Kakao Planner',
                    'profile_image_url': 'https://images.example.com/kakao-user.png',
                },
            },
        }
        with (
            patch('accounts.social._post_form_json', return_value={'access_token': 'kakao-access-token'}) as post_form,
            patch('accounts.social._get_json', return_value=kakao_user_info) as get_json,
        ):
            callback = self.client.get(
                '/api/auth/social/kakao/callback/',
                {'code': 'provider-code', 'state': start_query['state'][0]},
            )

        handoff_code = self._frontend_query(callback)['code'][0]
        self.assertEqual(post_form.call_args.args[0], 'https://kauth.kakao.com/oauth/token')
        self.assertEqual(post_form.call_args.args[1]['client_secret'], 'kakao-client-secret')
        self.assertEqual(get_json.call_args.args[0], 'https://kapi.kakao.com/v2/user/me')
        self.assertEqual(get_json.call_args.args[1], {'Authorization': 'Bearer kakao-access-token'})

        exchange = self.client.post(
            '/api/auth/social/exchange/',
            {'code': handoff_code, 'verifier': self.handoff_verifier},
            format='json',
        )
        self.assertEqual(exchange.status_code, 200)
        user = get_user_model().objects.get(email='kakao-user@example.com')
        self.assertEqual(user.social_provider, user.SocialProvider.KAKAO)
        self.assertEqual(user.social_id, '123456789')

    def test_kakao_rejects_an_unverified_email(self):
        _, start_query = self._start('kakao')
        with (
            patch('accounts.social._post_form_json', return_value={'access_token': 'kakao-access-token'}),
            patch(
                'accounts.social._get_json',
                return_value={
                    'id': 123456789,
                    'kakao_account': {
                        'email': 'kakao-user@example.com',
                        'is_email_valid': True,
                        'is_email_verified': False,
                    },
                },
            ),
        ):
            response = self.client.get(
                '/api/auth/social/kakao/callback/',
                {'code': 'provider-code', 'state': start_query['state'][0]},
            )

        self.assertEqual(self._frontend_query(response), {'error': ['OAUTH_FAILED']})
        self.assertFalse(get_user_model().objects.filter(email='kakao-user@example.com').exists())

    def test_social_start_uses_its_dedicated_scoped_throttle(self):
        throttle_rates = {
            **settings.REST_FRAMEWORK['DEFAULT_THROTTLE_RATES'],
            'social_auth_start': '1/minute',
        }
        with patch.object(ScopedRateThrottle, 'THROTTLE_RATES', throttle_rates):
            cache.clear()
            first, _ = self._start('google')
            second = self.client.get('/api/auth/social/google/start/')

        self.assertEqual(urlparse(first['Location']).netloc, 'accounts.google.com')
        self.assertEqual(self._frontend_query(second), {'error': ['RATE_LIMITED']})
