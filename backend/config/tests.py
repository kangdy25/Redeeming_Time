from django.test import TestCase
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
