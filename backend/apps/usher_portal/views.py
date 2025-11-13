"""
Views for Usher Portal.
"""
from rest_framework import status, permissions
from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from django.utils import timezone
from django.db.models import Q
from django.core.paginator import Paginator
import uuid

from users.models import Usher
from events.models import Event
from tickets.models import Ticket
from nfc_cards.models import NFCCard
from customers.models import Customer, Dependent
from system.models import CheckinLog
from apps.usher_portal.models import PartTimeLeave, ScanReport
from apps.usher_portal.authentication import UsherJWTAuthentication
from core.exceptions import AuthenticationError, ValidationError
from .serializers import (
    UsherLoginSerializer, UsherProfileSerializer, EventSerializer,
    AttendeeSerializer, ScanCardSerializer, ScanResultSerializer,
    ScanLogSerializer, ScanLogSearchSerializer, PartTimeLeaveSerializer,
    ScanReportSerializer
)


class IsUsherPortal(permissions.BasePermission):
    """
    Permission class that allows access only to authenticated ushers.
    Checks if request has usher attribute set by custom authentication.
    """
    
    def has_permission(self, request, view):
        return (
            hasattr(request, 'usher') and
            request.usher is not None
        )


@api_view(['POST'])
@permission_classes([AllowAny])
@authentication_classes([])
def usher_login(request):
    """
    Usher login endpoint.
    POST /api/usher/login/
    Body: { "username": "usher1", "password": "password", "event_id": "uuid" }
    """
    serializer = UsherLoginSerializer(data=request.data)
    if not serializer.is_valid():
        raise ValidationError(serializer.errors)
    
    username = serializer.validated_data['username']
    password = serializer.validated_data['password']
    event_id = serializer.validated_data['event_id']
    
    # Authenticate usher via AdminUser
    from django.contrib.auth import authenticate
    from authentication.models import AdminUser
    
    user = authenticate(username=username, password=password)
    if not user:
        raise AuthenticationError("Invalid username or password")
    
    if not user.is_active:
        raise AuthenticationError("User account is disabled")
    
    if user.role != 'USHER':
        raise AuthenticationError("User is not an usher")
    
    # Get usher profile
    try:
        usher = Usher.objects.get(user=user)
    except Usher.DoesNotExist:
        raise AuthenticationError("Usher profile not found")
    
    if usher.status != 'active':
        raise AuthenticationError("Usher account is not active")
    
    # Validate event assignment - check event exists in admin system
    try:
        event = Event.objects.select_related('organizer', 'venue').get(id=event_id)
    except Event.DoesNotExist:
        raise ValidationError(
            detail=f'Event with ID {event_id} not found in the system',
            code='EVENT_NOT_FOUND'
        )
    
    # Check if event is active/valid for scanning
    if event.status not in ['scheduled', 'ongoing', 'upcoming']:
        raise ValidationError(
            detail=f'Event "{event.title}" is not active for scanning. Current status: {event.status}',
            code='EVENT_NOT_ACTIVE'
        )
    
    # Verify usher is assigned to this event
    if event not in usher.events.all():
        raise AuthenticationError(
            detail=f'Usher "{usher.name}" is not assigned to event "{event.title}"',
            code='EVENT_NOT_ASSIGNED'
        )
    
    # Update last active
    usher.last_active = timezone.now()
    usher.save(update_fields=['last_active'])
    
    # Generate JWT tokens
    refresh = RefreshToken()
    refresh['usher_id'] = str(usher.id)
    refresh['event_id'] = str(event_id)
    refresh['username'] = username
    
    access_token = refresh.access_token
    
    return Response({
        'access': str(access_token),
        'refresh': str(refresh),
        'usher': UsherProfileSerializer(usher).data,
        'event': EventSerializer(event).data
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsUsherPortal])
@authentication_classes([UsherJWTAuthentication])
def usher_logout(request):
    """
    Usher logout endpoint.
    POST /api/usher/logout/
    """
    try:
        refresh_token = request.data.get('refresh_token')
        if refresh_token:
            token = RefreshToken(refresh_token)
            token.blacklist()
        return Response({'message': 'Logged out successfully'}, status=status.HTTP_200_OK)
    except Exception:
        return Response({'message': 'Logged out successfully'}, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsUsherPortal])
