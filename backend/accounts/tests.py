from django.test import TestCase
from django.contrib.auth import get_user_model


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

    def test_create_user_requires_email(self):
        with self.assertRaises(ValueError):
            get_user_model().objects.create_user(email='', password='pass', nickname='Planner')
