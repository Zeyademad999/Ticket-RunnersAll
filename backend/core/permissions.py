"""
Custom permission classes for role-based access control.
"""
from rest_framework import permissions


class IsSuperAdmin(permissions.BasePermission):
    """
    Permission class that allows access only to Super Admin users.
    """
    
    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            hasattr(request.user, 'role') and
            request.user.role == 'SUPER_ADMIN'
        )


class IsAdmin(permissions.BasePermission):
    """
    Permission class that allows access to Admin and Super Admin users.
    """
    
    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            hasattr(request.user, 'role') and
            request.user.role in ['ADMIN', 'SUPER_ADMIN']
        )


class IsUsher(permissions.BasePermission):
    """
    Permission class that allows access to Usher, Admin, and Super Admin users.
    """
    
    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            hasattr(request.user, 'role') and
            request.user.role in ['USHER', 'ADMIN', 'SUPER_ADMIN']
        )


class IsSupport(permissions.BasePermission):
    """
    Permission class that allows access to Support, Admin, and Super Admin users.
    """
    
    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            hasattr(request.user, 'role') and
            request.user.role in ['SUPPORT', 'ADMIN', 'SUPER_ADMIN']
        )


class IsOrganizer(permissions.BasePermission):
    """
    Permission class that allows access only to authenticated organizers.
    Checks if request has organizer attribute set by custom authentication.
    """
    
    def has_permission(self, request, view):
        return (
            hasattr(request, 'organizer') and
            request.organizer is not None
        )


class IsMerchant(permissions.BasePermission):
    """
    Permission class that allows access only to authenticated merchants.
    Checks if request has merchant attribute set by custom authentication.
    """
    
    def has_permission(self, request, view):
        return (
            hasattr(request, 'merchant') and
            request.merchant is not None
        )


class OrganizerCanAccessEvent(permissions.BasePermission):
    """
    Permission class that checks if organizer owns the event.
    """
    
    def has_object_permission(self, request, view, obj):
        if not hasattr(request, 'organizer') or not request.organizer:
            return False
        return obj.organizer == request.organizer


class MerchantCanAccessCard(permissions.BasePermission):
    """
    Permission class that checks if merchant assigned the card.
    """
    
    def has_object_permission(self, request, view, obj):
        if not hasattr(request, 'merchant') or not request.merchant:
            return False
        return obj.merchant == request.merchant

