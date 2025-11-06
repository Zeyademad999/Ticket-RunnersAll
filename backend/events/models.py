"""
Events models for TicketRunners Admin Dashboard.
"""
from django.db import models
from django.utils import timezone
from django.core.validators import MinValueValidator
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
    
    title = models.CharField(max_length=200, db_index=True)
    description = models.TextField(blank=True)
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
    date = models.DateField(db_index=True)
    time = models.TimeField()
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
