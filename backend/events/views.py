"""
Views for events app.
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.db.models import Sum, Count
from core.permissions import IsAdmin
from core.exceptions import PermissionDenied, NotFoundError
from core.utils import get_client_ip, log_system_action
from .models import Event, TicketCategory
from .serializers import (
    EventListSerializer,
    EventDetailSerializer,
    EventCreateSerializer
)
from .filters import EventFilter


class EventViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Event model.
    """
    queryset = Event.objects.select_related('organizer', 'venue', 'category').all()
    permission_classes = [IsAuthenticated]
    filterset_class = EventFilter
    search_fields = ['title', 'description']
    ordering_fields = ['date', 'created_at', 'title']
    ordering = ['-date', '-time']
    parser_classes = [MultiPartParser, FormParser, JSONParser]  # Support file uploads
    
    def get_serializer_class(self):
        if self.action == 'list':
            return EventListSerializer
        elif self.action in ['create', 'update', 'partial_update']:
            return EventCreateSerializer
        return EventDetailSerializer
    
    def get_permissions(self):
        """
        Override to set permissions based on action.
        """
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAuthenticated(), IsAdmin()]
        return [IsAuthenticated()]
    
    def list(self, request, *args, **kwargs):
        """
        List all events with filtering and pagination.
        GET /api/events/
        """
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
    
    def retrieve(self, request, *args, **kwargs):
        """
        Retrieve event details.
        GET /api/events/:id/
        """
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return Response(serializer.data)
    
    def create(self, request, *args, **kwargs):
        """
        Create a new event.
        POST /api/events/
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        
        # Log system action
        ip_address = get_client_ip(request)
        log_system_action(
            user=request.user,
            action='CREATE_EVENT',
            category='event',
            severity='INFO',
            description=f'Created event: {serializer.instance.title}',
            ip_address=ip_address,
            status='SUCCESS'
        )
        
        headers = self.get_success_headers(serializer.data)
        return Response(
            EventDetailSerializer(serializer.instance).data,
            status=status.HTTP_201_CREATED,
            headers=headers
        )
    
    def update(self, request, *args, **kwargs):
        """
        Update an event.
        PUT /api/events/:id/
        """
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        
        # Log system action
        ip_address = get_client_ip(request)
        log_system_action(
            user=request.user,
            action='UPDATE_EVENT',
            category='event',
            severity='INFO',
            description=f'Updated event: {instance.title}',
            ip_address=ip_address,
            status='SUCCESS'
        )
        
        return Response(EventDetailSerializer(instance).data)
    
    def destroy(self, request, *args, **kwargs):
        """
        Delete an event.
        DELETE /api/events/:id/
        """
        import logging
        logger = logging.getLogger(__name__)
        
        instance = self.get_object()
        
        # Check if event has sold tickets
        if instance.tickets_sold > 0:
            raise PermissionDenied(
                'Cannot delete event with sold tickets. Cancel the event instead.'
            )
        
        # Save event details before deletion
        event_title = instance.title
        event_id = instance.id
        
        # Delete the event
        try:
            self.perform_destroy(instance)
        except Exception as e:
            logger.error(f"Error deleting event {event_id}: {str(e)}", exc_info=True)
            return Response(
                {'error': f'Failed to delete event: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        # Log system action (wrap in try-except to prevent logging errors from breaking deletion)
        try:
            ip_address = get_client_ip(request) or ''
            log_system_action(
                user=request.user if hasattr(request, 'user') else None,
                action='DELETE_EVENT',
                category='event',
                severity='WARNING',
                description=f'Deleted event: {event_title}',
                ip_address=ip_address,
                status='SUCCESS'
            )
        except Exception as e:
            # Log the error but don't fail the deletion
            logger.warning(f"Failed to log event deletion: {str(e)}", exc_info=True)
        
        return Response(status=status.HTTP_204_NO_CONTENT)
    
    @action(detail=True, methods=['get'])
    def ushers(self, request, pk=None):
        """
        Get ushers assigned to this event.
        GET /api/events/:id/ushers/
        """
        event = self.get_object()
        from users.serializers import UsherSerializer
        ushers = event.ushers.all()
        serializer = UsherSerializer(ushers, many=True)
        return Response({
            'event_id': event.id,
            'event_title': event.title,
            'ushers': serializer.data,
            'count': ushers.count()
        })
    
    @action(detail=True, methods=['get'])
    def statistics(self, request, pk=None):
        """
        Get event statistics.
        GET /api/events/:id/statistics/
        """
        event = self.get_object()
        
        from tickets.models import Ticket
        
        tickets = Ticket.objects.filter(event=event)
        
        stats = {
            'total_tickets': event.total_tickets,
            'tickets_sold': tickets.filter(status__in=['valid', 'used']).count(),
            'tickets_used': tickets.filter(status='used').count(),
            'tickets_refunded': tickets.filter(status='refunded').count(),
            'tickets_available': event.tickets_available,
            'revenue': float(event.calculate_revenue()),
            'commission': float(event.calculate_commission()),
            'payout': float(event.calculate_revenue() - event.calculate_commission()),
            'attendance_rate': (
                (tickets.filter(status='used').count() / event.total_tickets * 100)
                if event.total_tickets > 0 else 0
            )
        }
        
        return Response(stats)
