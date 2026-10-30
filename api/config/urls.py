from django.urls import path, re_path

from workspace import views

urlpatterns = [
    path("api/health", views.health),
    path("api/session", views.session),
    path("api/auth/<str:action>", views.auth),
    path("api/workspace", views.workspace),
    re_path(r"^(?P<route>.*)$", views.app),
]
