"""
Serializers for Organizer Portal.
"""
from rest_framework import serializers
from django.db.models import Q, Count, Sum
from users.models import Organizer
from events.models import Event
from finances.models import Payout
from apps.organizer_portal.models import EventEditRequest


class OrganizerLoginSerializer(serializers.Serializer):
    """Serializer for organizer login."""
    mobile = serializers.CharField(max_length=20, required=True)
    password = serializers.CharField(write_only=True, required=True)


class OrganizerOTPSerializer(serializers.Serializer):
    """Serializer for OTP verification."""
    mobile = serializers.CharField(max_length=20, required=True)
    otp_code = serializers.CharField(max_length=6, required=True)


class OrganizerProfileSerializer(serializers.ModelSerializer):
    """Serializer for organizer profile."""
    
    class Meta:
        model = Organizer
        fields = [
            'id', 'name', 'email', 'phone', 'contact_mobile',
            'tax_id', 'commercial_registration', 'legal_business_name',
            'trade_name', 'about', 'profile_image', 'category', 'location',
            'status', 'verified', 'total_events', 'total_revenue',
            'commission_rate', 'rating', 'registration_date'
        ]
        read_only_fields = ['id', 'total_events', 'total_revenue', 'registration_date']


class OrganizerEventSerializer(serializers.ModelSerializer):
    """Serializer for organizer events list."""
    tickets_sold = serializers.SerializerMethodField()
    tickets_available = serializers.SerializerMethodField()
    people_admitted = serializers.SerializerMethodField()
    people_remaining = serializers.SerializerMethodField()
    total_payout_pending = serializers.SerializerMethodField()
    total_payout_paid = serializers.SerializerMethodField()
    
    class Meta:
        model = Event
        fields = [
            'id', 'title', 'date', 'time', 'location', 'status',
            'image_url', 'tickets_sold', 'tickets_available',
            'people_admitted', 'people_remaining', 'total_payout_pending',
            'total_payout_paid'
        ]
    
    def get_tickets_sold(self, obj):
        return obj.tickets.filter(status__in=['valid', 'used']).count()
    
    def get_tickets_available(self, obj):
        return obj.tickets.filter(status='valid').count()
    
    def get_people_admitted(self, obj):
        return obj.tickets.filter(status='used').count()
    
    def get_people_remaining(self, obj):
        return obj.tickets.filter(status='valid').count()
    
    def get_total_payout_pending(self, obj):
        from finances.models import Payout
        return float(Payout.objects.filter(event=obj, status='pending').aggregate(
            total=serializers.DecimalField(max_digits=12, decimal_places=2)
        )['total'] or 0)
    
    def get_total_payout_paid(self, obj):
        from finances.models import Payout
        return float(Payout.objects.filter(event=obj, status='completed').aggregate(
            total=serializers.DecimalField(max_digits=12, decimal_places=2)
        )['total'] or 0)


class OrganizerEventAnalyticsSerializer(serializers.ModelSerializer):
    """Serializer for detailed event analytics."""
    ticket_categories = serializers.SerializerMethodField()
    overall_stats = serializers.SerializerMethodField()
    payout_info = serializers.SerializerMethodField()
    
    class Meta:
        model = Event
        fields = [
            'id', 'title', 'date', 'time', 'location', 'status',
            'ticket_categories', 'overall_stats', 'payout_info'
        ]
    
    def get_ticket_categories(self, obj):
        from tickets.models import Ticket
        
        categories = Ticket.objects.filter(event=obj).values('category').annotate(
            total=Count('id'),
            sold=Count('id', filter=Q(status__in=['valid', 'used'])),
            available=Count('id', filter=Q(status='valid'))
        )
        return list(categories)
    
    def get_overall_stats(self, obj):
        from tickets.models import Ticket
        tickets = Ticket.objects.filter(event=obj)
        return {
            'sold': tickets.filter(status__in=['valid', 'used']).count(),
            'available': tickets.filter(status='valid').count(),
            'admitted': tickets.filter(status='used').count(),
            'remaining': tickets.filter(status='valid').count(),
        }
    
    def get_payout_info(self, obj):
        from finances.models import Payout
        return {
            'pending': float(Payout.objects.filter(event=obj, status='pending').aggregate(
                total=Sum('amount')
            )['total'] or 0),
            'paid': float(Payout.objects.filter(event=obj, status='completed').aggregate(
                total=Sum('amount')
            )['total'] or 0),
        }


class OrganizerPayoutSerializer(serializers.ModelSerializer):
    """Serializer for organizer payouts."""
    event_title = serializers.CharField(source='event.title', read_only=True)
    
    class Meta:
        model = Payout
        fields = [
            'id', 'transaction_id', 'event', 'event_title',
            'amount', 'date', 'status', 'description'
        ]
        read_only_fields = ['id', 'transaction_id', 'date']


class EventEditRequestSerializer(serializers.ModelSerializer):
    """Serializer for event edit requests."""
    
    class Meta:
        model = EventEditRequest
        fields = [
            'id', 'event', 'requested_changes', 'file_attachments',
            'status', 'admin_notes', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'status', 'admin_notes', 'created_at', 'updated_at']

