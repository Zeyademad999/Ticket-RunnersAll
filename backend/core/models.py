"""
Core models for TicketRunners platform.
"""
from django.db import models
from django.utils import timezone
from datetime import timedelta


class OTP(models.Model):
    """
    OTP (One-Time Password) model for authentication and verification.
    Used by Organizer, Merchant, and WebApp portals.
    """
    PURPOSE_CHOICES = [
        ('login', 'Login'),
        ('forgot_password', 'Forgot Password'),
        ('customer_verification', 'Customer Verification'),
        ('mobile_change', 'Mobile Change'),
        ('registration', 'Registration'),
    ]
    
    phone_number = models.CharField(max_length=20, db_index=True)
    code = models.CharField(max_length=6)
    purpose = models.CharField(
        max_length=50,
        choices=PURPOSE_CHOICES,
        db_index=True
    )
    expires_at = models.DateTimeField(db_index=True)
    used = models.BooleanField(default=False, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'otps'
        verbose_name = 'OTP'
        verbose_name_plural = 'OTPs'
        indexes = [
            models.Index(fields=['phone_number', 'purpose', 'used']),
            models.Index(fields=['phone_number', 'code', 'used']),
            models.Index(fields=['expires_at']),
        ]
        ordering = ['-created_at']
    
    def __str__(self):
        return f"OTP for {self.phone_number} - {self.purpose}"
    
    def is_expired(self):
        """Check if OTP has expired."""
        return timezone.now() > self.expires_at
    
    def is_valid(self):
        """Check if OTP is valid (not used and not expired)."""
        return not self.used and not self.is_expired()

