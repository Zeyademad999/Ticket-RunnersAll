"""
Views for users app.
"""
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from core.permissions import IsAdmin, IsSuperAdmin
from .models import Organizer, Usher, Merchant
from authentication.models import AdminUser
from .serializers import OrganizerSerializer, UsherSerializer, MerchantSerializer, AdminUserSerializer


class OrganizerViewSet(viewsets.ModelViewSet):
    queryset = Organizer.objects.select_related('user').all()
    serializer_class = OrganizerSerializer
    permission_classes = [IsAuthenticated, IsAdmin]
    
    @action(detail=True, methods=['put'])
    def verify(self, request, pk=None):
        organizer = self.get_object()
        organizer.verified = True
        organizer.save()
        return Response(OrganizerSerializer(organizer).data)


class UsherViewSet(viewsets.ModelViewSet):
    queryset = Usher.objects.select_related('user').all()
    serializer_class = UsherSerializer
    permission_classes = [IsAuthenticated, IsAdmin]
    
    @action(detail=True, methods=['post'])
    def assign_event(self, request, pk=None):
        return Response({'message': 'Usher assigned to event'})


class AdminUserViewSet(viewsets.ModelViewSet):
    queryset = AdminUser.objects.all()
    serializer_class = AdminUserSerializer
    permission_classes = [IsAuthenticated, IsSuperAdmin]


class MerchantViewSet(viewsets.ModelViewSet):
    queryset = Merchant.objects.select_related('user').all()
    serializer_class = MerchantSerializer
    permission_classes = [IsAuthenticated, IsAdmin]
    
    @action(detail=True, methods=['put'])
    def verify(self, request, pk=None):
        merchant = self.get_object()
        merchant.verification_status = 'verified'
        merchant.save()
        return Response(MerchantSerializer(merchant).data)
