"""
Views for nfc_cards app.
"""
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from core.permissions import IsAdmin
from .models import NFCCard
from .serializers import NFCCardSerializer
from .filters import NFCCardFilter


class NFCCardViewSet(viewsets.ModelViewSet):
    queryset = NFCCard.objects.select_related('customer').all()
    serializer_class = NFCCardSerializer
    permission_classes = [IsAuthenticated, IsAdmin]
    filterset_class = NFCCardFilter
    
    @action(detail=False, methods=['post'])
    def bulk(self, request):
        action_type = request.data.get('action')
        card_ids = request.data.get('card_ids', [])
        cards = NFCCard.objects.filter(id__in=card_ids)
        
        if action_type == 'activate':
            cards.update(status='active')
        elif action_type == 'deactivate':
            cards.update(status='inactive')
        
        return Response({'message': f'Bulk {action_type} completed', 'count': cards.count()})
    
    @action(detail=True, methods=['post'])
    def transfer(self, request, pk=None):
        card = self.get_object()
        to_customer_id = request.data.get('to_customer_id')
        from customers.models import Customer
        to_customer = Customer.objects.get(id=to_customer_id)
        card.customer = to_customer
        card.save()
        return Response(NFCCardSerializer(card).data)
