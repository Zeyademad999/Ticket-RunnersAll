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
    def create_credentials(self, request, pk=None):
        """
        Create EVS portal credentials for an usher.
        POST /api/ushers/{id}/create_credentials/
        Body: { 
            "username": "usher1", 
            "password": "password123",
            "event_ids": [1, 2, 3]  // Optional: assign to events
        }
        """
        usher = self.get_object()
        
        username = request.data.get('username')
        password = request.data.get('password')
        event_ids = request.data.get('event_ids', [])
        
        if not username:
            raise ValidationError("Username is required")
        
        if not password:
            raise ValidationError("Password is required")
        
        if len(password) < 6:
            raise ValidationError("Password must be at least 6 characters long")
        
        # Check if username already exists (for different usher)
        existing_user = AdminUser.objects.filter(username=username).exclude(id=usher.user.id if usher.user else None).first()
        if existing_user:
            raise ValidationError(f"Username '{username}' is already taken by another user")
        
        # Create or update AdminUser
        if usher.user:
            # Update existing AdminUser
            admin_user = usher.user
            admin_user.username = username
            admin_user.set_password(password)
            admin_user.role = 'USHER'
            admin_user.is_active = True
            admin_user.save()
        else:
            # Create new AdminUser
            admin_user = AdminUser.objects.create_user(
                username=username,
                email=usher.email,
                password=password,
                role='USHER',
                is_active=True,
                is_staff=False,
            )
            usher.user = admin_user
        
        # Activate usher and save (saves both user link and status)
        usher.status = 'active'
        usher.save()
        
        # Assign to events if provided
        if event_ids:
            from events.models import Event
            events = Event.objects.filter(id__in=event_ids)
            if events.count() != len(event_ids):
                raise ValidationError("Some event IDs are invalid")
            usher.events.set(events)
        
        return Response({
            'message': 'EVS credentials created successfully',
            'usher': UsherSerializer(usher).data,
            'username': username,
            'assigned_events': [e.id for e in usher.events.all()]
        }, status=status.HTTP_200_OK)
    
    @action(detail=True, methods=['post'])
    def assign_event(self, request, pk=None):
        """
        Assign usher to one or more events.
        POST /api/ushers/{id}/assign_event/
        Body: { "event_ids": [1, 2, 3] }
        """
        usher = self.get_object()
        event_ids = request.data.get('event_ids', [])
        
        if not event_ids:
            raise ValidationError("event_ids is required")
        
        from events.models import Event
        events = Event.objects.filter(id__in=event_ids)
        
        if events.count() != len(event_ids):
            invalid_ids = set(event_ids) - set(events.values_list('id', flat=True))
            raise ValidationError(f"Invalid event IDs: {list(invalid_ids)}")
        
        # Add events to usher (preserves existing assignments)
        usher.events.add(*events)
        
        return Response({
            'message': f'Usher assigned to {events.count()} event(s)',
            'usher': UsherSerializer(usher).data,
            'assigned_events': [e.id for e in usher.events.all()]
        }, status=status.HTTP_200_OK)


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