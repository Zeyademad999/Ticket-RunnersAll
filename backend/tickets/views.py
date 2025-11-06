"""
Views for tickets app.
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from core.permissions import IsAdmin, IsUsher
from core.exceptions import PermissionDenied, NotFoundError, ValidationError
from core.utils import get_client_ip, log_system_action
from .models import Ticket, TicketTransfer
from .serializers import (
    TicketListSerializer,
    TicketDetailSerializer,
    TicketStatusUpdateSerializer,
    TicketCheckinSerializer,
    TicketTransferSerializer
)
from .filters import TicketFilter


class TicketViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for Ticket model (read-only for list/detail, custom actions for updates).
    """
    queryset = Ticket.objects.select_related('event', 'customer').all()
    permission_classes = [IsAuthenticated]
    filterset_class = TicketFilter
    search_fields = ['ticket_number', 'event__title', 'customer__name']
    ordering_fields = ['purchase_date', 'ticket_number']
    ordering = ['-purchase_date']
    
    def get_serializer_class(self):
        if self.action == 'list':
            return TicketListSerializer
        return TicketDetailSerializer
    
    def list(self, request, *args, **kwargs):
        """
        List all tickets with filtering and pagination.
        GET /api/tickets/
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
        Retrieve ticket details.
        GET /api/tickets/:id/
        """
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return Response(serializer.data)
    
    @action(detail=True, methods=['put'], permission_classes=[IsAuthenticated, IsUsher])
    def status(self, request, pk=None):
        """
        Update ticket status.
        PUT /api/tickets/:id/status/
        """
        ticket = self.get_object()
        serializer = TicketStatusUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        old_status = ticket.status
        ticket.status = serializer.validated_data['status']
        
        if ticket.status == 'used' and old_status == 'valid':
            ticket.check_in_time = timezone.now()
        
        ticket.save()
        
        # Log system action
        ip_address = get_client_ip(request)
        log_system_action(
            user=request.user,
            action='UPDATE_TICKET_STATUS',
            category='ticket',
            severity='INFO',
            description=f'Updated ticket {ticket.ticket_number} status from {old_status} to {ticket.status}',
            ip_address=ip_address,
            status='SUCCESS'
        )
        
        return Response(TicketDetailSerializer(ticket).data)
    
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, IsUsher])
    def checkin(self, request, pk=None):
        """
        Check in a ticket.
        POST /api/tickets/:id/checkin/
        """
        ticket = self.get_object()
        
        if ticket.status != 'valid':
            raise ValidationError('Only valid tickets can be checked in.')
        
        serializer = TicketCheckinSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Mark ticket as used
        ticket.mark_as_used()
        
        # Create check-in log
        from system.models import CheckinLog
        CheckinLog.objects.create(
            timestamp=timezone.now(),
            customer=ticket.customer,
            customer_email=ticket.customer.email,
            event=ticket.event,
            event_title=ticket.event.title,
            venue=ticket.event.venue,
            nfc_card=None,  # Will be set if provided
            scan_result='success',
            scan_type='manual',
            device_name=serializer.validated_data.get('device_name', ''),
            device_type=serializer.validated_data.get('device_type', ''),
            operator=request.user,
            operator_role=request.user.role if hasattr(request.user, 'role') else '',
            notes=serializer.validated_data.get('notes', '')
        )
        
        # Log system action
        ip_address = get_client_ip(request)
        log_system_action(
            user=request.user,
            action='TICKET_CHECKIN',
            category='ticket',
            severity='INFO',
            description=f'Checked in ticket {ticket.ticket_number}',
            ip_address=ip_address,
            status='SUCCESS'
        )
        
        return Response({
            'message': 'Ticket checked in successfully',
            'ticket': TicketDetailSerializer(ticket).data
        })
    
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def transfer(self, request, pk=None):
        """
        Transfer ticket to another customer.
        POST /api/tickets/:id/transfer/
        """
        ticket = self.get_object()
        
        if not ticket.event.ticket_transfer_enabled:
            raise ValidationError('Ticket transfers are not enabled for this event.')
        
        if ticket.status != 'valid':
            raise ValidationError('Only valid tickets can be transferred.')
        
        to_customer_id = request.data.get('to_customer_id')
        if not to_customer_id:
            raise ValidationError('to_customer_id is required.')
        
        from customers.models import Customer
        try:
            to_customer = Customer.objects.get(id=to_customer_id)
        except Customer.DoesNotExist:
            raise NotFoundError('Customer not found.')
        
        # Check if user has permission (customer can only transfer their own tickets)
        if request.user.role not in ['ADMIN', 'SUPER_ADMIN']:
            if ticket.customer.user != request.user:
                raise PermissionDenied('You can only transfer your own tickets.')
        
        # Create transfer record
        transfer = TicketTransfer.objects.create(
            ticket=ticket,
            from_customer=ticket.customer,
            to_customer=to_customer,
            status='completed'
        )
        
        # Update ticket customer
        ticket.customer = to_customer
        ticket.save()
        
        # Log system action
        ip_address = get_client_ip(request)
        log_system_action(
            user=request.user,
            action='TICKET_TRANSFER',
            category='ticket',
            severity='INFO',
            description=f'Transferred ticket {ticket.ticket_number} to {to_customer.name}',
            ip_address=ip_address,
            status='SUCCESS'
        )
        
        return Response({
            'message': 'Ticket transferred successfully',
            'transfer': TicketTransferSerializer(transfer).data,
            'ticket': TicketDetailSerializer(ticket).data
        })
