from django.urls import path
from . import views

urlpatterns = [
    path("chat/",      views.chat),
    path("inventory/", views.inventory),
    path("dashboard/", views.dashboard),
]