@authentication_classes([UsherJWTAuthentication])
def usher_me(request):
    """
    Get current usher profile.
    GET /api/usher/me/
    """
    if not hasattr(request, 'usher') or request.usher is None:
        return Response({
            'error': {'code': 'AUTHENTICATION_ERROR', 'message': 'Usher not authenticated'}
        }, status=status.HTTP_401_UNAUTHORIZED)
    
    usher = request.usher
    serializer = UsherProfileSerializer(usher)
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsUsherPortal])
@authentication_classes([UsherJWTAuthentication])
def usher_events_list(request):
    """
    List assigned events for usher.
    GET /api/usher/events/
    """
    if not hasattr(request, 'usher') or request.usher is None:
        return Response({
            'error': {'code': 'AUTHENTICATION_ERROR', 'message': 'Usher not authenticated'}
        }, status=status.HTTP_401_UNAUTHORIZED)
    
    usher = request.usher
    events = usher.events.all()
    serializer = EventSerializer(events, many=True)
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsUsherPortal])
@authentication_classes([UsherJWTAuthentication])
def usher_event_detail(request, event_id):
    """
    Get event details.
    GET /api/usher/events/:id/
    """
    if not hasattr(request, 'usher') or request.usher is None:
        return Response({
            'error': {'code': 'AUTHENTICATION_ERROR', 'message': 'Usher not authenticated'}
        }, status=status.HTTP_401_UNAUTHORIZED)
    
    usher = request.usher
    try:
        event = Event.objects.get(id=int(event_id))
    except (Event.DoesNotExist, ValueError):
        return Response({
            'error': {'code': 'NOT_FOUND', 'message': 'Event not found'}
        }, status=status.HTTP_404_NOT_FOUND)
    
    if event not in usher.events.all():
        return Response({
            'error': {'code': 'FORBIDDEN', 'message': 'Usher is not assigned to this event'}
        }, status=status.HTTP_403_FORBIDDEN)
    
    serializer = EventSerializer(event)
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsUsherPortal])
@authentication_classes([UsherJWTAuthentication])
def usher_event_validate_assignment(request, event_id):
    """
    Validate event assignment.
    POST /api/usher/events/:id/validate-assignment/
    """
    if not hasattr(request, 'usher') or request.usher is None:
        return Response({
            'error': {'code': 'AUTHENTICATION_ERROR', 'message': 'Usher not authenticated'}
        }, status=status.HTTP_401_UNAUTHORIZED)
    
    usher = request.usher
    try:
        event = Event.objects.get(id=int(event_id))
    except (Event.DoesNotExist, ValueError):
        return Response({
            'error': {'code': 'NOT_FOUND', 'message': 'Event not found'}
        }, status=status.HTTP_404_NOT_FOUND)
    
    is_assigned = event in usher.events.all()
    return Response({
        'is_assigned': is_assigned,
        'event_id': event_id,
        'usher_id': str(usher.id)
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsUsherPortal])
@authentication_classes([UsherJWTAuthentication])
def usher_scan_verify_card(request):
    """
    Verify NFC card ID.
    POST /api/usher/scan/verify-card/
    Body: { "card_id": "card123" }
    """
    serializer = ScanCardSerializer(data=request.data)
    if not serializer.is_valid():
        raise ValidationError(serializer.errors)
    
    card_id = serializer.validated_data['card_id']
    
    try:
        card = NFCCard.objects.get(serial_number=card_id)
    except NFCCard.DoesNotExist:
        return Response({
            'error': {'code': 'NOT_FOUND', 'message': 'Card not found'},
            'valid': False
        }, status=status.HTTP_200_OK)
    
    return Response({
        'valid': True,
        'card_id': card.serial_number,
        'status': card.status,
        'customer_id': str(card.customer.id) if card.customer else None
    }, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsUsherPortal])
