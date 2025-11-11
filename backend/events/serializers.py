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
    thumbnail_path = serializers.SerializerMethodField()
    image_url = serializers.SerializerMethodField()
    location = serializers.SerializerMethodField()
    starting_price = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True, allow_null=True)
    revenue = serializers.SerializerMethodField()
    commission = serializers.SerializerMethodField()
    commission_rate = serializers.SerializerMethodField()
    
    class Meta:
        model = Event
        fields = [
            'id', 'title', 'date', 'time', 'status', 'organizer_name',
            'venue_name', 'category_name', 'total_tickets', 'tickets_sold',
            'tickets_available', 'created_at', 'thumbnail_path', 'image_url',
            'location', 'starting_price', 'revenue', 'commission', 'commission_rate'
        ]
        read_only_fields = ['id', 'tickets_sold', 'tickets_available', 'created_at']
    
    def get_thumbnail_path(self, obj):
        """Return the thumbnail/image path as a full URL."""
        if obj.image:
            request = self.context.get('request')
            if request:
                try:
                    return request.build_absolute_uri(obj.image.url)
                except:
                    # Fallback if URL building fails
                    return obj.image.url
            # If no request context, return relative URL
            return obj.image.url
        return None
    
    def get_image_url(self, obj):
        """Alias for thumbnail_path for compatibility."""
        return self.get_thumbnail_path(obj)
    
    def get_location(self, obj):
        """Return venue address or name as location."""
        if obj.venue:
            return obj.venue.address or obj.venue.name
        return None
    
    def get_revenue(self, obj):
        """Calculate total revenue from sold tickets."""
        return float(obj.calculate_revenue())
    
    def get_commission(self, obj):
        """Calculate commission amount."""
        return float(obj.calculate_commission())
    
    def get_commission_rate(self, obj):
        """Get commission rate from event or organizer."""
        if obj.commission_rate_value is not None:
            return {
                'type': obj.commission_rate_type,
                'value': float(obj.commission_rate_value)
            }
        # Fall back to organizer's commission_rate
        if obj.organizer and hasattr(obj.organizer, 'commission_rate'):
            return {
                'type': 'percentage',
                'value': float(obj.organizer.commission_rate * 100)  # Convert decimal to percentage
            }
        return {'type': 'percentage', 'value': 10.0}  # Default 10%


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
    commission_rate = serializers.SerializerMethodField()
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
            'ticket_categories', 'revenue', 'commission', 'commission_rate', 'created_at', 'updated_at'
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
    
    def get_commission_rate(self, obj):
        """Get commission rate from event or organizer."""
        if obj.commission_rate_value is not None:
            return {
                'type': obj.commission_rate_type,
                'value': float(obj.commission_rate_value)
            }
        # Fall back to organizer's commission_rate
        if obj.organizer and hasattr(obj.organizer, 'commission_rate'):
            return {
                'type': 'percentage',
                'value': float(obj.organizer.commission_rate * 100)  # Convert decimal to percentage
            }
        return {'type': 'percentage', 'value': 10.0}  # Default 10%


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
            'commission_rate_type', 'commission_rate_value',
            'ticket_categories'
        ]
    
    def to_internal_value(self, data):
        """Handle ticket_categories as JSON string from FormData or as list from JSON."""
        import json
        import logging
        logger = logging.getLogger(__name__)
        
        # Handle QueryDict (from FormData) - convert to regular dict
        if hasattr(data, 'getlist'):
            # It's a QueryDict, convert to dict
            data_dict = {}
            for key in data.keys():
                values = data.getlist(key)
                if len(values) == 1:
                    data_dict[key] = values[0]
                else:
                    data_dict[key] = values
            data = data_dict
        
        # Make a mutable copy if needed
        if not isinstance(data, dict):
            data = dict(data) if hasattr(data, '__iter__') else {}
        
        # If ticket_categories is a string (JSON from FormData), parse it
        if 'ticket_categories' in data:
            ticket_categories_value = data.get('ticket_categories')
            logger.info(f"Processing ticket_categories: type={type(ticket_categories_value)}, value={ticket_categories_value}")
            
            if isinstance(ticket_categories_value, str):
                try:
                    parsed = json.loads(ticket_categories_value)
                    logger.info(f"Parsed ticket_categories from JSON string: {parsed}")
                    data['ticket_categories'] = parsed
                except (json.JSONDecodeError, TypeError) as e:
                    logger.error(f"Failed to parse ticket_categories JSON: {e}")
                    # If parsing fails, treat as empty list
                    data['ticket_categories'] = []
            elif isinstance(ticket_categories_value, list):
                # Already a list (from JSON request)
                logger.info(f"ticket_categories already a list: {ticket_categories_value}")
                data['ticket_categories'] = ticket_categories_value
            else:
                # Not a string or list, set to empty list
                logger.warning(f"ticket_categories is unexpected type: {type(ticket_categories_value)}, setting to empty list")
                data['ticket_categories'] = []
        else:
            logger.info("No ticket_categories in data")
        
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
        import logging
        logger = logging.getLogger(__name__)
        
        ticket_categories_data = validated_data.pop('ticket_categories', [])
        logger.info(f"Creating event with ticket_categories: {ticket_categories_data}")
        
        # Create the event
        event = Event.objects.create(**validated_data)
        logger.info(f"Created event: {event.id} - {event.title}")
        
        # Create ticket categories
        if isinstance(ticket_categories_data, list) and len(ticket_categories_data) > 0:
            for category_data in ticket_categories_data:
                try:
                    TicketCategory.objects.create(event=event, **category_data)
                    logger.info(f"Created ticket category: {category_data.get('name')} for event {event.id}")
                except Exception as e:
                    logger.error(f"Error creating ticket category: {e}, data: {category_data}")
                    raise
        else:
            logger.info(f"No ticket categories to create (data: {ticket_categories_data})")
        
        return event
    
    def update(self, instance, validated_data):
        """Update event and ticket categories."""
        ticket_categories_data = validated_data.pop('ticket_categories', None)
        
        # Update event fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        # Update ticket categories if provided (even if empty list, to clear existing)
        if ticket_categories_data is not None:
            # Delete existing ticket categories
            TicketCategory.objects.filter(event=instance).delete()
            
            # Create new ticket categories if list is not empty
            if isinstance(ticket_categories_data, list) and len(ticket_categories_data) > 0:
                for category_data in ticket_categories_data:
                    try:
                        TicketCategory.objects.create(event=instance, **category_data)
                    except Exception as e:
                        import logging
                        logger = logging.getLogger(__name__)
                        logger.error(f"Error creating ticket category: {e}, data: {category_data}")
                        raise
        
        return instance

