"""
Serializers for events app.
"""
from rest_framework import serializers
from .models import Event, EventCategory


class EventCategorySerializer(serializers.ModelSerializer):
    """
    Serializer for EventCategory model.
    """
    class Meta:
        model = EventCategory
        fields = ['id', 'name', 'description', 'icon', 'created_at']
        read_only_fields = ['id', 'created_at']


class EventListSerializer(serializers.ModelSerializer):
    """
    Minimal serializer for Event list view.
    """
    organizer_name = serializers.CharField(source='organizer.name', read_only=True)
    venue_name = serializers.CharField(source='venue.name', read_only=True)
    category_name = serializers.CharField(source='category.name', read_only=True)
    
    class Meta:
        model = Event
        fields = [
            'id', 'title', 'date', 'time', 'status', 'organizer_name',
            'venue_name', 'category_name', 'total_tickets', 'tickets_sold',
            'tickets_available', 'created_at'
        ]
        read_only_fields = ['id', 'tickets_sold', 'tickets_available', 'created_at']


class EventDetailSerializer(serializers.ModelSerializer):
    """
    Detailed serializer for Event detail view.
    """
    organizer = serializers.SerializerMethodField()
    venue = serializers.SerializerMethodField()
    category = EventCategorySerializer(read_only=True)
    tickets_sold = serializers.IntegerField(read_only=True)
    tickets_available = serializers.IntegerField(read_only=True)
    revenue = serializers.SerializerMethodField()
    commission = serializers.SerializerMethodField()
    
    class Meta:
        model = Event
        fields = [
            'id', 'title', 'description', 'organizer', 'venue', 'date', 'time',
            'category', 'status', 'total_tickets', 'ticket_limit',
            'ticket_transfer_enabled', 'tickets_sold', 'tickets_available',
            'revenue', 'commission', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_organizer(self, obj):
        if obj.organizer:
            return {
                'id': obj.organizer.id,
                'name': obj.organizer.name,
                'email': obj.organizer.email
            }
        return None
    
    def get_venue(self, obj):
        if obj.venue:
            return {
                'id': obj.venue.id,
                'name': obj.venue.name,
                'address': obj.venue.address,
                'city': obj.venue.city,
                'capacity': obj.venue.capacity
            }
        return None
    
    def get_revenue(self, obj):
        return float(obj.calculate_revenue())
    
    def get_commission(self, obj):
        return float(obj.calculate_commission())


class EventCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating events.
    """
    class Meta:
        model = Event
        fields = [
            'title', 'description', 'organizer', 'venue', 'date', 'time',
            'category', 'total_tickets', 'ticket_limit', 'ticket_transfer_enabled'
        ]
    
    def validate_date(self, value):
        from django.utils import timezone
        if value < timezone.now().date():
            raise serializers.ValidationError('Event date cannot be in the past.')
        return value
    
    def validate_total_tickets(self, value):
        if value < 1:
            raise serializers.ValidationError('Total tickets must be at least 1.')
        return value

