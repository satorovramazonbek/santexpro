from .base import *

DEBUG = False
SECRET_KEY = 'santexpro-test-key-strictly-for-automated-tests'
ALLOWED_HOSTS = ['*']

# Fast password hasher for tests
PASSWORD_HASHERS = [
    'django.contrib.auth.hashers.MD5PasswordHasher',
]

# Disable throttling during automated test suites
REST_FRAMEWORK['DEFAULT_THROTTLING_RATES'] = {
    'anon': '10000/minute',
    'user': '10000/minute',
}

EMAIL_BACKEND = 'django.core.mail.backends.locmem.EmailBackend'
