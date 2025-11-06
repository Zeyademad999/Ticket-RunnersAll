"""
Authentication models for TicketRunners Admin Dashboard.
"""
from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone


class AdminUser(AbstractUser):
    """
    Custom user model for admin users.
    """
    ROLE_CHOICES = [
        ('SUPER_ADMIN', 'Super Admin'),
        ('ADMIN', 'Admin'),
        ('SUPPORT', 'Support'),
        ('USHER', 'Usher'),
    ]
    
    role = models.CharField(
        max_length=20,
        choices=ROLE_CHOICES,
        default='ADMIN',
        db_index=True
    )
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'admin_users'
        verbose_name = 'Admin User'
        verbose_name_plural = 'Admin Users'
        indexes = [
            models.Index(fields=['role']),
            models.Index(fields=['email']),
            models.Index(fields=['is_active']),
        ]
    
    def __str__(self):
        return f"{self.username} ({self.get_role_display()})"
    
    def has_permission(self, permission_name):
        """
        Check if user has a specific permission based on role.
        """
        if self.role == 'SUPER_ADMIN':
            return True
        elif self.role == 'ADMIN':
            return permission_name not in ['delete_admin', 'create_super_admin']
        elif self.role == 'SUPPORT':
            return permission_name in ['view_customer', 'view_ticket', 'view_event']
        elif self.role == 'USHER':
            return permission_name in ['checkin_ticket', 'view_event']
        return False
    
    def get_role_display(self):
        """
        Get human-readable role name.
        """
        return dict(self.ROLE_CHOICES).get(self.role, self.role)
