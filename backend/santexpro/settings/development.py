from .base import *
import os

DEBUG = True

SECRET_KEY = os.environ.get('SECRET_KEY', 'santexpro-dev-insecure-key-only-for-local-testing-2026')

ALLOWED_HOSTS = [host.strip() for host in os.environ.get('ALLOWED_HOSTS', '127.0.0.1,localhost,testserver,backend').split(',')]

# CORS for local Vite dev
CORS_ALLOW_ALL_ORIGINS = True
CORS_ALLOW_CREDENTIALS = True

# Logging
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': os.environ.get('LOG_LEVEL', 'INFO'),
    },
}
