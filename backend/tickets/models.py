"""
Tickets models for TicketRunners Admin Dashboard.
"""
from django.db import models
from django.utils import timezone
from django.core.validators import MinValueValidator
import uuid


class Ticket(models.Model):
    """
    Ticket model.
    """
    STATUS_CHOICES = [
        ('valid', 'Valid'),
        ('used', 'Used'),
        ('refunded', 'Refunded'),
        ('banned', 'Banned'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    event = models.ForeignKey(
        'events.Event',
        on_delete=models.CASCADE,
        related_name='tickets',
        db_index=True
    )
    customer = models.ForeignKey(
        'customers.Customer',
        on_delete=models.CASCADE,
        related_name='tickets',
        db_index=True,
        help_text="Current ticket owner (may be buyer or assigned person)"
    )
    buyer = models.ForeignKey(
        'customers.Customer',
        on_delete=models.CASCADE,
        related_name='purchased_tickets',
        db_index=True,
        null=True,
        blank=True,
        help_text="Original purchaser (who paid for the ticket)"
    )
    category = models.CharField(max_length=50)
    price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(0)]
    )
    purchase_date = models.DateTimeField(default=timezone.now, db_index=True)
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='valid',
        db_index=True
    )
    check_in_time = models.DateTimeField(null=True, blank=True)
    dependents = models.PositiveIntegerField(default=0)
    ticket_number = models.CharField(max_length=50, unique=True, db_index=True)
    # Fields for ticket assignment to someone else
    assigned_name = models.CharField(max_length=255, null=True, blank=True)
    assigned_mobile = models.CharField(max_length=20, null=True, blank=True, db_index=True)
    assigned_email = models.EmailField(null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)
    
    class Meta:
        db_table = 'tickets'
        verbose_name = 'Ticket'
        verbose_name_plural = 'Tickets'
        indexes = [
            models.Index(fields=['event']),
            models.Index(fields=['customer']),
            models.Index(fields=['status']),
            models.Index(fields=['ticket_number']),
            models.Index(fields=['purchase_date']),
            models.Index(fields=['event', 'status']),
        ]
        ordering = ['-purchase_date']
    
    def __str__(self):
        return f"Ticket {self.ticket_number} - {self.event.title}"
    
    def mark_as_used(self):
        """
        Mark ticket as used and set check-in time.
        """
        if self.status == 'valid':
            self.status = 'used'
            self.check_in_time = timezone.now()
            self.save(update_fields=['status', 'check_in_time'])
            return True
        return False
    
    def refund(self):
        """
        Mark ticket as refunded.
        """
        if self.status in ['valid', 'used']:
            self.status = 'refunded'
            self.save(update_fields=['status'])
            return True
        return False


class TicketTransfer(models.Model):
    """
    Ticket transfer history model.
    """
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    ]
    
    ticket = models.ForeignKey(
        Ticket,
        on_delete=models.CASCADE,
        related_name='transfers',
        db_index=True
    )
    from_customer = models.ForeignKey(
        'customers.Customer',
        on_delete=models.CASCADE,
        related_name='transferred_tickets',
        db_index=True
    )
    to_customer = models.ForeignKey(
        'customers.Customer',
        on_delete=models.CASCADE,
        related_name='received_tickets',
        db_index=True
    )
    transfer_date = models.DateTimeField(default=timezone.now, db_index=True)
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending',
        db_index=True
    )
    created_at = models.DateTimeField(default=timezone.now)
    
    class Meta:
        db_table = 'ticket_transfers'
        verbose_name = 'Ticket Transfer'
        verbose_name_plural = 'Ticket Transfers'
        indexes = [
            models.Index(fields=['ticket']),
            models.Index(fields=['transfer_date']),
            models.Index(fields=['status']),
        ]
        ordering = ['-transfer_date']
    
    def __str__(self):
        return f"Transfer {self.ticket.ticket_number} from {self.from_customer.name} to {self.to_customer.name}"
