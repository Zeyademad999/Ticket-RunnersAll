"""
Serializers for nfc_cards app.
"""
from rest_framework import serializers
from .models import NFCCard, NFCCardTransaction


class NFCCardSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source='customer.name', read_only=True)
    
    class Meta:
        model = NFCCard
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']