@authentication_classes([UsherJWTAuthentication])
def usher_scan_attendee_by_card(request, card_id):
    """
    Get attendee by card ID.
    GET /api/usher/scan/attendee/:card_id/
    """
    # Trim whitespace from card_id
    card_id = card_id.strip()
    
    event_id = request.query_params.get('event_id')
    
    try:
        card = NFCCard.objects.get(serial_number=card_id)
    except NFCCard.DoesNotExist:
        return Response({
            'error': {'code': 'NOT_FOUND', 'message': 'Card not found'}
        }, status=status.HTTP_404_NOT_FOUND)
    
    if not card.customer:
        return Response({
            'error': {'code': 'NO_CUSTOMER', 'message': 'Card is not assigned to a customer'}
        }, status=status.HTTP_404_NOT_FOUND)
    
    customer = card.customer
    
    # Get ticket for event if event_id provided
    ticket = None
    ticket_status = 'invalid'
    ticket_tier = 'standard'
    scan_status = 'not_scanned'
    
    if event_id:
        try:
            event_id_int = int(event_id)
            event = Event.objects.get(id=event_id_int)
            
            # Look for tickets for this customer and event
            # Check both customer (current owner) and buyer (original purchaser) relationships
            tickets = Ticket.objects.filter(
                event=event
            ).filter(
                Q(customer=customer) | Q(buyer=customer)
            ).exclude(
                status__in=['refunded', 'banned']  # Exclude invalid statuses
            ).order_by('-purchase_date')  # Get most recent ticket first
            
            if tickets.exists():
                ticket = tickets.first()
                
                # Determine ticket status
                if ticket.status == 'valid':
                    ticket_status = 'valid'
                    scan_status = 'not_scanned'
                elif ticket.status == 'used':
                    ticket_status = 'valid'  # Still valid, just already scanned
                    scan_status = 'already_scanned'
                else:
                    ticket_status = 'invalid'
                    scan_status = 'not_scanned'
                
                ticket_tier = ticket.category.lower() if ticket.category else 'standard'
            else:
                # No ticket found for this event
                ticket_status = 'invalid'
                scan_status = 'not_scanned'
                
        except (Event.DoesNotExist, ValueError, TypeError):
            # Event not found or invalid event_id
            ticket_status = 'invalid'
            scan_status = 'not_scanned'
    
    # Get all events this customer has tickets for (for reference)
    customer_events = []
    try:
        # Get unique events this customer has tickets for
        all_tickets = Ticket.objects.filter(
            Q(customer=customer) | Q(buyer=customer)
        ).exclude(
            status__in=['refunded', 'banned']
        ).select_related('event').order_by('-purchase_date')
        
        # Get unique events (avoid duplicates)
        seen_events = set()
        for ticket in all_tickets:
            if ticket.event.id not in seen_events:
                seen_events.add(ticket.event.id)
                customer_events.append({
                    'event_id': ticket.event.id,
                    'event_title': ticket.event.title,
                    'ticket_status': ticket.status,
                    'ticket_tier': ticket.category.lower() if ticket.category else 'standard'
                })
                if len(customer_events) >= 10:  # Limit to 10 most recent
                    break
    except Exception:
        pass
    
    # Get dependents/children
    children = []
    try:
        dependents = Dependent.objects.filter(customer=customer)
        for dep in dependents:
            children.append({
                'name': dep.name if dep.name else '',
                'age': dep.age if dep.age else None,
                'relationship': dep.relationship if dep.relationship else ''
            })
    except Exception:
        pass
    
    # Get photo URL
    photo_url = None
    try:
        if customer.profile_image:
            request_obj = request if hasattr(request, 'build_absolute_uri') else None
            if request_obj:
                photo_url = request_obj.build_absolute_uri(customer.profile_image.url)
            else:
                photo_url = customer.profile_image.url
    except Exception:
        pass
    
    # Prepare attendee data
    attendee_data = {
        'customer_id': customer.id,  # Keep as UUID, serializer will handle it
        'name': customer.name if customer.name else '',
        'photo': photo_url,
        'card_id': card_id,
        'ticket_id': ticket.id if ticket and hasattr(ticket, 'id') else None,
        'ticket_status': ticket_status,
        'ticket_tier': ticket_tier,
        'scan_status': scan_status,
        'emergency_contact': customer.emergency_contact_mobile if hasattr(customer, 'emergency_contact_mobile') and customer.emergency_contact_mobile else None,
        'emergency_contact_name': customer.emergency_contact_name if hasattr(customer, 'emergency_contact_name') and customer.emergency_contact_name else None,
        'blood_type': customer.blood_type if hasattr(customer, 'blood_type') and customer.blood_type else None,
        'labels': [],
        'children': children,
        'customer_events': customer_events  # All events customer has tickets for
    }
    
    # Validate and serialize
    serializer = AttendeeSerializer(data=attendee_data)
    if serializer.is_valid():
        return Response(serializer.validated_data, status=status.HTTP_200_OK)
    else:
        # If serializer validation fails, return data anyway but log the error
        import logging
        logger = logging.getLogger(__name__)
        logger.warning(f"AttendeeSerializer validation failed: {serializer.errors}")
        # Return the data directly, converting UUIDs to strings for JSON serialization
        response_data = {
            'customer_id': str(customer.id),
            'name': attendee_data['name'],
            'photo': attendee_data['photo'],
            'card_id': attendee_data['card_id'],
            'ticket_id': str(ticket.id) if ticket and hasattr(ticket, 'id') else None,
            'ticket_status': attendee_data['ticket_status'],
            'ticket_tier': attendee_data['ticket_tier'],
            'scan_status': attendee_data['scan_status'],
            'emergency_contact': attendee_data.get('emergency_contact'),
            'emergency_contact_name': attendee_data.get('emergency_contact_name'),
            'blood_type': attendee_data.get('blood_type'),
            'labels': attendee_data['labels'],
            'children': attendee_data['children'],
            'customer_events': attendee_data.get('customer_events', [])
        }
        return Response(response_data, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsUsherPortal])
