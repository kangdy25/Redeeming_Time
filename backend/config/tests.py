import os
import subprocess
import sys
from pathlib import Path

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from rest_framework.test import APIClient


class ApiErrorContractTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_unauthenticated_error_uses_standard_contract(self):
        response = self.client.get('/api/calendars/')

        self.assertEqual(response.status_code, 401)
        self.assertEqual(set(response.data), {'error'})
        self.assertEqual(response.data['error']['code'], 'NOT_AUTHENTICATED')
        self.assertIsInstance(response.data['error']['message'], str)
        self.assertIsNone(response.data['error']['fields'])

    def test_validation_error_exposes_fields_and_readable_message(self):
        response = self.client.post(
            '/api/users/',
            {'email': 'invalid', 'password': 'short', 'nickname': ''},
            format='json',
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data['error']['code'], 'INVALID')
        self.assertIn('email', response.data['error']['fields'])
        self.assertTrue(response.data['error']['message'])


class ProductionReadinessTests(TestCase):
    def test_healthcheck_reports_database_readiness(self):
        response = self.client.get('/healthz/')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {'status': 'ok'})

    @override_settings(
        CORS_ALLOW_ALL_ORIGINS=False,
        CORS_ALLOWED_ORIGINS=['https://redeeming-time.vercel.app'],
    )
    def test_only_the_deployed_frontend_origin_receives_cors_headers(self):
        allowed = self.client.options(
            '/api/auth/token/',
            HTTP_ORIGIN='https://redeeming-time.vercel.app',
            HTTP_ACCESS_CONTROL_REQUEST_METHOD='POST',
        )
        rejected = self.client.options(
            '/api/auth/token/',
            HTTP_ORIGIN='https://malicious.example',
            HTTP_ACCESS_CONTROL_REQUEST_METHOD='POST',
        )

        self.assertEqual(allowed['Access-Control-Allow-Origin'], 'https://redeeming-time.vercel.app')
        self.assertNotIn('Access-Control-Allow-Origin', rejected)

    @override_settings(DEBUG=False, SECURE_SSL_REDIRECT=False)
    def test_api_documentation_is_staff_only_in_production(self):
        anonymous = self.client.get('/api/docs/')
        staff = get_user_model().objects.create_superuser(
            email='docs-admin@example.com',
            password='docs-admin-secure-password-123',
            nickname='Docs Admin',
        )
        self.client.force_login(staff)
        authorized = self.client.get('/api/docs/')

        self.assertEqual(anonymous.status_code, 401)
        self.assertEqual(authorized.status_code, 200)

    def test_production_deployment_check_has_no_warnings(self):
        backend_dir = Path(__file__).resolve().parents[1]
        environment = {
            **os.environ,
            'DEBUG': 'False',
            'SECRET_KEY': 'production-test-secret-key-with-sufficient-entropy-0123456789',
            'ALLOWED_HOSTS': 'api.example.com',
            'DATABASE_URL': 'postgresql://user:password@localhost:5432/redeeming_time',
            'CACHE_URL': 'redis://localhost:6379/0',
            'CORS_ALLOW_ALL_ORIGINS': 'False',
            'CORS_ALLOWED_ORIGINS': 'https://redeeming-time.vercel.app',
            'CSRF_TRUSTED_ORIGINS': 'https://redeeming-time.vercel.app',
        }

        result = subprocess.run(
            [sys.executable, 'manage.py', 'check', '--deploy'],
            cwd=backend_dir,
            env=environment,
            check=False,
            capture_output=True,
            text=True,
        )

        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertNotIn('WARNINGS', result.stdout + result.stderr)
