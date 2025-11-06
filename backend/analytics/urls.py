"""
Views and URLs for analytics app.
"""
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.utils import timezone
from django.db.models import Count, Sum, Q
from django.core.cache import cache
from django.urls import path
from django.conf import settings
from events.models import Event
from tickets.models import Ticket
from customers.models import Customer
from nfc_cards.models import NFCCard


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_stats(request):
    """
    Get dashboard statistics.
    GET /api/analytics/dashboard/stats/
    """
    cache_key = 'dashboard_stats'
    stats = cache.get(cache_key)
    
    if not stats:
        # Calculate stats
        stats = {
            'total_events': Event.objects.count(),
            'total_tickets_sold': Ticket.objects.filter(status__in=['valid', 'used']).count(),
            'total_attendees': Ticket.objects.filter(status='used').count(),
            'total_revenue': float(Ticket.objects.filter(status__in=['valid', 'used']).aggregate(Sum('price'))['price__sum'] or 0),
            'registered_users': Customer.objects.count(),
            'active_users': Customer.objects.filter(status='active').count(),
            'total_cards': NFCCard.objects.count(),
            'active_cards': NFCCard.objects.filter(status='active').count(),
        }
        
        cache.set(cache_key, stats, settings.CACHE_TIMEOUT_DASHBOARD_STATS)
    
    return Response(stats)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def revenue_analytics(request):
    """
    Get revenue analytics.
    GET /api/analytics/revenue/
    Query params: date_from, date_to, group_by (month/week/day)
    """
    from datetime import datetime, timedelta
    from django.db.models import Sum
    
    date_from = request.query_params.get('date_from')
    date_to = request.query_params.get('date_to')
    group_by = request.query_params.get('group_by', 'month')
    
    # Get tickets in date range
    tickets = Ticket.objects.filter(status__in=['valid', 'used'])
    
    if date_from:
        tickets = tickets.filter(purchase_date__gte=date_from)
    if date_to:
        tickets = tickets.filter(purchase_date__lte=date_to)
    
    # Group by month
    if group_by == 'month':
        revenue_data = tickets.extra(
            select={'month': "strftime('%%Y-%%m', purchase_date)"}
        ).values('month').annotate(
            revenue=Sum('price'),
            count=Count('id')
        ).order_by('month')
    else:
        # Default: monthly grouping
        revenue_data = tickets.extra(
            select={'month': "strftime('%%Y-%%m', purchase_date)"}
        ).values('month').annotate(
            revenue=Sum('price'),
            count=Count('id')
        ).order_by('month')
    
    return Response(list(revenue_data))


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_growth_analytics(request):
    """
    Get user growth analytics.
    GET /api/analytics/users/
    Query params: date_from, date_to
    """
    from django.db.models import Count
    
    date_from = request.query_params.get('date_from')
    date_to = request.query_params.get('date_to')
    
    # Get customers in date range
    customers = Customer.objects.all()
    
    if date_from:
        customers = customers.filter(registration_date__gte=date_from)
    if date_to:
        customers = customers.filter(registration_date__lte=date_to)
    
    # Group by month
    growth_data = customers.extra(
        select={'month': "strftime('%%Y-%%m', registration_date)"}
    ).values('month').annotate(
        registered=Count('id'),
        active=Count('id', filter=Q(status='active'))
    ).order_by('month')
    
    return Response(list(growth_data))


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def card_status_analytics(request):
    """
    Get NFC card status distribution.
    GET /api/analytics/cards/
    """
    stats = NFCCard.objects.values('status').annotate(count=Count('id'))
    return Response(list(stats))


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def event_categories_analytics(request):
    """
    Get event categories distribution.
    GET /api/analytics/events/
    """
    from events.models import EventCategory
    stats = Event.objects.values('category__name').annotate(count=Count('id'))
    return Response(list(stats))


urlpatterns = [
    path('dashboard/stats/', dashboard_stats, name='dashboard-stats'),
    path('revenue/', revenue_analytics, name='revenue-analytics'),
    path('users/', user_growth_analytics, name='user-growth-analytics'),
    path('cards/', card_status_analytics, name='card-status-analytics'),
    path('events/', event_categories_analytics, name='event-categories-analytics'),
]

