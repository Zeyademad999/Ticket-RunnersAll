"""
Admin configuration for core models.
"""
from django.contrib import admin
from .models import OTP


@admin.register(OTP)
class OTPAdmin(admin.ModelAdmin):
    list_display = ['phone_number', 'purpose', 'code', 'used', 'expires_at', 'created_at']
    list_filter = ['purpose', 'used', 'expires_at']
    search_fields = ['phone_number']
    readonly_fields = ['created_at']