@authentication_classes([UsherJWTAuthentication])
def usher_scan_result(request):
    """
    Process scan result.
    POST /api/usher/scan/result/
    Body: { "card_id": "card123", "event_id": "uuid", "result": "valid", "notes": "" }
    """
    serializer = ScanResultSerializer(data=request.data)
    if not serializer.is_valid():
        raise ValidationError(serializer.errors)
    
    if not hasattr(request, 'usher') or request.usher is None:
        return Response({
            'error': {'code': 'AUTHENTICATION_ERROR', 'message': 'Usher not authenticated'}
        }, status=status.HTTP_401_UNAUTHORIZED)
    
    usher = request.usher
    card_id = serializer.validated_data['card_id']
    event_id = serializer.validated_data['event_id']
    result = serializer.validated_data['result']
    notes = serializer.validated_data.get('notes', '')
    
    try:
        card = NFCCard.objects.get(serial_number=card_id)
        event = Event.objects.get(id=event_id)
    except (NFCCard.DoesNotExist, Event.DoesNotExist):
        return Response({
            'error': {'code': 'NOT_FOUND', 'message': 'Card or event not found'}
        }, status=status.HTTP_404_NOT_FOUND)
    
    if not card.customer:
        return Response({
            'error': {'code': 'NO_CUSTOMER', 'message': 'Card is not assigned to a customer'}
        }, status=status.HTTP_400_BAD_REQUEST)
    
    customer = card.customer
    
    # Get ticket
    ticket = Ticket.objects.filter(customer=customer, event=event).first()
    
    # Update ticket status if valid scan
    if result == 'valid' and ticket:
        ticket.status = 'used'
        ticket.save()
    
    # Create check-in log
    scan_result_map = {
        'valid': 'success',
        'invalid': 'invalid',
        'already_scanned': 'duplicate',
        'not_found': 'failed'
    }
    
    CheckinLog.objects.create(
        customer=customer,
        event=event,
        ticket=ticket,
        nfc_card=card,
        scan_result=scan_result_map.get(result, 'failed'),
        scan_type='nfc',
        operator=usher.user if usher.user else None,
        operator_role='usher',
        timestamp=timezone.now(),
        notes=notes
    )
    
    return Response({
        'message': 'Scan result processed successfully',
        'result': result,
        'ticket_id': str(ticket.id) if ticket else None
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsUsherPortal])
@authentication_classes([UsherJWTAuthentication])
def usher_scan_log(request):
    """
    Log scan activity.
    POST /api/usher/scan/log/
    """
    if not hasattr(request, 'usher') or request.usher is None:
        return Response({
            'error': {'code': 'AUTHENTICATION_ERROR', 'message': 'Usher not authenticated'}
        }, status=status.HTTP_401_UNAUTHORIZED)
    
    # This endpoint can be used for additional logging if needed
    # The scan result endpoint already creates logs
    return Response({'message': 'Scan logged'}, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsUsherPortal])
