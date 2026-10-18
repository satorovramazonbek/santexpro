from django.test import TestCase
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from rest_framework import status
from rest_framework.authtoken.models import Token


class AuthAndUserManagementTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.regular_user = User.objects.create_user(
            username='installer_bobur',
            password='Password123!',
            first_name='Bobur',
            last_name='Umarov',
            is_staff=False
        )
        self.admin_user = User.objects.create_user(
            username='super_admin',
            password='AdminPassword123!',
            first_name='Admin',
            is_staff=True,
            is_superuser=True
        )

    def test_registration_successful(self):
        response = self.client.post('/api/auth/register/', {
            'username': 'new_master',
            'email': 'master@example.com',
            'first_name': 'Xasan',
            'last_name': 'Aliyev',
            'password': 'StrongPassword2026!'
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('token', response.data)
        self.assertEqual(response.data['user']['username'], 'new_master')

    def test_registration_rejects_weak_password(self):
        # 12345 or too short
        response = self.client.post('/api/auth/register/', {
            'username': 'weak_user',
            'password': '123'
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('password', response.data)

    def test_registration_rejects_entirely_numeric_password(self):
        response = self.client.post('/api/auth/register/', {
            'username': 'numeric_pass_user',
            'password': '1234567890'
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('password', response.data)

    def test_login_successful(self):
        response = self.client.post('/api/auth/login/', {
            'username': 'installer_bobur',
            'password': 'Password123!'
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('token', response.data)
        self.assertEqual(response.data['user']['username'], 'installer_bobur')

    def test_login_invalid_password(self):
        response = self.client.post('/api/auth/login/', {
            'username': 'installer_bobur',
            'password': 'WrongPassword!'
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_me_authenticated_profile(self):
        self.client.force_authenticate(user=self.regular_user)
        response = self.client.get('/api/auth/me/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['user']['username'], 'installer_bobur')

    def test_logout_invalidates_token(self):
        token, _ = Token.objects.get_or_create(user=self.regular_user)
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + token.key)
        response = self.client.post('/api/auth/logout/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(Token.objects.filter(key=token.key).exists())

    def test_admin_users_view_forbidden_for_regular_user(self):
        self.client.force_authenticate(user=self.regular_user)
        response = self.client.get('/api/auth/admin/users/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_users_view_allowed_for_admin(self):
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get('/api/auth/admin/users/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(response.data), 2)

    def test_admin_system_stats_view_allowed_for_admin(self):
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get('/api/auth/admin/stats/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('total_users', response.data)
        self.assertIn('total_projects', response.data)
