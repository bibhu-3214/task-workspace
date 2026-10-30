from django.conf import settings
from django.db import models


class Workspace(models.Model):
    owner = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    records = models.JSONField(default=list)
    revision = models.PositiveIntegerField(default=0)
    updated_at = models.DateTimeField(auto_now=True)


class RateWindow(models.Model):
    key = models.CharField(max_length=64, primary_key=True)
    count = models.PositiveIntegerField(default=0)
    expires_at = models.DateTimeField()
