"""
Serializers for events app.
"""
from rest_framework import serializers
from .models import Event, EventCategory, TicketCategory


class EventCategorySerializer(serializers.ModelSerializer):
    """
    Serializer for EventCategory model.
    """
    class Meta:
        model = EventCategory
        fields = ['id', 'name', 'description', 'icon', 'created_at']
        read_only_fields = ['id', 'created_at']


class TicketCategorySerializer(serializers.ModelSerializer):
    """
    Serializer for TicketCategory model.
    """
    sold_tickets = serializers.IntegerField(read_only=True)
    tickets_available = serializers.IntegerField(read_only=True)
    
    class Meta:
        model = TicketCategory
        fields = [
            'id', 'name', 'price', 'total_tickets', 'sold_tickets',
            'tickets_available', 'description', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'sold_tickets', 'tickets_available', 'created_at', 'updated_at']


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
    ticket_categories = TicketCategorySerializer(many=True, read_only=True)
    tickets_sold = serializers.IntegerField(read_only=True)
    tickets_available = serializers.IntegerField(read_only=True)
    revenue = serializers.SerializerMethodField()
    commission = serializers.SerializerMethodField()
    image = serializers.ImageField(required=False, allow_null=True, read_only=False)
    starting_price = serializers.DecimalField(max_digits=10, decimal_places=2, required=False, allow_null=True)
    
    class Meta:
        model = Event
        fields = [
            'id', 'title', 'description', 'about_venue', 'gates_open_time', 'terms_and_conditions',
            'organizer', 'venue', 'date', 'time',
            'category', 'status', 'image', 'starting_price',
            'total_tickets', 'ticket_limit',
            'ticket_transfer_enabled', 'tickets_sold', 'tickets_available',
            'ticket_categories', 'revenue', 'commission', 'created_at', 'updated_at'
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


class TicketCategoryCreateSerializer(serializers.Serializer):
    """Serializer for creating ticket categories within event creation."""
    name = serializers.CharField(max_length=100, required=True)
    price = serializers.DecimalField(max_digits=10, decimal_places=2, required=True, min_value=0)
    total_tickets = serializers.IntegerField(required=True, min_value=1)
    description = serializers.CharField(required=False, allow_blank=True)


class EventCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating events.
    """
    ticket_categories = TicketCategoryCreateSerializer(many=True, required=False, allow_empty=True)
    
    class Meta:
        model = Event
        fields = [
            'title', 'description', 'about_venue', 'gates_open_time', 'terms_and_conditions',
            'organizer', 'venue', 'date', 'time',
            'category', 'image', 'starting_price',
            'total_tickets', 'ticket_limit', 'ticket_transfer_enabled',
            'ticket_categories'
        ]
    
    def to_internal_value(self, data):
        """Handle ticket_categories as JSON string from FormData."""
        # If ticket_categories is a string (JSON from FormData), parse it
        if 'ticket_categories' in data:
            ticket_categories_value = data.get('ticket_categories')
            if isinstance(ticket_categories_value, str):
                import json
                try:
                    data = data.copy()  # Make mutable copy
                    data['ticket_categories'] = json.loads(ticket_categories_value)
                except (json.JSONDecodeError, TypeError):
                    # If parsing fails, treat as empty list
                    data['ticket_categories'] = []
        
        return super().to_internal_value(data)
    
    def validate_date(self, value):
        from django.utils import timezone
        if value < timezone.now().date():
            raise serializers.ValidationError('Event date cannot be in the past.')
        return value
    
    def validate_total_tickets(self, value):
        if value < 1:
            raise serializers.ValidationError('Total tickets must be at least 1.')
        return value
    
    def create(self, validated_data):
        """Create event and associated ticket categories."""
        ticket_categories_data = validated_data.pop('ticket_categories', [])
        
        # Create the event
        event = Event.objects.create(**validated_data)
        
        # Create ticket categories
        for category_data in ticket_categories_data:
            TicketCategory.objects.create(event=event, **category_data)
        
        return event
    
    def update(self, instance, validated_data):
        """Update event and ticket categories."""
        ticket_categories_data = validated_data.pop('ticket_categories', None)
        
        # Update event fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        # Update ticket categories if provided
        if ticket_categories_data is not None:
            # Delete existing ticket categories
            TicketCategory.objects.filter(event=instance).delete()
            
            # Create new ticket categories
            for category_data in ticket_categories_data:
                TicketCategory.objects.create(event=instance, **category_data)
        
        return instance

