import hmac
import json
from datetime import timedelta
from functools import wraps
from hashlib import sha256

from django.conf import settings
from django.contrib.auth import authenticate, login, logout, update_session_auth_hash
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import RequestDataTooBig, ValidationError
from django.core.validators import validate_email
from django.db import IntegrityError, connection, transaction
from django.http import FileResponse, Http404, JsonResponse
from django.middleware.csrf import get_token
from django.utils import timezone
from django.views.decorators.csrf import ensure_csrf_cookie

from .models import RateWindow, Workspace
from .validation import Invalid, validate_records


def failure(message, status=400):
    return JsonResponse({"error": message}, status=status)


def endpoint(methods):
    def wrap(function):
        @wraps(function)
        def call(request, *args, **kwargs):
            if request.method not in methods:
                return failure("Method not allowed.", 405)
            try:
                return function(request, *args, **kwargs)
            except (Invalid, ValidationError, ValueError, TypeError, KeyError):
                return failure("Invalid request. Check the required fields and their limits.")
            except RequestDataTooBig:
                return failure("Request is too large.", 413)

        return call

    return wrap


def payload(request):
    if request.content_type != "application/json":
        raise Invalid("JSON is required.")
    value = json.loads(
        request.body, parse_constant=lambda _: (_ for _ in ()).throw(Invalid("Non-finite number."))
    )
    if not isinstance(value, dict):
        raise Invalid("An object is required.")
    return value


def account(user):
    return {"id": user.id, "name": user.first_name, "email": user.email}


def throttle(request, scope, limit, seconds):
    raw = scope + ":" + request.META.get("REMOTE_ADDR", "unknown")
    key = hmac.new(settings.SECRET_KEY.encode(), raw.encode(), sha256).hexdigest()
    now = timezone.now()
    with transaction.atomic():
        window, _ = RateWindow.objects.get_or_create(
            key=key, defaults={"expires_at": now + timedelta(seconds=seconds)}
        )
        window = RateWindow.objects.select_for_update().get(key=key)
        if window.expires_at <= now:
            window.count = 0
            window.expires_at = now + timedelta(seconds=seconds)
        if window.count >= limit:
            return False
        window.count += 1
        window.save()
    return True


def csrf_failure(request, reason=""):
    return failure("Session verification failed. Reload and try again.", 403)


@endpoint(["GET"])
def health(request):
    with connection.cursor() as cursor:
        cursor.execute("SELECT 1")
    return JsonResponse({"status": "ready", "product": settings.PRODUCT["id"]})


@endpoint(["GET"])
@ensure_csrf_cookie
def session(request):
    return JsonResponse(
        {
            "csrfToken": get_token(request),
            "user": account(request.user) if request.user.is_authenticated else None,
        }
    )


@endpoint(["POST"])
def auth(request, action):
    values = payload(request)
    if action not in ["login", "register", "logout", "password", "delete"]:
        return failure("Unknown action.", 404)
    if action in ["login", "register", "password", "delete"] and not throttle(
        request, action, 12 if action == "login" else 6, 300
    ):
        return failure("Too many attempts. Please try again in five minutes.", 429)
    if action in ["logout", "password", "delete"]:
        if not request.user.is_authenticated:
            return failure("Sign in to continue.", 401)
        if action == "logout":
            logout(request)
            return JsonResponse({"ok": True})
        password = values.get("password", "")
        if (
            not isinstance(password, str)
            or len(password) > 128
            or not request.user.check_password(password)
        ):
            return failure("The current password is incorrect.", 400)
        if action == "delete":
            if values.get("confirmation") != "DELETE":
                return failure("Type DELETE to confirm.", 400)
            request.user.delete()
            logout(request)
            return JsonResponse({"ok": True})
        replacement = values.get("newPassword", "")
        if not isinstance(replacement, str) or len(replacement) > 128:
            raise Invalid()
        validate_password(replacement, request.user)
        request.user.set_password(replacement)
        request.user.save(update_fields=["password"])
        update_session_auth_hash(request, request.user)
        return JsonResponse({"ok": True, "csrfToken": get_token(request)})
    email = values.get("email", "")
    password = values.get("password", "")
    if (
        not isinstance(email, str)
        or not isinstance(password, str)
        or len(email) > 120
        or len(password) > 128
    ):
        raise Invalid()
    email = email.strip().lower()
    validate_email(email)
    if action == "register":
        name = values.get("name", "")
        if not isinstance(name, str) or not 2 <= len(name.strip()) <= 80:
            raise Invalid()
        candidate = User(username=email, email=email, first_name=name.strip())
        validate_password(password, candidate)
        try:
            with transaction.atomic():
                candidate.set_password(password)
                candidate.save()
                Workspace.objects.create(owner=candidate)
        except IntegrityError:
            return failure("Unable to create an account with these details.", 400)
        user = candidate
    else:
        user = authenticate(request, username=email, password=password)
        if user is None:
            return failure("Email or password is incorrect.", 400)
    login(request, user)
    return JsonResponse({"user": account(user), "csrfToken": get_token(request)})


@endpoint(["GET", "PUT"])
def workspace(request):
    if not request.user.is_authenticated:
        return failure("Sign in to continue.", 401)
    if request.method == "GET":
        space, _ = Workspace.objects.get_or_create(owner=request.user)
    else:
        values = payload(request)
        if (
            set(values) != {"revision", "records"}
            or isinstance(values["revision"], bool)
            or not isinstance(values["revision"], int)
            or values["revision"] < 0
        ):
            raise Invalid()
        records = validate_records(values["records"])
        with transaction.atomic():
            space = Workspace.objects.select_for_update().get(owner=request.user)
            if space.revision != values["revision"]:
                return failure(
                    "This workspace changed in another tab or device. Reload before editing.", 409
                )
            space.records = records
            space.revision += 1
            space.save()
    return JsonResponse({"revision": space.revision, "records": space.records})


def app(request, route=""):
    if request.method != "GET" or route.startswith(("api/", "assets/", ".")) or "." in route:
        raise Http404()
    index = settings.BASE_DIR.parent / "dist/index.html"
    if not index.is_file():
        return failure("Build the frontend before starting the production server.", 503)
    response = FileResponse(index.open("rb"), content_type="text/html")
    response["Cache-Control"] = "no-store"
    return response
