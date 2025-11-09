"""
Serializers for payments app.
"""
from rest_framework import serializers
from .models import PaymentTransaction


class PaymentTransactionSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source='customer.name', read_only=True)
    customer_email = serializers.CharField(source='customer.email', read_only=True)
    customer_phone = serializers.CharField(source='customer.phone', read_only=True)
    ticket_number = serializers.CharField(source='ticket.ticket_number', read_only=True)
    event_title = serializers.SerializerMethodField()
    
    class Meta:
        model = PaymentTransaction
        fields = [
            'id', 'customer', 'customer_name', 'customer_email', 'customer_phone',
            'ticket', 'ticket_number', 'event_title', 'amount', 'payment_method',
            'status', 'transaction_id', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_event_title(self, obj):
        if obj.ticket and obj.ticket.event:
            return obj.ticket.event.title
        return None

