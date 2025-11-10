"""
Events models for TicketRunners Admin Dashboard.
"""
from django.db import models
from django.utils import timezone
from django.core.validators import MinValueValidator
from django.core.validators import DecimalValidator
from authentication.models import AdminUser


class EventCategory(models.Model):
    """
    Event categories model.
    """
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    icon = models.CharField(max_length=50, blank=True)
    created_at = models.DateTimeField(default=timezone.now)
    
    class Meta:
        db_table = 'event_categories'
        verbose_name = 'Event Category'
        verbose_name_plural = 'Event Categories'
        ordering = ['name']
    
    def __str__(self):
        return self.name


class TicketCategory(models.Model):
    """
    Ticket category model for events.
    Each event can have multiple ticket categories (e.g., VIP, Regular, Early Bird).
    """
    event = models.ForeignKey(
        'Event',
        on_delete=models.CASCADE,
        related_name='ticket_categories',
        db_index=True
    )
    name = models.CharField(max_length=100, db_index=True, verbose_name="Category Name")
    price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(0)],
        verbose_name="Price per Ticket"
    )
    total_tickets = models.PositiveIntegerField(
        validators=[MinValueValidator(1)],
        verbose_name="Total Tickets Available"
    )
    description = models.TextField(blank=True, verbose_name="Description")
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'ticket_categories'
        verbose_name = 'Ticket Category'
        verbose_name_plural = 'Ticket Categories'
        ordering = ['price']  # Order by price ascending
        indexes = [
            models.Index(fields=['event']),
            models.Index(fields=['name']),
        ]
    
    def __str__(self):
        return f"{self.event.title} - {self.name}"
    
    @property
    def sold_tickets(self):
        """
        Get count of sold tickets for this category.
        """
        from tickets.models import Ticket
        return Ticket.objects.filter(
            event=self.event,
            category=self.name,
            status__in=['valid', 'used']
        ).count()
    
    @property
    def tickets_available(self):
        """
        Get count of available tickets for this category.
        """
        return self.total_tickets - self.sold_tickets


class Event(models.Model):
    """
    Main event model.
    """
    STATUS_CHOICES = [
        ('upcoming', 'Upcoming'),
        ('ongoing', 'Ongoing'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    ]
    
    title = models.CharField(max_length=200, db_index=True, verbose_name="Event Title")
    description = models.TextField(blank=True, verbose_name="About This Event", help_text="Detailed description about the event - this will be displayed on the event detail page")
    about_venue = models.TextField(blank=True, verbose_name="About The Venue", help_text="Information about the venue - this will be displayed on the event detail page")
    gates_open_time = models.TimeField(null=True, blank=True, verbose_name="Gates Open Time", help_text="Time when gates/doors open (e.g., 18:00)")
    terms_and_conditions = models.TextField(blank=True, verbose_name="Event Terms and Conditions", help_text="Terms and conditions for this event - this will be displayed on the event detail page")
    organizer = models.ForeignKey(
        'users.Organizer',
        on_delete=models.CASCADE,
        related_name='events',
        db_index=True
    )
    venue = models.ForeignKey(
        'venues.Venue',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='events',
        db_index=True
    )
    date = models.DateField(db_index=True, verbose_name="Event Date", help_text="Date of the event (YYYY-MM-DD)")
    time = models.TimeField(verbose_name="Event Start Time", help_text="Start time of the event (HH:MM format, e.g., 20:00)")
    category = models.ForeignKey(
        EventCategory,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='events'
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='upcoming',
        db_index=True
    )
    featured = models.BooleanField(default=False, db_index=True, help_text="Mark as featured/trending event")
    image = models.ImageField(
        upload_to='events/images/',
        null=True,
        blank=True,
        verbose_name="Main Event Image",
        help_text="Main image for the event - displayed on event detail page and listings"
    )
    starting_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name="Starting Ticket Price",
        help_text="Starting price for tickets (e.g., 100.00). This will be displayed on the web app."
    )
    total_tickets = models.PositiveIntegerField(
        validators=[MinValueValidator(1)]
    )
    ticket_limit = models.PositiveIntegerField(
        default=10,
        validators=[MinValueValidator(1)]
    )
    ticket_transfer_enabled = models.BooleanField(default=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'events'
        verbose_name = 'Event'
        verbose_name_plural = 'Events'
        indexes = [
            models.Index(fields=['date']),
            models.Index(fields=['status']),
            models.Index(fields=['organizer']),
            models.Index(fields=['date', 'status']),
        ]
        ordering = ['-date', '-time']
    
    def __str__(self):
        return f"{self.title} - {self.date}"
    
    def calculate_revenue(self):
        """
        Calculate total revenue from sold tickets.
        """
        from tickets.models import Ticket
        return Ticket.objects.filter(
            event=self,
            status__in=['valid', 'used']
        ).aggregate(
            total=models.Sum('price')
        )['total'] or 0
    
    def calculate_commission(self, commission_rate=None):
        """
        Calculate commission amount.
        """
        if commission_rate is None:
            commission_rate = self.organizer.commission_rate if hasattr(self.organizer, 'commission_rate') else 0.1
        revenue = self.calculate_revenue()
        return revenue * commission_rate
    
    @property
    def tickets_sold(self):
        """
        Get count of sold tickets.
        """
        return self.tickets.filter(status__in=['valid', 'used']).count()
    
    @property
    def tickets_available(self):
        """
        Get count of available tickets.
        """
        return self.total_tickets - self.tickets_sold