@authentication_classes([UsherJWTAuthentication])
def usher_scan_logs_list(request):
    """
    List scan logs (paginated, 10 per page).
    GET /api/usher/scan/logs/
    """
    if not hasattr(request, 'usher') or request.usher is None:
        return Response({
            'error': {'code': 'AUTHENTICATION_ERROR', 'message': 'Usher not authenticated'}
        }, status=status.HTTP_401_UNAUTHORIZED)
    
    usher = request.usher
    event_id = request.query_params.get('event_id')
    
    logs = CheckinLog.objects.filter(operator=usher.user).order_by('-timestamp')
    
    if event_id:
        logs = logs.filter(event_id=event_id)
    
    # Pagination
    page = request.query_params.get('page', 1)
    paginator = Paginator(logs, 10)
    page_obj = paginator.get_page(page)
    
    serializer = ScanLogSerializer(page_obj, many=True)
    return Response({
        'results': serializer.data,
        'count': paginator.count,
        'next': page_obj.next_page_number() if page_obj.has_next() else None,
        'previous': page_obj.previous_page_number() if page_obj.has_previous() else None,
        'page': page_obj.number,
        'total_pages': paginator.num_pages
    }, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsUsherPortal])
@authentication_classes([UsherJWTAuthentication])
def usher_scan_logs_search(request):
    """
    Search scan logs.
    GET /api/usher/scan/logs/search/
    """
    serializer = ScanLogSearchSerializer(data=request.query_params)
    if not serializer.is_valid():
        raise ValidationError(serializer.errors)
    
    if not hasattr(request, 'usher') or request.usher is None:
        return Response({
            'error': {'code': 'AUTHENTICATION_ERROR', 'message': 'Usher not authenticated'}
        }, status=status.HTTP_401_UNAUTHORIZED)
    
    usher = request.usher
    logs = CheckinLog.objects.filter(operator=usher.user)
    
    # Apply filters
    if serializer.validated_data.get('card_id'):
        logs = logs.filter(nfc_card__serial_number=serializer.validated_data['card_id'])
    
    if serializer.validated_data.get('result'):
        result_map = {
            'valid': 'success',
            'invalid': 'invalid',
            'already_scanned': 'duplicate',
            'not_found': 'failed'
        }
        logs = logs.filter(scan_result=result_map.get(serializer.validated_data['result'], 'failed'))
    
    if serializer.validated_data.get('event_id'):
        logs = logs.filter(event_id=serializer.validated_data['event_id'])
    
    if serializer.validated_data.get('attendee_name'):
        logs = logs.filter(customer__name__icontains=serializer.validated_data['attendee_name'])
    
    logs = logs.order_by('-timestamp')[:50]  # Limit to 50 results
    
    serializer = ScanLogSerializer(logs, many=True)
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsUsherPortal])
@authentication_classes([UsherJWTAuthentication])
def usher_part_time_leave(request):
    """
    Log part-time leave.
    POST /api/usher/scan/part-time-leave/
    """
    if not hasattr(request, 'usher') or request.usher is None:
        return Response({
            'error': {'code': 'AUTHENTICATION_ERROR', 'message': 'Usher not authenticated'}
        }, status=status.HTTP_401_UNAUTHORIZED)
    
    usher = request.usher
    event_id = request.data.get('event_id')
    reason = request.data.get('reason', '')
    
    if not event_id:
        raise ValidationError("event_id is required")
    
    try:
        event = Event.objects.get(id=event_id)
    except Event.DoesNotExist:
        return Response({
            'error': {'code': 'NOT_FOUND', 'message': 'Event not found'}
        }, status=status.HTTP_404_NOT_FOUND)
    
    leave = PartTimeLeave.objects.create(
        usher=usher,
        event=event,
        leave_time=timezone.now(),
        reason=reason
    )
    
    serializer = PartTimeLeaveSerializer(leave)
    return Response(serializer.data, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([IsUsherPortal])
@authentication_classes([UsherJWTAuthentication])
def usher_part_time_leave_list(request):
    """
    Get part-time leave history.
    GET /api/usher/scan/part-time-leave/
    """
    if not hasattr(request, 'usher') or request.usher is None:
        return Response({
            'error': {'code': 'AUTHENTICATION_ERROR', 'message': 'Usher not authenticated'}
        }, status=status.HTTP_401_UNAUTHORIZED)
    
    usher = request.usher
    leaves = PartTimeLeave.objects.filter(usher=usher).order_by('-leave_time')
    
    serializer = PartTimeLeaveSerializer(leaves, many=True)
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsUsherPortal])
@authentication_classes([UsherJWTAuthentication])
def usher_scan_report(request):
    """
    Report scan issue or incident.
    POST /api/usher/scan/report/
    """
    serializer = ScanReportSerializer(data=request.data)
    if not serializer.is_valid():
        raise ValidationError(serializer.errors)
    
    if not hasattr(request, 'usher') or request.usher is None:
        return Response({
            'error': {'code': 'AUTHENTICATION_ERROR', 'message': 'Usher not authenticated'}
        }, status=status.HTTP_401_UNAUTHORIZED)
    
    usher = request.usher
    
    report = ScanReport.objects.create(
        usher=usher,
        event_id=serializer.validated_data['event'],
        report_type=serializer.validated_data['report_type'],
        description=serializer.validated_data['description'],
        card_id=serializer.validated_data.get('card_id'),
        ticket_id=serializer.validated_data.get('ticket_id'),
        customer_id=serializer.validated_data.get('customer_id')
    )
    
    serializer = ScanReportSerializer(report)
    return Response(serializer.data, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([IsUsherPortal])
@authentication_classes([UsherJWTAuthentication])
def usher_sync_attendees(request):
    """
    Get attendees for event (for offline cache).
    GET /api/usher/sync/attendees/?event_id=uuid
    """
    event_id = request.query_params.get('event_id')
    if not event_id:
        raise ValidationError("event_id is required")
    
    try:
        event = Event.objects.get(id=event_id)
    except Event.DoesNotExist:
        return Response({
            'error': {'code': 'NOT_FOUND', 'message': 'Event not found'}
        }, status=status.HTTP_404_NOT_FOUND)
    
    # Get all tickets for this event
    tickets = Ticket.objects.filter(event=event, status__in=['valid', 'used']).select_related('customer')
    
    attendees = []
    for ticket in tickets:
        if ticket.customer:
            card = NFCCard.objects.filter(customer=ticket.customer).first()
            attendees.append({
                'customer_id': str(ticket.customer.id),
                'name': ticket.customer.name,
                'card_id': card.serial_number if card else None,
                'ticket_id': str(ticket.id),
                'ticket_status': ticket.status,
                'ticket_tier': ticket.category.lower() if ticket.category else 'standard'
            })
    
    return Response({'attendees': attendees}, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsUsherPortal])
