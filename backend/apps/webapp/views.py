"""
Views for WebApp Portal (User-Facing).
"""
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from django.utils import timezone
from django.db.models import Q, Sum, Count
from datetime import timedelta
import uuid

from customers.models import Customer, Dependent
from events.models import Event
from tickets.models import Ticket
from nfc_cards.models import NFCCard, NFCCardAutoReload, NFCCardTransaction
from payments.models import PaymentTransaction
from apps.webapp.models import Favorite
from core.otp_service import create_and_send_otp, verify_otp
from core.exceptions import AuthenticationError, ValidationError
from .serializers import (
    UserRegistrationSerializer, UserOTPSerializer, UserLoginSerializer,
    UserProfileSerializer, DependentSerializer, PublicEventSerializer,
    TicketBookingSerializer, TicketSerializer, NFCCardSerializer,
    PaymentTransactionSerializer, FavoriteSerializer
)


@api_view(['POST'])
@permission_classes([AllowAny])
def user_register(request):
    """
    User registration.
    POST /api/v1/users/register/
    """
    serializer = UserRegistrationSerializer(data=request.data)
    if not serializer.is_valid():
        raise ValidationError(serializer.errors)
    
    mobile_number = serializer.validated_data['mobile_number']
    
    # Check if user already exists
    if Customer.objects.filter(mobile_number=mobile_number).exists():
        raise ValidationError("User with this mobile number already exists")
    
    # Create and send OTP
    otp, success = create_and_send_otp(mobile_number, 'registration', app_name="TicketRunners")
    
    if not success:
        return Response({
            'error': {'code': 'OTP_SEND_FAILED', 'message': 'Failed to send OTP'}
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    # Store registration data temporarily (in production, use cache or session)
    return Response({
        'message': 'OTP sent to your mobile number',
        'mobile_number': mobile_number
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([AllowAny])
def user_verify_otp(request):
    """
    Verify OTP and complete registration.
    POST /api/v1/users/verify-otp/
    """
    serializer = UserOTPSerializer(data=request.data)
    if not serializer.is_valid():
        raise ValidationError(serializer.errors)
    
    mobile_number = serializer.validated_data['mobile_number']
    otp_code = serializer.validated_data['otp_code']
    
    if not verify_otp(mobile_number, otp_code, 'registration'):
        raise AuthenticationError("Invalid or expired OTP")
    
    # Get registration data (in production, retrieve from cache/session)
    # For now, we'll require it in the request
    name = request.data.get('name')
    email = request.data.get('email')
    password = request.data.get('password')
    
    if not all([name, email, password]):
        raise ValidationError("name, email, and password are required")
    
    # Create customer
    customer = Customer.objects.create(
        name=name,
        email=email,
        mobile_number=mobile_number,
        phone=mobile_number,  # Use mobile_number as phone
        status='active'
    )
    customer.set_password(password)
    customer.save()
    
    # Generate JWT tokens
    refresh = RefreshToken()
    refresh['customer_id'] = str(customer.id)
    refresh['mobile'] = mobile_number
    
    return Response({
        'access': str(refresh.access_token),
        'refresh': str(refresh),
        'user': UserProfileSerializer(customer).data
    }, status=status.HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([AllowAny])
def user_login(request):
    """
    User login.
    POST /api/v1/users/login/
    """
    serializer = UserLoginSerializer(data=request.data)
    if not serializer.is_valid():
        raise ValidationError(serializer.errors)
    
    mobile_number = serializer.validated_data['mobile_number']
    password = serializer.validated_data['password']
    
    try:
        customer = Customer.objects.get(mobile_number=mobile_number)
    except Customer.DoesNotExist:
        raise AuthenticationError("Invalid mobile number or password")
    
    if not customer.check_password(password):
        raise AuthenticationError("Invalid mobile number or password")
    
    if customer.status != 'active':
        raise AuthenticationError("Your account is not active")
    
    # Create and send OTP
    otp, success = create_and_send_otp(mobile_number, 'login', app_name="TicketRunners")
    
    if not success:
        return Response({
            'error': {'code': 'OTP_SEND_FAILED', 'message': 'Failed to send OTP'}
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    return Response({
        'message': 'OTP sent to your mobile number',
        'mobile_number': mobile_number
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([AllowAny])
def user_verify_login_otp(request):
    """
    Verify login OTP and return tokens.
    POST /api/v1/users/verify-login-otp/
    """
    serializer = UserOTPSerializer(data=request.data)
    if not serializer.is_valid():
        raise ValidationError(serializer.errors)
    
    mobile_number = serializer.validated_data['mobile_number']
    otp_code = serializer.validated_data['otp_code']
    
    if not verify_otp(mobile_number, otp_code, 'login'):
        raise AuthenticationError("Invalid or expired OTP")
    
    try:
        customer = Customer.objects.get(mobile_number=mobile_number)
    except Customer.DoesNotExist:
        raise AuthenticationError("User not found")
    
    customer.last_login = timezone.now()
    customer.save(update_fields=['last_login'])
    
    refresh = RefreshToken()
    refresh['customer_id'] = str(customer.id)
    refresh['mobile'] = mobile_number
    
    return Response({
        'access': str(refresh.access_token),
        'refresh': str(refresh),
        'user': UserProfileSerializer(customer).data
    }, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_me(request):
    """
    Get current user profile.
    GET /api/v1/users/me/
    """
    # In production, you'd extract customer from JWT token
    # For now, we'll use a simple approach
    customer_id = request.user.id if hasattr(request.user, 'id') else None
    if not customer_id:
        return Response({
            'error': {'code': 'UNAUTHORIZED', 'message': 'Authentication required'}
        }, status=status.HTTP_401_UNAUTHORIZED)
    
    try:
        customer = Customer.objects.get(id=customer_id)
    except Customer.DoesNotExist:
        return Response({
            'error': {'code': 'NOT_FOUND', 'message': 'User not found'}
        }, status=status.HTTP_404_NOT_FOUND)
    
    serializer = UserProfileSerializer(customer)
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([AllowAny])
def public_events_list(request):
    """
    Public event listing (no auth required).
    GET /api/v1/public/events/
    """
    events = Event.objects.filter(status__in=['upcoming', 'ongoing']).select_related('organizer', 'venue', 'category')
    
    # Filtering
    category = request.query_params.get('category')
    location = request.query_params.get('location')
    date_from = request.query_params.get('date_from')
    date_to = request.query_params.get('date_to')
    search = request.query_params.get('search')
    
    if category:
        events = events.filter(category__name=category)
    if location:
        events = events.filter(location__icontains=location)
    if date_from:
        events = events.filter(date__gte=date_from)
    if date_to:
        events = events.filter(date__lte=date_to)
    if search:
        events = events.filter(Q(title__icontains=search) | Q(description__icontains=search))
    
    serializer = PublicEventSerializer(events, many=True)
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([AllowAny])
def public_event_detail(request, event_id):
    """
    Public event details.
    GET /api/v1/public/events/:id/
    """
    try:
        event = Event.objects.select_related('organizer', 'venue', 'category').get(id=event_id)
    except Event.DoesNotExist:
        return Response({
            'error': {'code': 'NOT_FOUND', 'message': 'Event not found'}
        }, status=status.HTTP_404_NOT_FOUND)
    
    serializer = PublicEventSerializer(event)
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def ticket_book(request):
    """
    Book tickets.
    POST /api/v1/tickets/book/
    """
    serializer = TicketBookingSerializer(data=request.data)
    if not serializer.is_valid():
        raise ValidationError(serializer.errors)
    
    customer_id = request.user.id if hasattr(request.user, 'id') else None
    if not customer_id:
        return Response({
            'error': {'code': 'UNAUTHORIZED', 'message': 'Authentication required'}
        }, status=status.HTTP_401_UNAUTHORIZED)
    
    try:
        customer = Customer.objects.get(id=customer_id)
        event = Event.objects.get(id=serializer.validated_data['event_id'])
    except (Customer.DoesNotExist, Event.DoesNotExist):
        return Response({
            'error': {'code': 'NOT_FOUND', 'message': 'Customer or event not found'}
        }, status=status.HTTP_404_NOT_FOUND)
    
    category = serializer.validated_data['category']
    quantity = serializer.validated_data['quantity']
    payment_method = serializer.validated_data['payment_method']
    
    # Check ticket availability
    available_tickets = Ticket.objects.filter(event=event, category=category, status='valid').count()
    if available_tickets < quantity:
        return Response({
            'error': {'code': 'INSUFFICIENT_TICKETS', 'message': 'Not enough tickets available'}
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Calculate total amount
    # In production, get price from ticket category configuration
    price_per_ticket = 100.00  # Placeholder
    total_amount = price_per_ticket * quantity
    
    # Create payment transaction
    transaction = PaymentTransaction.objects.create(
        customer=customer,
        amount=total_amount,
        payment_method=payment_method,
        status='pending',
        transaction_id=str(uuid.uuid4())
    )
    
    # Create tickets
    tickets = []
    for i in range(quantity):
        ticket = Ticket.objects.create(
            event=event,
            customer=customer,
            category=category,
            price=price_per_ticket,
            status='valid',
            ticket_number=f"{event.id}-{customer.id}-{uuid.uuid4().hex[:8]}"
        )
        tickets.append(ticket)
    
    # Update transaction status
    transaction.status = 'completed'
    transaction.save()
    
    # Update customer stats
    customer.total_bookings += quantity
    customer.total_spent += total_amount
    customer.save()
    
    return Response({
        'message': 'Tickets booked successfully',
        'transaction_id': transaction.transaction_id,
        'tickets': TicketSerializer(tickets, many=True).data
    }, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_tickets_list(request):
    """
    Get user's tickets.
    GET /api/v1/users/tickets/
    """
    customer_id = request.user.id if hasattr(request.user, 'id') else None
    if not customer_id:
        return Response({
            'error': {'code': 'UNAUTHORIZED', 'message': 'Authentication required'}
        }, status=status.HTTP_401_UNAUTHORIZED)
    
    tickets = Ticket.objects.filter(customer_id=customer_id).select_related('event')
    serializer = TicketSerializer(tickets, many=True)
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_nfc_cards_list(request):
    """
    Get user's NFC cards.
    GET /api/v1/users/nfc-cards/
    """
    customer_id = request.user.id if hasattr(request.user, 'id') else None
    if not customer_id:
        return Response({
            'error': {'code': 'UNAUTHORIZED', 'message': 'Authentication required'}
        }, status=status.HTTP_401_UNAUTHORIZED)
    
    cards = NFCCard.objects.filter(customer_id=customer_id)
    serializer = NFCCardSerializer(cards, many=True)
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def user_dependents(request):
    """
    Get or add user's dependents.
    GET /api/v1/users/dependents/
    POST /api/v1/users/dependents/
    """
    customer_id = request.user.id if hasattr(request.user, 'id') else None
    if not customer_id:
        return Response({
            'error': {'code': 'UNAUTHORIZED', 'message': 'Authentication required'}
        }, status=status.HTTP_401_UNAUTHORIZED)
    
    try:
        customer = Customer.objects.get(id=customer_id)
    except Customer.DoesNotExist:
        return Response({
            'error': {'code': 'NOT_FOUND', 'message': 'User not found'}
        }, status=status.HTTP_404_NOT_FOUND)
    
    if request.method == 'GET':
        dependents = Dependent.objects.filter(customer=customer)
        serializer = DependentSerializer(dependents, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    # POST - Add dependent
    serializer = DependentSerializer(data={
        'customer': customer.id,
        **request.data
    })
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    raise ValidationError(serializer.errors)


@api_view(['GET', 'POST', 'DELETE'])
@permission_classes([IsAuthenticated])
def user_favorites(request, event_id=None):
    """
    Get, add, or remove favorites.
    GET /api/v1/users/favorites/
    POST /api/v1/users/favorites/
    DELETE /api/v1/users/favorites/:event_id/
    """
    customer_id = request.user.id if hasattr(request.user, 'id') else None
    if not customer_id:
        return Response({
            'error': {'code': 'UNAUTHORIZED', 'message': 'Authentication required'}
        }, status=status.HTTP_401_UNAUTHORIZED)
    
    try:
        customer = Customer.objects.get(id=customer_id)
    except Customer.DoesNotExist:
        return Response({
            'error': {'code': 'NOT_FOUND', 'message': 'User not found'}
        }, status=status.HTTP_404_NOT_FOUND)
    
    if request.method == 'GET':
        favorites = Favorite.objects.filter(customer=customer).select_related('event')
        serializer = FavoriteSerializer(favorites, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    if request.method == 'POST':
        event_id = request.data.get('event_id')
        if not event_id:
            raise ValidationError("event_id is required")
        
        try:
            event = Event.objects.get(id=event_id)
        except Event.DoesNotExist:
            return Response({
                'error': {'code': 'NOT_FOUND', 'message': 'Event not found'}
            }, status=status.HTTP_404_NOT_FOUND)
        
        favorite, created = Favorite.objects.get_or_create(customer=customer, event=event)
        serializer = FavoriteSerializer(favorite)
        return Response(serializer.data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)
    
    # DELETE
    if event_id:
        try:
            favorite = Favorite.objects.get(customer=customer, event_id=event_id)
            favorite.delete()
            return Response({'message': 'Favorite removed'}, status=status.HTTP_200_OK)
        except Favorite.DoesNotExist:
            return Response({
                'error': {'code': 'NOT_FOUND', 'message': 'Favorite not found'}
            }, status=status.HTTP_404_NOT_FOUND)
    
    raise ValidationError("event_id is required")


# Additional endpoints from plan

@api_view(['POST'])
@permission_classes([AllowAny])
def user_forgot_password_request_otp(request):
    """
    Request password reset OTP.
    POST /api/v1/users/forgot-password/request-otp/
    """
    mobile_number = request.data.get('mobile_number')
    if not mobile_number:
        raise ValidationError("mobile_number is required")
    
    try:
        customer = Customer.objects.get(mobile_number=mobile_number)
    except Customer.DoesNotExist:
        # Don't reveal if customer exists for security
        return Response({
            'message': 'If the mobile number exists, an OTP has been sent'
        }, status=status.HTTP_200_OK)
    
    otp, success = create_and_send_otp(mobile_number, 'forgot_password', app_name="TicketRunners")
    
    if not success:
        return Response({
            'error': {'code': 'OTP_SEND_FAILED', 'message': 'Failed to send OTP'}
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    return Response({
        'message': 'OTP sent to your mobile number',
        'mobile_number': mobile_number
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([AllowAny])
def user_reset_password(request):
    """
    Reset password with OTP.
    POST /api/v1/users/reset-password/
    """
    mobile_number = request.data.get('mobile_number')
    otp_code = request.data.get('otp_code')
    new_password = request.data.get('new_password')
    
    if not all([mobile_number, otp_code, new_password]):
        raise ValidationError("mobile_number, otp_code, and new_password are required")
    
    if not verify_otp(mobile_number, otp_code, 'forgot_password'):
        raise AuthenticationError("Invalid or expired OTP")
    
    try:
        customer = Customer.objects.get(mobile_number=mobile_number)
    except Customer.DoesNotExist:
        raise AuthenticationError("User not found")
    
    customer.set_password(new_password)
    customer.save()
    
    return Response({'message': 'Password reset successfully'}, status=status.HTTP_200_OK)


@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def user_profile_update(request):
    """
    Update user profile.
    PUT /api/v1/users/profile/
    """
    customer_id = request.user.id if hasattr(request.user, 'id') else None
    if not customer_id:
        return Response({
            'error': {'code': 'UNAUTHORIZED', 'message': 'Authentication required'}
        }, status=status.HTTP_401_UNAUTHORIZED)
    
    try:
        customer = Customer.objects.get(id=customer_id)
    except Customer.DoesNotExist:
        return Response({
            'error': {'code': 'NOT_FOUND', 'message': 'User not found'}
        }, status=status.HTTP_404_NOT_FOUND)
    
    serializer = UserProfileSerializer(customer, data=request.data, partial=True)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    raise ValidationError(serializer.errors)


@api_view(['GET'])
@permission_classes([AllowAny])
def public_events_featured(request):
    """
    Get featured events.
    GET /api/v1/public/events/featured/
    """
    # Featured events are those marked as featured or upcoming with high ticket sales
    events = Event.objects.filter(status__in=['upcoming', 'ongoing']).select_related('organizer', 'venue', 'category')
    
    # Order by date (upcoming first) and limit to 10
    events = events.order_by('date')[:10]
    
    serializer = PublicEventSerializer(events, many=True)
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([AllowAny])
def public_events_categories(request):
    """
    Get event categories list.
    GET /api/v1/public/events/categories/
    """
    from events.models import EventCategory
    
    categories = EventCategory.objects.all()
    data = [{'id': cat.id, 'name': cat.name, 'icon': cat.icon} for cat in categories]
    return Response(data, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([AllowAny])
def public_organizer_detail(request, organizer_id):
    """
    Get public organizer profile.
    GET /api/v1/public/organizers/:id/
    """
    from users.models import Organizer
    
    try:
        organizer = Organizer.objects.get(id=organizer_id, status='active', verified=True)
    except Organizer.DoesNotExist:
        return Response({
            'error': {'code': 'NOT_FOUND', 'message': 'Organizer not found'}
        }, status=status.HTTP_404_NOT_FOUND)
    
    events_count = Event.objects.filter(organizer=organizer, status__in=['upcoming', 'ongoing']).count()
    
    data = {
        'id': organizer.id,
        'name': organizer.name,
        'category': organizer.category,
        'location': organizer.location,
        'total_events': events_count,
        'rating': float(organizer.rating) if organizer.rating else None,
    }
    
    return Response(data, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([AllowAny])
def public_venues_list(request):
    """
    Get public venues list.
    GET /api/v1/public/venues/
    """
    from venues.models import Venue
    
    venues = Venue.objects.filter(status='active')
    
    city = request.query_params.get('city')
    if city:
        venues = venues.filter(city__icontains=city)
    
    data = [{
        'id': venue.id,
        'name': venue.name,
        'address': venue.address,
        'city': venue.city,
        'capacity': venue.capacity
    } for venue in venues]
    
    return Response(data, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_ticket_detail(request, ticket_id):
    """
    Get ticket details.
    GET /api/v1/users/tickets/:id/
    """
    customer_id = request.user.id if hasattr(request.user, 'id') else None
    if not customer_id:
        return Response({
            'error': {'code': 'UNAUTHORIZED', 'message': 'Authentication required'}
        }, status=status.HTTP_401_UNAUTHORIZED)
    
    try:
        ticket = Ticket.objects.select_related('event', 'customer').get(id=ticket_id, customer_id=customer_id)
    except Ticket.DoesNotExist:
        return Response({
            'error': {'code': 'NOT_FOUND', 'message': 'Ticket not found'}
        }, status=status.HTTP_404_NOT_FOUND)
    
    serializer = TicketSerializer(ticket)
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def user_ticket_transfer(request, ticket_id):
    """
    Transfer ticket to another user.
    POST /api/v1/users/tickets/:id/transfer/
    """
    customer_id = request.user.id if hasattr(request.user, 'id') else None
    if not customer_id:
        return Response({
            'error': {'code': 'UNAUTHORIZED', 'message': 'Authentication required'}
        }, status=status.HTTP_401_UNAUTHORIZED)
    
    try:
        ticket = Ticket.objects.get(id=ticket_id, customer_id=customer_id)
    except Ticket.DoesNotExist:
        return Response({
            'error': {'code': 'NOT_FOUND', 'message': 'Ticket not found'}
        }, status=status.HTTP_404_NOT_FOUND)
    
    if ticket.status != 'valid':
        return Response({
            'error': {'code': 'INVALID_TICKET', 'message': 'Ticket cannot be transferred'}
        }, status=status.HTTP_400_BAD_REQUEST)
    
    if not ticket.event.ticket_transfer_enabled:
        return Response({
            'error': {'code': 'TRANSFER_DISABLED', 'message': 'Ticket transfer is disabled for this event'}
        }, status=status.HTTP_400_BAD_REQUEST)
    
    recipient_mobile = request.data.get('recipient_mobile')
    if not recipient_mobile:
        raise ValidationError("recipient_mobile is required")
    
    try:
        recipient = Customer.objects.get(mobile_number=recipient_mobile, status='active')
    except Customer.DoesNotExist:
        return Response({
            'error': {'code': 'RECIPIENT_NOT_FOUND', 'message': 'Recipient not found'}
        }, status=status.HTTP_404_NOT_FOUND)
    
    ticket.customer = recipient
    ticket.save()
    
    return Response({
        'message': 'Ticket transferred successfully',
        'ticket': TicketSerializer(ticket).data
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def user_ticket_gift(request, ticket_id):
    """
    Gift ticket to another user.
    POST /api/v1/users/tickets/:id/gift/
    """
    customer_id = request.user.id if hasattr(request.user, 'id') else None
    if not customer_id:
        return Response({
            'error': {'code': 'UNAUTHORIZED', 'message': 'Authentication required'}
        }, status=status.HTTP_401_UNAUTHORIZED)
    
    try:
        ticket = Ticket.objects.get(id=ticket_id, customer_id=customer_id)
    except Ticket.DoesNotExist:
        return Response({
            'error': {'code': 'NOT_FOUND', 'message': 'Ticket not found'}
        }, status=status.HTTP_404_NOT_FOUND)
    
    if ticket.status != 'valid':
        return Response({
            'error': {'code': 'INVALID_TICKET', 'message': 'Ticket cannot be gifted'}
        }, status=status.HTTP_400_BAD_REQUEST)
    
    recipient_mobile = request.data.get('recipient_mobile')
    recipient_name = request.data.get('recipient_name')
    
    if not recipient_mobile:
        raise ValidationError("recipient_mobile is required")
    
    try:
        recipient = Customer.objects.get(mobile_number=recipient_mobile, status='active')
    except Customer.DoesNotExist:
        return Response({
            'error': {'code': 'RECIPIENT_NOT_FOUND', 'message': 'Recipient not found'}
        }, status=status.HTTP_404_NOT_FOUND)
    
    ticket.customer = recipient
    ticket.save()
    
    return Response({
        'message': 'Ticket gifted successfully',
        'ticket': TicketSerializer(ticket).data
    }, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_ticket_qr_code(request, ticket_id):
    """
    Generate QR code for ticket.
    GET /api/v1/users/tickets/:id/qr-code/
    """
    customer_id = request.user.id if hasattr(request.user, 'id') else None
    if not customer_id:
        return Response({
            'error': {'code': 'UNAUTHORIZED', 'message': 'Authentication required'}
        }, status=status.HTTP_401_UNAUTHORIZED)
    
    try:
        ticket = Ticket.objects.get(id=ticket_id, customer_id=customer_id)
    except Ticket.DoesNotExist:
        return Response({
            'error': {'code': 'NOT_FOUND', 'message': 'Ticket not found'}
        }, status=status.HTTP_404_NOT_FOUND)
    
    # Generate QR code data (QR code image generation will be added with library)
    qr_data = {
        'ticket_id': str(ticket.id),
        'ticket_number': ticket.ticket_number,
        'event_id': str(ticket.event.id),
        'customer_id': str(ticket.customer.id),
    }
    
    # TODO: Generate QR code image using qrcode library
    # For now, return data
    return Response({
        'message': 'QR code data (image generation pending)',
        'qr_data': qr_data,
        'ticket': TicketSerializer(ticket).data
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def payment_process(request):
    """
    Process payment for booking.
    POST /api/v1/payments/process/
    """
    customer_id = request.user.id if hasattr(request.user, 'id') else None
    if not customer_id:
        return Response({
            'error': {'code': 'UNAUTHORIZED', 'message': 'Authentication required'}
        }, status=status.HTTP_401_UNAUTHORIZED)
    
    amount = request.data.get('amount')
    payment_method = request.data.get('payment_method')
    event_id = request.data.get('event_id')
    
    if not all([amount, payment_method]):
        raise ValidationError("amount and payment_method are required")
    
    try:
        customer = Customer.objects.get(id=customer_id)
        event = Event.objects.get(id=event_id) if event_id else None
    except (Customer.DoesNotExist, Event.DoesNotExist):
        return Response({
            'error': {'code': 'NOT_FOUND', 'message': 'Customer or event not found'}
        }, status=status.HTTP_404_NOT_FOUND)
    
    transaction = PaymentTransaction.objects.create(
        customer=customer,
        event=event,
        amount=amount,
        payment_method=payment_method,
        status='pending',
        transaction_id=str(uuid.uuid4())
    )
    
    return Response({
        'transaction_id': transaction.transaction_id,
        'status': transaction.status,
        'amount': float(transaction.amount)
    }, status=status.HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def payment_confirm(request):
    """
    Confirm payment transaction.
    POST /api/v1/payments/confirm/
    """
    transaction_id = request.data.get('transaction_id')
    if not transaction_id:
        raise ValidationError("transaction_id is required")
    
    try:
        transaction = PaymentTransaction.objects.get(transaction_id=transaction_id)
    except PaymentTransaction.DoesNotExist:
        return Response({
            'error': {'code': 'NOT_FOUND', 'message': 'Transaction not found'}
        }, status=status.HTTP_404_NOT_FOUND)
    
    transaction.status = 'completed'
    transaction.save()
    
    return Response({
        'message': 'Payment confirmed',
        'transaction': PaymentTransactionSerializer(transaction).data
    }, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def payment_status(request, transaction_id):
    """
    Get payment status.
    GET /api/v1/payments/:id/status/
    """
    try:
        transaction = PaymentTransaction.objects.get(transaction_id=transaction_id)
    except PaymentTransaction.DoesNotExist:
        return Response({
            'error': {'code': 'NOT_FOUND', 'message': 'Transaction not found'}
        }, status=status.HTTP_404_NOT_FOUND)
    
    return Response({
        'transaction_id': transaction.transaction_id,
        'status': transaction.status,
        'amount': float(transaction.amount)
    }, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def invoice_download(request, transaction_id):
    """
    Generate/download invoice PDF.
    GET /api/v1/invoices/:id/
    """
    try:
        transaction = PaymentTransaction.objects.select_related('customer', 'event').get(transaction_id=transaction_id)
    except PaymentTransaction.DoesNotExist:
        return Response({
            'error': {'code': 'NOT_FOUND', 'message': 'Transaction not found'}
        }, status=status.HTTP_404_NOT_FOUND)
    
    # Generate invoice data (PDF generation will be added with library)
    invoice_data = {
        'transaction_id': transaction.transaction_id,
        'customer': transaction.customer.name if transaction.customer else None,
        'event': transaction.event.title if transaction.event else None,
        'amount': float(transaction.amount),
        'currency': transaction.currency,
        'status': transaction.status,
        'timestamp': transaction.timestamp,
    }
    
    # TODO: Generate PDF using reportlab or weasyprint
    return Response({
        'message': 'Invoice data (PDF generation pending)',
        'invoice': invoice_data
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def user_nfc_card_request(request):
    """
    Request a new NFC card.
    POST /api/v1/users/nfc-cards/request/
    """
    customer_id = request.user.id if hasattr(request.user, 'id') else None
    if not customer_id:
        return Response({
            'error': {'code': 'UNAUTHORIZED', 'message': 'Authentication required'}
        }, status=status.HTTP_401_UNAUTHORIZED)
    
    try:
        customer = Customer.objects.get(id=customer_id)
    except Customer.DoesNotExist:
        return Response({
            'error': {'code': 'NOT_FOUND', 'message': 'User not found'}
        }, status=status.HTTP_404_NOT_FOUND)
    
    # Check if customer already has an active card
    active_card = NFCCard.objects.filter(customer=customer, status='active').first()
    if active_card:
        return Response({
            'error': {'code': 'CARD_EXISTS', 'message': 'You already have an active NFC card'},
            'card': NFCCardSerializer(active_card).data
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Create card request (status will be pending until assigned by merchant/admin)
    card = NFCCard.objects.create(
        customer=customer,
        status='pending',
        serial_number=f"CARD-{uuid.uuid4().hex[:12].upper()}",
        issue_date=timezone.now().date(),
        expiry_date=timezone.now().date() + timedelta(days=365*2)  # 2 years
    )
    
    return Response({
        'message': 'NFC card request submitted',
        'card': NFCCardSerializer(card).data
    }, status=status.HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def user_nfc_card_reload(request, card_id):
    """
    Top-up NFC card balance.
    POST /api/v1/users/nfc-cards/:id/reload/
    """
    customer_id = request.user.id if hasattr(request.user, 'id') else None
    if not customer_id:
        return Response({
            'error': {'code': 'UNAUTHORIZED', 'message': 'Authentication required'}
        }, status=status.HTTP_401_UNAUTHORIZED)
    
    amount = request.data.get('amount')
    if not amount or float(amount) <= 0:
        raise ValidationError("Valid amount is required")
    
    try:
        card = NFCCard.objects.get(id=card_id, customer_id=customer_id)
    except NFCCard.DoesNotExist:
        return Response({
            'error': {'code': 'NOT_FOUND', 'message': 'Card not found'}
        }, status=status.HTTP_404_NOT_FOUND)
    
    if card.status != 'active':
        return Response({
            'error': {'code': 'CARD_INACTIVE', 'message': 'Card is not active'}
        }, status=status.HTTP_400_BAD_REQUEST)
    
    card.balance += float(amount)
    card.save()
    
    return Response({
        'message': 'Card balance reloaded successfully',
        'card': NFCCardSerializer(card).data
    }, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_nfc_card_transactions(request, card_id):
    """
    Get NFC card transaction history.
    GET /api/v1/users/nfc-cards/:id/transactions/
    """
    customer_id = request.user.id if hasattr(request.user, 'id') else None
    if not customer_id:
        return Response({
            'error': {'code': 'UNAUTHORIZED', 'message': 'Authentication required'}
        }, status=status.HTTP_401_UNAUTHORIZED)
    
    try:
        card = NFCCard.objects.get(id=card_id, customer_id=customer_id)
    except NFCCard.DoesNotExist:
        return Response({
            'error': {'code': 'NOT_FOUND', 'message': 'Card not found'}
        }, status=status.HTTP_404_NOT_FOUND)
    
    transactions = NFCCardTransaction.objects.filter(nfc_card=card).order_by('-timestamp')[:50]
    
    data = [{
        'id': t.id,
        'amount': float(t.amount),
        'transaction_type': t.transaction_type,
        'timestamp': t.timestamp,
        'description': t.description
    } for t in transactions]
    
    return Response(data, status=status.HTTP_200_OK)


@api_view(['POST', 'PUT'])
@permission_classes([IsAuthenticated])
def user_nfc_card_auto_reload_settings(request, card_id):
    """
    Setup or update auto-reload settings.
    POST/PUT /api/v1/users/nfc-cards/:id/auto-reload-settings/
    """
    customer_id = request.user.id if hasattr(request.user, 'id') else None
    if not customer_id:
        return Response({
            'error': {'code': 'UNAUTHORIZED', 'message': 'Authentication required'}
        }, status=status.HTTP_401_UNAUTHORIZED)
    
    try:
        card = NFCCard.objects.get(id=card_id, customer_id=customer_id)
    except NFCCard.DoesNotExist:
        return Response({
            'error': {'code': 'NOT_FOUND', 'message': 'Card not found'}
        }, status=status.HTTP_404_NOT_FOUND)
    
    threshold_amount = request.data.get('threshold_amount')
    reload_amount = request.data.get('reload_amount')
    enabled = request.data.get('enabled', False)
    
    auto_reload, created = NFCCardAutoReload.objects.get_or_create(nfc_card=card)
    
    if threshold_amount is not None:
        auto_reload.threshold_amount = float(threshold_amount)
    if reload_amount is not None:
        auto_reload.reload_amount = float(reload_amount)
    if enabled is not None:
        auto_reload.enabled = enabled
    
    auto_reload.save()
    
    return Response({
        'message': 'Auto-reload settings updated',
        'settings': {
            'threshold_amount': float(auto_reload.threshold_amount),
            'reload_amount': float(auto_reload.reload_amount),
            'enabled': auto_reload.enabled
        }
    }, status=status.HTTP_200_OK)


@api_view(['PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def user_dependent_detail(request, dependent_id):
    """
    Update or delete dependent.
    PUT /api/v1/users/dependents/:id/
    DELETE /api/v1/users/dependents/:id/
    """
    customer_id = request.user.id if hasattr(request.user, 'id') else None
    if not customer_id:
        return Response({
            'error': {'code': 'UNAUTHORIZED', 'message': 'Authentication required'}
        }, status=status.HTTP_401_UNAUTHORIZED)
    
    try:
        dependent = Dependent.objects.get(id=dependent_id, customer_id=customer_id)
    except Dependent.DoesNotExist:
        return Response({
            'error': {'code': 'NOT_FOUND', 'message': 'Dependent not found'}
        }, status=status.HTTP_404_NOT_FOUND)
    
    if request.method == 'DELETE':
        dependent.delete()
        return Response({'message': 'Dependent deleted'}, status=status.HTTP_200_OK)
    
    # PUT - Update
    serializer = DependentSerializer(dependent, data=request.data, partial=True)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    raise ValidationError(serializer.errors)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_analytics(request):
    """
    Get user analytics (booking history, attendance).
    GET /api/v1/users/analytics/
    """
    customer_id = request.user.id if hasattr(request.user, 'id') else None
    if not customer_id:
        return Response({
            'error': {'code': 'UNAUTHORIZED', 'message': 'Authentication required'}
        }, status=status.HTTP_401_UNAUTHORIZED)
    
    try:
        customer = Customer.objects.get(id=customer_id)
    except Customer.DoesNotExist:
        return Response({
            'error': {'code': 'NOT_FOUND', 'message': 'User not found'}
        }, status=status.HTTP_404_NOT_FOUND)
    
    tickets = Ticket.objects.filter(customer=customer)
    total_tickets = tickets.count()
    used_tickets = tickets.filter(status='used').count()
    valid_tickets = tickets.filter(status='valid').count()
    
    events_attended = tickets.filter(status='used').values('event').distinct().count()
    
    total_spent = PaymentTransaction.objects.filter(customer=customer, status='completed').aggregate(
        total=Sum('amount')
    )['total'] or 0
    
    data = {
        'total_bookings': total_tickets,
        'tickets_used': used_tickets,
        'tickets_valid': valid_tickets,
        'events_attended': events_attended,
        'total_spent': float(total_spent),
        'is_recurrent': customer.is_recurrent,
    }
    
    return Response(data, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([AllowAny])
def checkin_verify(request):
    """
    Verify ticket/QR code for check-in.
    POST /api/v1/checkin/verify/
    """
    ticket_id = request.data.get('ticket_id')
    qr_data = request.data.get('qr_data')
    
    if not ticket_id and not qr_data:
        raise ValidationError("ticket_id or qr_data is required")
    
    try:
        if ticket_id:
            ticket = Ticket.objects.select_related('event', 'customer').get(id=ticket_id)
        else:
            # Parse QR data to get ticket_id
            # For now, assume qr_data contains ticket_id
            ticket = Ticket.objects.select_related('event', 'customer').get(id=qr_data)
    except Ticket.DoesNotExist:
        return Response({
            'error': {'code': 'TICKET_NOT_FOUND', 'message': 'Ticket not found'}
        }, status=status.HTTP_404_NOT_FOUND)
    
    if ticket.status != 'valid':
        return Response({
            'error': {'code': 'INVALID_TICKET', 'message': f'Ticket status is {ticket.status}'}
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Mark ticket as used
    ticket.status = 'used'
    ticket.check_in_time = timezone.now()
    ticket.save()
    
    return Response({
        'message': 'Check-in successful',
        'ticket': TicketSerializer(ticket).data
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([AllowAny])
def checkin_nfc(request):
    """
    NFC card check-in.
    POST /api/v1/checkin/nfc/
    """
    card_serial = request.data.get('card_serial')
    event_id = request.data.get('event_id')
    
    if not card_serial:
        raise ValidationError("card_serial is required")
    
    try:
        card = NFCCard.objects.select_related('customer').get(serial_number=card_serial, status='active')
    except NFCCard.DoesNotExist:
        return Response({
            'error': {'code': 'CARD_NOT_FOUND', 'message': 'NFC card not found'}
        }, status=status.HTTP_404_NOT_FOUND)
    
    # Check if customer has valid ticket for event
    if event_id:
        ticket = Ticket.objects.filter(
            customer=card.customer,
            event_id=event_id,
            status='valid'
        ).first()
        
        if not ticket:
            return Response({
                'error': {'code': 'NO_TICKET', 'message': 'No valid ticket found for this event'}
            }, status=status.HTTP_400_BAD_REQUEST)
        
        ticket.status = 'used'
        ticket.check_in_time = timezone.now()
        ticket.save()
    
    card.last_used = timezone.now()
    card.usage_count += 1
    card.save()
    
    return Response({
        'message': 'NFC check-in successful',
        'card': NFCCardSerializer(card).data
    }, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_payment_history(request):
    """
    Get user's payment history.
    GET /api/v1/users/payment-history/
    """
    customer_id = request.user.id if hasattr(request.user, 'id') else None
    if not customer_id:
        return Response({
            'error': {'code': 'UNAUTHORIZED', 'message': 'Authentication required'}
        }, status=status.HTTP_401_UNAUTHORIZED)
    
    transactions = PaymentTransaction.objects.filter(customer_id=customer_id).order_by('-timestamp')
    
    serializer = PaymentTransactionSerializer(transactions, many=True)
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def user_refund_request(request, ticket_id):
    """
    Request a refund for a ticket.
    POST /api/v1/users/tickets/:id/refund-request/
    """
    customer_id = request.user.id if hasattr(request.user, 'id') else None
    if not customer_id:
        return Response({
            'error': {'code': 'UNAUTHORIZED', 'message': 'Authentication required'}
        }, status=status.HTTP_401_UNAUTHORIZED)
    
    try:
        ticket = Ticket.objects.get(id=ticket_id, customer_id=customer_id)
    except Ticket.DoesNotExist:
        return Response({
            'error': {'code': 'NOT_FOUND', 'message': 'Ticket not found'}
        }, status=status.HTTP_404_NOT_FOUND)
    
    if ticket.status != 'valid':
        return Response({
            'error': {'code': 'INVALID_TICKET', 'message': 'Only valid tickets can be refunded'}
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Mark ticket as refunded
    ticket.status = 'refunded'
    ticket.save()
    
    # Create refund transaction
    refund_transaction = PaymentTransaction.objects.create(
        customer=ticket.customer,
        event=ticket.event,
        ticket=ticket,
        amount=-ticket.price,  # Negative amount for refund
        payment_method='refund',
        status='completed',
        transaction_id=f"REFUND-{uuid.uuid4().hex[:12].upper()}"
    )
    
    return Response({
        'message': 'Refund request submitted',
        'refund_transaction': PaymentTransactionSerializer(refund_transaction).data
    }, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_event_checkin_status(request, event_id):
    """
    Get user's check-in status for an event.
    GET /api/v1/users/events/:id/checkin-status/
    """
    customer_id = request.user.id if hasattr(request.user, 'id') else None
    if not customer_id:
        return Response({
            'error': {'code': 'UNAUTHORIZED', 'message': 'Authentication required'}
        }, status=status.HTTP_401_UNAUTHORIZED)
    
    tickets = Ticket.objects.filter(customer_id=customer_id, event_id=event_id)
    
    data = {
        'event_id': str(event_id),
        'total_tickets': tickets.count(),
        'checked_in': tickets.filter(status='used').count(),
        'pending': tickets.filter(status='valid').count(),
        'tickets': TicketSerializer(tickets, many=True).data
    }
    
    return Response(data, status=status.HTTP_200_OK)
