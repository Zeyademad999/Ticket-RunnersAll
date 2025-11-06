"""
Views for customers app.
"""
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from core.permissions import IsAdmin
from .models import Customer
from .serializers import CustomerSerializer
from .filters import CustomerFilter


class CustomerViewSet(viewsets.ModelViewSet):
    queryset = Customer.objects.select_related('user').all()
    serializer_class = CustomerSerializer
    permission_classes = [IsAuthenticated]
    filterset_class = CustomerFilter
    search_fields = ['name', 'email', 'phone']
    
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAuthenticated(), IsAdmin()]
        return [IsAuthenticated()]
    
    @action(detail=True, methods=['put'])
    def status(self, request, pk=None):
        customer = self.get_object()
        customer.status = request.data.get('status', customer.status)
        customer.save()
        return Response(CustomerSerializer(customer).data)
    
    @action(detail=True, methods=['get'])
    def bookings(self, request, pk=None):
        customer = self.get_object()
        from tickets.models import Ticket
        tickets = Ticket.objects.filter(customer=customer)
        from tickets.serializers import TicketListSerializer
        serializer = TicketListSerializer(tickets, many=True)
        return Response(serializer.data)
