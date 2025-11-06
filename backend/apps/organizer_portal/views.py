"""
Views for Organizer Portal.
"""
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from django.utils import timezone
from django.db.models import Q, Count, Sum

from users.models import Organizer
from events.models import Event
from tickets.models import Ticket
from finances.models import Payout
from core.otp_service import create_and_send_otp, verify_otp
from core.exceptions import AuthenticationError, ValidationError
from core.permissions import IsOrganizer
from .serializers import (
    OrganizerLoginSerializer, OrganizerOTPSerializer,
    OrganizerProfileSerializer, OrganizerEventSerializer,
    OrganizerEventAnalyticsSerializer, OrganizerPayoutSerializer,
    EventEditRequestSerializer
)


@api_view(['POST'])
@permission_classes([AllowAny])
def organizer_login(request):
    """
    Organizer login endpoint.
    POST /api/organizer/login/
    """
    serializer = OrganizerLoginSerializer(data=request.data)
    if not serializer.is_valid():
        raise ValidationError(serializer.errors)
    
    mobile = serializer.validated_data['mobile']
    password = serializer.validated_data['password']
    
    try:
        organizer = Organizer.objects.get(contact_mobile=mobile)
    except Organizer.DoesNotExist:
        raise AuthenticationError("Invalid mobile number or password")
    
    if not organizer.check_password(password):
        raise AuthenticationError("Invalid mobile number or password")
    
    if organizer.status != 'active':
        raise AuthenticationError("Your account is not active")
    
    # Create and send OTP
    otp, success = create_and_send_otp(mobile, 'login', app_name="TicketRunners Organizer")
    
    if not success:
        return Response({
            'error': {
                'code': 'OTP_SEND_FAILED',
                'message': 'Failed to send OTP. Please try again.'
            }
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    return Response({
        'message': 'OTP sent to your mobile number',
        'mobile': mobile
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([AllowAny])
def organizer_verify_otp(request):
    """
    Verify OTP and return JWT tokens.
    POST /api/organizer/verify-otp/
    """
    serializer = OrganizerOTPSerializer(data=request.data)
    if not serializer.is_valid():
        raise ValidationError(serializer.errors)
    
    mobile = serializer.validated_data['mobile']
    otp_code = serializer.validated_data['otp_code']
    
    if not verify_otp(mobile, otp_code, 'login'):
        raise AuthenticationError("Invalid or expired OTP")
    
    try:
        organizer = Organizer.objects.get(contact_mobile=mobile)
    except Organizer.DoesNotExist:
        raise AuthenticationError("Organizer not found")
    
    # Generate JWT tokens
    # We'll use a custom token that includes organizer info
    # For now, we'll create a simple token response
    # In production, you'd want to create a custom JWT token
    
    # Update last login
    organizer.last_login = timezone.now()
    organizer.save(update_fields=['last_login'])
    
    # Create refresh token (we'll need to customize this)
    refresh = RefreshToken()
    refresh['organizer_id'] = str(organizer.id)
    refresh['mobile'] = mobile
    
    return Response({
        'access': str(refresh.access_token),
        'refresh': str(refresh),
        'organizer': OrganizerProfileSerializer(organizer).data
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsOrganizer])
def organizer_logout(request):
    """
    Organizer logout endpoint.
    POST /api/organizer/logout/
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
@permission_classes([IsOrganizer])
def organizer_me(request):
    """
    Get current organizer profile.
    GET /api/organizer/me/
    """
    organizer = request.organizer
    serializer = OrganizerProfileSerializer(organizer)
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsOrganizer])
def organizer_dashboard_stats(request):
    """
    Get organizer dashboard statistics.
    GET /api/organizer/dashboard/stats/
    """
    organizer = request.organizer
    
    events = Event.objects.filter(organizer=organizer)
    tickets_qs = Ticket.objects.filter(event__organizer=organizer)
    payouts = Payout.objects.filter(event__organizer=organizer)
    
    stats = {
        'total_events': events.count(),
        'running_events': events.filter(status='ongoing').count(),
        'completed_events': events.filter(status='completed').count(),
        'available_tickets': tickets_qs.filter(status='valid').count(),
        'total_tickets_sold': tickets_qs.filter(status__in=['valid', 'used']).count(),
        'total_attendees': tickets_qs.filter(status='used').count(),
        'total_revenues': float(tickets_qs.filter(status__in=['valid', 'used']).aggregate(
            total=Sum('price')
        )['total'] or 0),
        'net_revenues': float(payouts.filter(status='completed').aggregate(
            total=Sum('amount')
        )['total'] or 0),
        'total_processed_payouts': float(payouts.filter(status='completed').aggregate(
            total=Sum('amount')
        )['total'] or 0),
        'total_pending_payouts': float(payouts.filter(status='pending').aggregate(
            total=Sum('amount')
        )['total'] or 0),
    }
    
    return Response(stats, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsOrganizer])
def organizer_events_list(request):
    """
    List organizer's events.
    GET /api/organizer/events/
    """
    organizer = request.organizer
    events = Event.objects.filter(organizer=organizer).select_related('venue', 'category')
    
    # Filtering
    status_filter = request.query_params.get('status')
    location_filter = request.query_params.get('location')
    search = request.query_params.get('search')
    
    if status_filter:
        events = events.filter(status=status_filter)
    if location_filter:
        events = events.filter(location__icontains=location_filter)
    if search:
        events = events.filter(Q(title__icontains=search) | Q(location__icontains=search))
    
    serializer = OrganizerEventSerializer(events, many=True)
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsOrganizer])
def organizer_event_detail(request, event_id):
    """
    Get event details with analytics.
    GET /api/organizer/events/:id/
    """
    organizer = request.organizer
    try:
        event = Event.objects.get(id=event_id, organizer=organizer)
    except Event.DoesNotExist:
        return Response({
            'error': {'code': 'NOT_FOUND', 'message': 'Event not found'}
        }, status=status.HTTP_404_NOT_FOUND)
    
    serializer = OrganizerEventAnalyticsSerializer(event)
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsOrganizer])
def organizer_event_edit_request(request, event_id):
    """
    Submit event edit request.
    POST /api/organizer/events/:id/edit-request/
    """
    organizer = request.organizer
    try:
        event = Event.objects.get(id=event_id, organizer=organizer)
    except Event.DoesNotExist:
        return Response({
            'error': {'code': 'NOT_FOUND', 'message': 'Event not found'}
        }, status=status.HTTP_404_NOT_FOUND)
    
    serializer = EventEditRequestSerializer(data={
        'event': event.id,
        'organizer': organizer.id,
        'requested_changes': request.data.get('requested_changes', ''),
        'file_attachments': request.data.get('file_attachments', ''),
    })
    
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    raise ValidationError(serializer.errors)


@api_view(['GET'])
@permission_classes([IsOrganizer])
def organizer_payouts_list(request):
    """
    List organizer's payouts.
    GET /api/organizer/payouts/
    """
    organizer = request.organizer
    payouts = Payout.objects.filter(event__organizer=organizer).select_related('event')
    
    # Filtering
    status_filter = request.query_params.get('status')
    search = request.query_params.get('search')
    
    if status_filter:
        payouts = payouts.filter(status=status_filter)
    if search:
        payouts = payouts.filter(
            Q(event__title__icontains=search) |
            Q(transaction_id__icontains=search) |
            Q(description__icontains=search)
        )
    
    serializer = OrganizerPayoutSerializer(payouts, many=True)
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsOrganizer])
def organizer_payout_detail(request, payout_id):
    """
    Get payout details.
    GET /api/organizer/payouts/:id/
    """
    organizer = request.organizer
    try:
        payout = Payout.objects.get(id=payout_id, event__organizer=organizer)
    except Payout.DoesNotExist:
        return Response({
            'error': {'code': 'NOT_FOUND', 'message': 'Payout not found'}
        }, status=status.HTTP_404_NOT_FOUND)
    
    serializer = OrganizerPayoutSerializer(payout)
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['GET', 'PUT'])
@permission_classes([IsOrganizer])
def organizer_profile(request):
    """
    Get or update organizer profile.
    GET /api/organizer/profile/
    PUT /api/organizer/profile/
    """
    organizer = request.organizer
    
    if request.method == 'GET':
        serializer = OrganizerProfileSerializer(organizer)
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    # PUT - Update profile
    serializer = OrganizerProfileSerializer(organizer, data=request.data, partial=True)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    raise ValidationError(serializer.errors)


@api_view(['POST'])
@permission_classes([IsOrganizer])
def organizer_change_password(request):
    """
    Change organizer password.
    POST /api/organizer/profile/change-password/
    """
    organizer = request.organizer
    
    current_password = request.data.get('current_password')
    otp_code = request.data.get('otp_code')
    new_password = request.data.get('new_password')
    
    if not all([current_password, otp_code, new_password]):
        raise ValidationError("All fields are required")
    
    # Verify current password
    if not organizer.check_password(current_password):
        raise AuthenticationError("Current password is incorrect")
    
    # Verify OTP
    if not verify_otp(organizer.contact_mobile, otp_code, 'forgot_password'):
        raise AuthenticationError("Invalid or expired OTP")
    
    # Set new password
    organizer.set_password(new_password)
    organizer.save()
    
    return Response({'message': 'Password changed successfully'}, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([AllowAny])
def organizer_forgot_password(request):
    """
    Request password reset OTP.
    POST /api/organizer/forgot-password/
    """
    mobile = request.data.get('mobile')
    if not mobile:
        raise ValidationError("mobile is required")
    
    try:
        organizer = Organizer.objects.get(contact_mobile=mobile)
    except Organizer.DoesNotExist:
        # Don't reveal if organizer exists for security
        return Response({
            'message': 'If the mobile number exists, an OTP has been sent'
        }, status=status.HTTP_200_OK)
    
    otp, success = create_and_send_otp(mobile, 'forgot_password', app_name="TicketRunners Organizer")
    
    if not success:
        return Response({
            'error': {'code': 'OTP_SEND_FAILED', 'message': 'Failed to send OTP'}
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    return Response({
        'message': 'OTP sent to your mobile number',
        'mobile': mobile
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([AllowAny])
def organizer_reset_password(request):
    """
    Reset password with OTP.
    POST /api/organizer/reset-password/
    """
    mobile = request.data.get('mobile')
    otp_code = request.data.get('otp_code')
    new_password = request.data.get('new_password')
    
    if not all([mobile, otp_code, new_password]):
        raise ValidationError("mobile, otp_code, and new_password are required")
    
    if not verify_otp(mobile, otp_code, 'forgot_password'):
        raise AuthenticationError("Invalid or expired OTP")
    
    try:
        organizer = Organizer.objects.get(contact_mobile=mobile)
    except Organizer.DoesNotExist:
        raise AuthenticationError("Organizer not found")
    
    organizer.set_password(new_password)
    organizer.save()
    
    return Response({'message': 'Password reset successfully'}, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsOrganizer])
def organizer_payout_invoice(request, payout_id):
    """
    Download payout invoice PDF.
    GET /api/organizer/payouts/:id/invoice/
    """
    organizer = request.organizer
    try:
        payout = Payout.objects.get(id=payout_id, event__organizer=organizer)
    except Payout.DoesNotExist:
        return Response({
            'error': {'code': 'NOT_FOUND', 'message': 'Payout not found'}
        }, status=status.HTTP_404_NOT_FOUND)
    
    # Generate invoice data (PDF generation will be added with library)
    invoice_data = {
        'transaction_id': payout.transaction_id,
        'event': payout.event.title,
        'amount': float(payout.amount),
        'date': payout.date,
        'status': payout.status,
        'description': payout.description,
        'organizer': organizer.name,
    }
    
    # TODO: Generate PDF using reportlab or weasyprint
    # For now, return JSON data
    return Response({
        'message': 'Invoice data (PDF generation pending)',
        'invoice': invoice_data
    }, status=status.HTTP_200_OK)
