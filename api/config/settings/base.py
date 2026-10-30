import json
import os
import secrets
from pathlib import Path

import dj_database_url
from django.core.exceptions import ImproperlyConfigured

BASE_DIR = Path(__file__).resolve().parents[2]
PRODUCT = json.loads((BASE_DIR.parent / "product.json").read_text())
DEBUG = os.environ.get("APP_ENV") == "development"
SECRET_KEY = os.environ.get("SECRET_KEY", "")
if DEBUG and not SECRET_KEY:
    private = BASE_DIR / ".local"
    private.mkdir(mode=0o700, exist_ok=True)
    secret_file = private / "secret"
    if not secret_file.exists():
        fd = os.open(secret_file, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        with os.fdopen(fd, "w") as output:
            output.write(secrets.token_urlsafe(64))
    SECRET_KEY = secret_file.read_text()
if len(SECRET_KEY) < 50:
    raise ImproperlyConfigured("Set a private SECRET_KEY of at least 50 characters.")
DATABASES = {"default": dj_database_url.parse(os.environ["DATABASE_URL"], conn_max_age=60)}
if DATABASES["default"]["ENGINE"] != "django.db.backends.postgresql":
    raise ImproperlyConfigured("PostgreSQL is required for atomic workspace revisions.")
ALLOWED_HOSTS = (
    ["127.0.0.1", "localhost", "testserver"]
    if DEBUG
    else os.environ.get("ALLOWED_HOSTS", "").split(",")
)
if not DEBUG and (not all(ALLOWED_HOSTS) or "*" in ALLOWED_HOSTS):
    raise ImproperlyConfigured("Configure explicit production ALLOWED_HOSTS.")
INSTALLED_APPS = [
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.staticfiles",
    "workspace",
]
MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "workspace.middleware.Headers",
]
ROOT_URLCONF = "config.urls"
WSGI_APPLICATION = "config.wsgi.application"
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
USE_TZ = True
TIME_ZONE = "UTC"
STATIC_URL = "/assets/"
STATIC_ROOT = BASE_DIR.parent / "dist/assets"
WHITENOISE_ROOT = BASE_DIR.parent / "dist"
SESSION_COOKIE_NAME = PRODUCT["storageNamespace"] + "_session"
CSRF_COOKIE_NAME = PRODUCT["storageNamespace"] + "_csrf"
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = "Lax"
CSRF_COOKIE_SAMESITE = "Lax"
SESSION_COOKIE_SECURE = not DEBUG
CSRF_COOKIE_SECURE = not DEBUG
SESSION_COOKIE_AGE = 60 * 60 * 12
SESSION_EXPIRE_AT_BROWSER_CLOSE = True
SECURE_SSL_REDIRECT = not DEBUG
SECURE_HSTS_SECONDS = 31536000 if not DEBUG else 0
SECURE_HSTS_INCLUDE_SUBDOMAINS = not DEBUG
SECURE_HSTS_PRELOAD = not DEBUG
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = "DENY"
SECURE_REFERRER_POLICY = "same-origin"
CSRF_FAILURE_VIEW = "workspace.views.csrf_failure"
PASSWORD_HASHERS = ["django.contrib.auth.hashers.Argon2PasswordHasher"]
AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
        "OPTIONS": {"min_length": 12},
    },
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]
DATA_UPLOAD_MAX_MEMORY_SIZE = 2_000_000
FILE_UPLOAD_MAX_MEMORY_SIZE = 130_000

# Enable only behind an ingress that strips untrusted forwarded-protocol headers.
if os.environ.get("TRUSTED_PROXY_TLS") == "1":
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
