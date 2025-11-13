"""
Serializers for Usher Portal.
"""
from rest_framework import serializers
from django.db.models import Q
from users.models import Usher
from events.models import Event
from tickets.models import Ticket
from nfc_cards.models import NFCCard
from customers.models import Customer, Dependent
from system.models import CheckinLog
from apps.usher_portal.models import PartTimeLeave, ScanReport


class UsherLoginSerializer(serializers.Serializer):
    """Serializer for usher login."""
    username = serializers.CharField(max_length=150, required=True)
    password = serializers.CharField(write_only=True, required=True)
    event_id = serializers.IntegerField(required=True)


class UsherProfileSerializer(serializers.ModelSerializer):
    """Serializer for usher profile."""
    events = serializers.SerializerMethodField()
    
    class Meta:
        model = Usher
        fields = [
            'id', 'name', 'email', 'phone', 'role', 'status',
            'location', 'experience', 'hourly_rate', 'total_hours',
            'total_events', 'rating', 'performance', 'hire_date',
            'last_active', 'events'
        ]
        read_only_fields = ['id', 'total_hours', 'total_events', 'hire_date']
    
    def get_events(self, obj):
        """Get assigned events."""
        events = obj.events.all()
        return [
            {
                'id': str(event.id),
                'title': event.title,
                'date': event.date.isoformat() if event.date else None,
                'time': event.time.isoformat() if event.time else None,
                'status': event.status,
                'venue': event.venue.name if event.venue else None,
            }
            for event in events
        ]


class EventSerializer(serializers.ModelSerializer):
    """Serializer for event details."""
    venue_name = serializers.CharField(source='venue.name', read_only=True)
    organizer_name = serializers.CharField(source='organizer.name', read_only=True)
    
    class Meta:
        model = Event
        fields = [
            'id', 'title', 'description', 'date', 'time', 'venue_name',
            'organizer_name', 'status', 'image', 'category'
        ]


class AttendeeSerializer(serializers.Serializer):
    """Serializer for attendee information."""
    customer_id = serializers.UUIDField()
    name = serializers.CharField()
    photo = serializers.CharField(allow_null=True, required=False)
    card_id = serializers.CharField()
    ticket_id = serializers.UUIDField(allow_null=True, required=False)
    ticket_status = serializers.CharField()
    ticket_tier = serializers.CharField()
    scan_status = serializers.CharField()
    emergency_contact = serializers.CharField(allow_null=True, required=False, help_text="Emergency contact mobile number")
    emergency_contact_name = serializers.CharField(allow_null=True, required=False, help_text="Emergency contact person name")
    blood_type = serializers.CharField(allow_null=True, required=False)
    labels = serializers.ListField(child=serializers.CharField(), allow_empty=True, required=False)
    children = serializers.ListField(allow_empty=True, required=False)
    customer_events = serializers.ListField(allow_empty=True, required=False)  # All events customer has tickets for


class ScanCardSerializer(serializers.Serializer):
    """Serializer for card verification."""
    card_id = serializers.CharField(max_length=100, required=True)


class ScanResultSerializer(serializers.Serializer):
    """Serializer for scan result."""
    card_id = serializers.CharField(max_length=100, required=True)
    event_id = serializers.UUIDField(required=True)
    result = serializers.ChoiceField(
        choices=['valid', 'invalid', 'already_scanned', 'not_found'],
        required=True
    )
    notes = serializers.CharField(required=False, allow_blank=True)


class ScanLogSerializer(serializers.ModelSerializer):
    """Serializer for scan logs."""
    usher_name = serializers.CharField(source='usher.name', read_only=True)
    event_title = serializers.CharField(source='event.title', read_only=True)
    customer_name = serializers.CharField(source='customer.name', read_only=True)
    
    class Meta:
        model = CheckinLog
        fields = [
            'id', 'usher', 'usher_name', 'event', 'event_title',
            'ticket', 'customer', 'customer_name', 'card_id',
            'scan_time', 'result', 'notes'
        ]
        read_only_fields = ['id', 'scan_time']


class ScanLogSearchSerializer(serializers.Serializer):
    """Serializer for scan log search."""
    card_id = serializers.CharField(required=False, allow_blank=True)
    usher_username = serializers.CharField(required=False, allow_blank=True)
    result = serializers.ChoiceField(
        choices=['valid', 'invalid', 'already_scanned', 'not_found'],
        required=False
    )
    attendee_name = serializers.CharField(required=False, allow_blank=True)
    event_id = serializers.UUIDField(required=False)


class PartTimeLeaveSerializer(serializers.ModelSerializer):
    """Serializer for part-time leave."""
    usher_name = serializers.CharField(source='usher.name', read_only=True)
    event_title = serializers.CharField(source='event.title', read_only=True)
    
    class Meta:
        model = PartTimeLeave
        fields = [
            'id', 'usher', 'usher_name', 'event', 'event_title',
            'leave_time', 'return_time', 'reason', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class ScanReportSerializer(serializers.ModelSerializer):
    """Serializer for scan reports."""
    usher_name = serializers.CharField(source='usher.name', read_only=True)
    event_title = serializers.CharField(source='event.title', read_only=True)
    
    class Meta:
        model = ScanReport
        fields = [
            'id', 'usher', 'usher_name', 'event', 'event_title',
            'report_type', 'description', 'card_id', 'ticket_id',
            'customer_id', 'status', 'admin_notes', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'status', 'admin_notes', 'created_at', 'updated_at']

