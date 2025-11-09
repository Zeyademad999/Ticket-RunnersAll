"""
Views for payments app.
"""
from rest_framework import viewsets, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q
from .models import PaymentTransaction
from .serializers import PaymentTransactionSerializer
from core.permissions import IsAdmin


class PaymentTransactionViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for managing payment transactions.
    Admin can view all payments made by customers.
    """
    queryset = PaymentTransaction.objects.select_related('customer', 'ticket', 'ticket__event').all()
    serializer_class = PaymentTransactionSerializer
    permission_classes = [IsAdmin]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'payment_method']
    search_fields = ['transaction_id', 'customer__name', 'customer__email', 'customer__phone', 'ticket__ticket_number']
    ordering_fields = ['created_at', 'amount', 'status']
    ordering = ['-created_at']
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Filter by date range if provided
        date_from = self.request.query_params.get('date_from', None)
        date_to = self.request.query_params.get('date_to', None)
        
        if date_from:
            queryset = queryset.filter(created_at__gte=date_from)
        if date_to:
            queryset = queryset.filter(created_at__lte=date_to)
        
        # Filter by customer if provided
        customer_id = self.request.query_params.get('customer', None)
        if customer_id:
            queryset = queryset.filter(customer_id=customer_id)
        
        # Filter by ticket if provided
        ticket_id = self.request.query_params.get('ticket', None)
        if ticket_id:
            queryset = queryset.filter(ticket_id=ticket_id)
        
        return queryset
    
    @action(detail=False, methods=['get'], url_path='stats')
    def stats(self, request):
        """
        Get payment statistics.
        GET /api/payments/stats/
        """
        queryset = self.get_queryset()
        
        total_payments = queryset.count()
        total_amount = sum(payment.amount for payment in queryset)
        completed_payments = queryset.filter(status='completed').count()
        completed_amount = sum(payment.amount for payment in queryset.filter(status='completed'))
        pending_payments = queryset.filter(status='pending').count()
        failed_payments = queryset.filter(status='failed').count()
        
        # Payment method breakdown
        payment_methods = {}
        for method in PaymentTransaction.PAYMENT_METHOD_CHOICES:
            method_code = method[0]
            method_name = method[1]
            count = queryset.filter(payment_method=method_code).count()
            amount = sum(payment.amount for payment in queryset.filter(payment_method=method_code))
            if count > 0:
                payment_methods[method_code] = {
                    'name': method_name,
                    'count': count,
                    'amount': float(amount)
                }
        
        return Response({
            'total_payments': total_payments,
            'total_amount': float(total_amount),
            'completed_payments': completed_payments,
            'completed_amount': float(completed_amount),
            'pending_payments': pending_payments,
            'failed_payments': failed_payments,
            'payment_methods': payment_methods
        })

