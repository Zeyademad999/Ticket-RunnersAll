"""
Serializers for WebApp Portal (User-Facing).
"""
from rest_framework import serializers
from customers.models import Customer, Dependent
from events.models import Event
from tickets.models import Ticket
from nfc_cards.models import NFCCard, NFCCardAutoReload
from payments.models import PaymentTransaction
from apps.webapp.models import Favorite


class UserRegistrationSerializer(serializers.Serializer):
    """Serializer for user registration."""
    mobile_number = serializers.CharField(max_length=20, required=True)
    password = serializers.CharField(write_only=True, required=True, min_length=6)
    name = serializers.CharField(max_length=200, required=True)
    email = serializers.EmailField(required=True)


class UserOTPSerializer(serializers.Serializer):
    """Serializer for OTP verification."""
    mobile_number = serializers.CharField(max_length=20, required=True)
    otp_code = serializers.CharField(max_length=6, required=True)


class UserLoginSerializer(serializers.Serializer):
    """Serializer for user login."""
    mobile_number = serializers.CharField(max_length=20, required=True)
    password = serializers.CharField(write_only=True, required=True)


class UserProfileSerializer(serializers.ModelSerializer):
    """Serializer for user profile."""
    
    class Meta:
        model = Customer
        fields = [
            'id', 'name', 'email', 'phone', 'mobile_number', 'status',
            'total_bookings', 'total_spent', 'attended_events', 'is_recurrent',
            'registration_date'
        ]
        read_only_fields = ['id', 'total_bookings', 'total_spent', 'attended_events', 'registration_date']


class DependentSerializer(serializers.ModelSerializer):
    """Serializer for dependents."""
    
    class Meta:
        model = Dependent
        fields = ['id', 'name', 'date_of_birth', 'relationship', 'created_at']
        read_only_fields = ['id', 'created_at']


class PublicEventSerializer(serializers.ModelSerializer):
    """Serializer for public event listing."""
    organizer_name = serializers.CharField(source='organizer.name', read_only=True)
    venue_name = serializers.CharField(source='venue.name', read_only=True)
    
    class Meta:
        model = Event
        fields = [
            'id', 'title', 'description', 'date', 'time', 'location',
            'organizer_name', 'venue_name', 'category', 'status',
            'total_tickets', 'ticket_limit'
        ]


class TicketBookingSerializer(serializers.Serializer):
    """Serializer for ticket booking."""
    event_id = serializers.UUIDField(required=True)
    category = serializers.CharField(required=True)
    quantity = serializers.IntegerField(required=True, min_value=1)
    payment_method = serializers.ChoiceField(
        choices=['credit_card', 'debit_card', 'nfc_card', 'digital_wallet'],
        required=True
    )


class TicketSerializer(serializers.ModelSerializer):
    """Serializer for user tickets."""
    event_title = serializers.CharField(source='event.title', read_only=True)
    event_date = serializers.DateField(source='event.date', read_only=True)
    event_time = serializers.TimeField(source='event.time', read_only=True)
    
    class Meta:
        model = Ticket
        fields = [
            'id', 'event', 'event_title', 'event_date', 'event_time',
            'category', 'price', 'status', 'purchase_date', 'ticket_number'
        ]


class NFCCardSerializer(serializers.ModelSerializer):
    """Serializer for NFC cards."""
    
    class Meta:
        model = NFCCard
        fields = [
            'id', 'serial_number', 'status', 'balance', 'issue_date',
            'expiry_date', 'last_used', 'usage_count', 'card_type'
        ]


class PaymentTransactionSerializer(serializers.ModelSerializer):
    """Serializer for payment transactions."""
    
    class Meta:
        model = PaymentTransaction
        fields = [
            'id', 'amount', 'payment_method', 'status', 'transaction_id',
            'created_at'
        ]
        read_only_fields = ['id', 'transaction_id', 'created_at']


class FavoriteSerializer(serializers.ModelSerializer):
    """Serializer for favorites."""
    event_title = serializers.CharField(source='event.title', read_only=True)
    
    class Meta:
        model = Favorite
        fields = ['id', 'event', 'event_title', 'created_at']
        read_only_fields = ['id', 'created_at']

