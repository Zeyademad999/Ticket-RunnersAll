"""
Views for venues app.
"""
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from core.permissions import IsAdmin, IsSuperAdmin
from .models import Venue
from .serializers import VenueSerializer
from .filters import VenueFilter


class VenueViewSet(viewsets.ModelViewSet):
    queryset = Venue.objects.all()
    serializer_class = VenueSerializer
    permission_classes = [IsAuthenticated]
    filterset_class = VenueFilter
    
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update']:
            return [IsAuthenticated(), IsAdmin()]
        elif self.action == 'destroy':
            return [IsAuthenticated(), IsSuperAdmin()]
        return [IsAuthenticated()]