@authentication_classes([UsherJWTAuthentication])
def usher_sync_cards(request):
    """
    Get card data for event.
    GET /api/usher/sync/cards/?event_id=uuid
    """
    event_id = request.query_params.get('event_id')
    if not event_id:
        raise ValidationError("event_id is required")
    
    try:
        event = Event.objects.get(id=event_id)
    except Event.DoesNotExist:
        return Response({
            'error': {'code': 'NOT_FOUND', 'message': 'Event not found'}
        }, status=status.HTTP_404_NOT_FOUND)
    
    # Get all cards for customers with tickets for this event
    tickets = Ticket.objects.filter(event=event).select_related('customer')
    customer_ids = [t.customer.id for t in tickets if t.customer]
    
    cards = NFCCard.objects.filter(customer_id__in=customer_ids)
    
    card_data = []
    for card in cards:
        card_data.append({
            'card_id': card.serial_number,
            'customer_id': str(card.customer.id) if card.customer else None,
            'status': card.status
        })
    
    return Response({'cards': card_data}, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsUsherPortal])
@authentication_classes([UsherJWTAuthentication])
def usher_nfc_status(request):
    """
    Get NFC availability status.
    GET /api/usher/nfc/status/
    """
    return Response({
        'nfc_available': True,  # Browser will check actual NFC support
        'message': 'NFC status check'
    }, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsUsherPortal])
@authentication_classes([UsherJWTAuthentication])
def usher_event_status(request, event_id):
    """
    Get real-time event status.
    GET /api/usher/events/:id/status/
    """
    try:
        event = Event.objects.get(id=int(event_id))
    except (Event.DoesNotExist, ValueError):
        return Response({
            'error': {'code': 'NOT_FOUND', 'message': 'Event not found'}
        }, status=status.HTTP_404_NOT_FOUND)
    
    return Response({
        'event_id': event_id,
        'status': event.status,
        'is_active': event.status == 'ongoing',
        'scanning_enabled': event.status in ['ongoing', 'scheduled', 'upcoming']
    }, status=status.HTTP_200_OK)

