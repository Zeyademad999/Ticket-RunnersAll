"""
Views for users app.
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from core.permissions import IsAdmin, IsSuperAdmin
from core.exceptions import ValidationError
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
    
    @action(detail=True, methods=['post'])
    def create_credentials(self, request, pk=None):
        """
        Create portal credentials for an organizer.
        POST /api/organizers/{id}/create_credentials/
        Body: { "mobile": "01123456789", "password": "password123" }
        """
        organizer = self.get_object()
        
        mobile = request.data.get('mobile')
        password = request.data.get('password')
        
        if not mobile:
            raise ValidationError("Mobile number is required")
        
        if not password:
            raise ValidationError("Password is required")
        
        if len(password) < 6:
            raise ValidationError("Password must be at least 6 characters long")
        
        # Set mobile and password
        organizer.contact_mobile = mobile
        organizer.set_password(password)
        organizer.status = 'active'  # Activate organizer when credentials are created
        organizer.save()
        
        return Response({
            'message': 'Credentials created successfully',
            'organizer': OrganizerSerializer(organizer).data
        }, status=status.HTTP_200_OK)


class UsherViewSet(viewsets.ModelViewSet):
    queryset = Usher.objects.select_related('user').prefetch_related('events').all()
    serializer_class = UsherSerializer
    permission_classes = [IsAuthenticated, IsAdmin]
    
    def get_serializer_context(self):
        """Add request to serializer context"""
        context = super().get_serializer_context()
        context['request'] = self.request
        return context
    
    def create(self, request, *args, **kwargs):
        """Override create to handle errors better"""
        serializer = self.get_serializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {'error': serializer.errors},
                status=400
            )
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=201, headers=headers)
    
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
    
    @action(detail=True, methods=['post'])
    def create_credentials(self, request, pk=None):
        """
        Create portal credentials for a merchant.
        POST /api/merchants/{id}/create_credentials/
        Body: { "mobile": "01123456789", "password": "password123" }
        """
        merchant = self.get_object()
        
        mobile = request.data.get('mobile')
        password = request.data.get('password')
        
        if not mobile:
            raise ValidationError("Mobile number is required")
        
        if not password:
            raise ValidationError("Password is required")
        
        if len(password) < 6:
            raise ValidationError("Password must be at least 6 characters long")
        
        # Set mobile and password
        merchant.mobile_number = mobile
        merchant.set_password(password)
        merchant.status = 'active'  # Activate merchant when credentials are created
        merchant.save()
        
        return Response({
            'message': 'Credentials created successfully',
            'merchant': MerchantSerializer(merchant).data
        }, status=status.HTTP_200_OK)