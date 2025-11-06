"""
URL configuration for users app.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import OrganizerViewSet, UsherViewSet, AdminUserViewSet, MerchantViewSet

router = DefaultRouter()
router.register(r'organizers', OrganizerViewSet, basename='organizer')
router.register(r'ushers', UsherViewSet, basename='usher')
router.register(r'admins', AdminUserViewSet, basename='admin')
router.register(r'merchants', MerchantViewSet, basename='merchant')

urlpatterns = [
    path('', include(router.urls)),
]

