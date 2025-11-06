"""
Serializers for finances app.
"""
from rest_framework import serializers
from .models import Expense, Payout, CompanyFinance, ProfitShare, Settlement, Deposit, ProfitWithdrawal


class ExpenseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Expense
        fields = '__all__'
        read_only_fields = ['id', 'created_at']


class PayoutSerializer(serializers.ModelSerializer):
    organizer_name = serializers.CharField(source='organizer.name', read_only=True)
    
    class Meta:
        model = Payout
        fields = '__all__'
        read_only_fields = ['id', 'created_at']


class CompanyFinanceSerializer(serializers.ModelSerializer):
    class Meta:
        model = CompanyFinance
        fields = '__all__'
        read_only_fields = ['id', 'created_at']


class ProfitShareSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProfitShare
        fields = '__all__'
        read_only_fields = ['id', 'created_at']


class SettlementSerializer(serializers.ModelSerializer):
    class Meta:
        model = Settlement
        fields = '__all__'
        read_only_fields = ['id', 'created_at']


class DepositSerializer(serializers.ModelSerializer):
    class Meta:
        model = Deposit
        fields = '__all__'
        read_only_fields = ['id', 'created_at']


class ProfitWithdrawalSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProfitWithdrawal
        fields = '__all__'
        read_only_fields = ['id', 'created_at']

