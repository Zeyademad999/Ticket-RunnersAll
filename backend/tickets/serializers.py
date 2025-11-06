"""
Serializers for tickets app.
"""
from rest_framework import serializers
from .models import Ticket, TicketTransfer


class TicketListSerializer(serializers.ModelSerializer):
    """
    Minimal serializer for Ticket list view.
    """
    event_title = serializers.CharField(source='event.title', read_only=True)
    customer_name = serializers.CharField(source='customer.name', read_only=True)
    
    class Meta:
        model = Ticket
        fields = [
            'id', 'event_title', 'customer_name', 'category', 'price',
            'purchase_date', 'status', 'ticket_number', 'dependents'
        ]
        read_only_fields = ['id', 'purchase_date']


class TicketDetailSerializer(serializers.ModelSerializer):
    """
    Detailed serializer for Ticket detail view.
    """
    event = serializers.SerializerMethodField()
    customer = serializers.SerializerMethodField()
    
    class Meta:
        model = Ticket
        fields = [
            'id', 'event', 'customer', 'category', 'price', 'purchase_date',
            'status', 'check_in_time', 'dependents', 'ticket_number', 'created_at'
        ]
        read_only_fields = ['id', 'purchase_date', 'created_at']
    
    def get_event(self, obj):
        return {
            'id': obj.event.id,
            'title': obj.event.title,
            'date': obj.event.date,
            'time': obj.event.time
        }
    
    def get_customer(self, obj):
        return {
            'id': obj.customer.id,
            'name': obj.customer.name,
            'email': obj.customer.email
        }


class TicketStatusUpdateSerializer(serializers.Serializer):
    """
    Serializer for updating ticket status.
    """
    status = serializers.ChoiceField(choices=Ticket.STATUS_CHOICES)


class TicketCheckinSerializer(serializers.Serializer):
    """
    Serializer for ticket check-in.
    """
    nfc_card = serializers.CharField(required=False, allow_blank=True)
    device_name = serializers.CharField(required=False, allow_blank=True)
    device_type = serializers.CharField(required=False, allow_blank=True)
    operator_role = serializers.CharField(required=False, allow_blank=True)
    notes = serializers.CharField(required=False, allow_blank=True)


class TicketTransferSerializer(serializers.ModelSerializer):
    """
    Serializer for ticket transfer.
    """
    class Meta:
        model = TicketTransfer
        fields = ['id', 'ticket', 'from_customer', 'to_customer', 'transfer_date', 'status']
        read_only_fields = ['id', 'transfer_date']

