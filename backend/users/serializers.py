"""
Serializers for users app.
"""
from rest_framework import serializers
from .models import Organizer, Usher, Merchant
from authentication.models import AdminUser


class OrganizerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Organizer
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']


class UsherSerializer(serializers.ModelSerializer):
    class Meta:
        model = Usher
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']


class MerchantSerializer(serializers.ModelSerializer):
    class Meta:
        model = Merchant
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']


class AdminUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = AdminUser
        fields = ['id', 'username', 'email', 'role', 'is_active', 'last_login', 'created_at']
        read_only_fields = ['id', 'created_at']

