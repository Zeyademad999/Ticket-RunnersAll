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
from decimal import Decimal
import uuid

from customers.models import Customer, Dependent
from .authentication import CustomerJWTAuthentication
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
        raise ValidationError(
            detail='Invalid input data.',
            details=serializer.errors
        )
    
    mobile_number = serializer.validated_data['mobile_number']
    name = serializer.validated_data.get('name', '')
    email = serializer.validated_data.get('email', '')
    
    # Check if user already exists
    if Customer.objects.filter(mobile_number=mobile_number).exists():
        raise ValidationError("User with this mobile number already exists")
    
    # Create and send OTP
    otp, success = create_and_send_otp(mobile_number, 'registration', app_name="TicketRunners")
    
    if not success:
        return Response({
            'error': {'code': 'OTP_SEND_FAILED', 'message': 'Failed to send OTP'}
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    # Store registration data temporarily in cache (valid for 10 minutes)
    from django.core.cache import cache
    cache_key = f"registration_{mobile_number}"
    cache.set(cache_key, {
        'name': name,
        'email': email,
        'mobile_number': mobile_number,
    }, timeout=600)  # 10 minutes
    
    # Return mobile_number as signup_id for frontend compatibility
    return Response({
        'message': 'OTP sent to your mobile number',
        'mobile_number': mobile_number,
        'signup_id': mobile_number  # Use mobile_number as signup_id for frontend compatibility
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([AllowAny])
def user_verify_otp(request):
    """
    Verify OTP - Step 2: Verify mobile OTP (doesn't complete registration yet).
    POST /api/v1/users/verify-otp/
    """
    serializer = UserOTPSerializer(data=request.data)
    if not serializer.is_valid():
        raise ValidationError(
            detail='Invalid input data.',
            details=serializer.errors
        )
    
    mobile_number = serializer.validated_data['mobile_number']
    otp_code = serializer.validated_data['otp_code']
    
    if not verify_otp(mobile_number, otp_code, 'registration'):
        raise ValidationError("Invalid or expired OTP")
    
    # Get registration data from cache
    from django.core.cache import cache
    cache_key = f"registration_{mobile_number}"
    registration_data = cache.get(cache_key)
    
    if not registration_data:
        import logging
        logger = logging.getLogger(__name__)
        logger.warning(f"No registration data found in cache for mobile_number: {mobile_number} (cache_key: {cache_key})")
        raise ValidationError("Registration session expired. Please start again.")
    
    # Mark mobile as verified in cache
    registration_data['mobile_verified'] = True
    
    # Store optional info if provided
    if request.data.get('emergency_contact_name'):
        registration_data['emergency_contact_name'] = request.data.get('emergency_contact_name')
    if request.data.get('emergency_contact_mobile'):
        registration_data['emergency_contact_mobile'] = request.data.get('emergency_contact_mobile')
    if request.data.get('blood_type'):
        registration_data['blood_type'] = request.data.get('blood_type')
    
    cache.set(cache_key, registration_data, timeout=600)  # Reset timeout to 10 minutes
    
    return Response({
        'mobile_verified': True,
        'message': 'Mobile number verified successfully'
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([AllowAny])
def user_send_email_otp(request):
    """
    Send email OTP for signup verification.
    POST /api/v1/users/send-email-otp/
    """
    try:
        # Handle both dict and string request.data
        if isinstance(request.data, str):
            import json
            try:
                data = json.loads(request.data)
            except json.JSONDecodeError:
                data = {}
        else:
            data = request.data
        
        mobile_number = data.get('mobile_number') if isinstance(data, dict) else None
        email = data.get('email') if isinstance(data, dict) else None
        
        if not mobile_number or not email:
            raise ValidationError("mobile_number and email are required")
        
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"Sending email OTP for mobile_number: {mobile_number}, email: {email}")
    
        # Get registration data from cache
        from django.core.cache import cache
        cache_key = f"registration_{mobile_number}"
        registration_data = cache.get(cache_key)
        
        if not registration_data:
            logger.warning(f"No registration data found in cache for mobile_number: {mobile_number}")
            # Try to find any registration data for debugging
            logger.warning(f"Cache key used: {cache_key}")
            raise ValidationError("Registration session expired. Please start again.")
        
        logger.info(f"Found registration data: mobile_verified={registration_data.get('mobile_verified')}, email={registration_data.get('email')}")
        
        if not registration_data.get('mobile_verified'):
            raise ValidationError("Mobile number must be verified first")
        
        # Verify email matches
        if registration_data.get('email') != email:
            logger.warning(f"Email mismatch: cache has '{registration_data.get('email')}', received '{email}'")
            raise ValidationError("Email does not match registration data")
        
        # Create and send email OTP
        otp, success = create_and_send_otp(email, 'email_verification', app_name="TicketRunners")
        
        if not success:
            logger.error(f"Failed to send email OTP to {email}")
            return Response({
                'error': {'code': 'EMAIL_OTP_SEND_FAILED', 'message': 'Failed to send email OTP'}
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        # Mark email OTP as sent in cache
        registration_data['email_otp_sent'] = True
        cache.set(cache_key, registration_data, timeout=600)
        
        logger.info(f"Email OTP sent successfully to {email}")
        return Response({
            'email_otp_sent': True,
            'message': 'OTP sent to your email address'
        }, status=status.HTTP_200_OK)
    except ValidationError:
        raise
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Error sending email OTP: {str(e)}", exc_info=True)
        return Response({
            'error': {'code': 'EMAIL_OTP_SEND_FAILED', 'message': 'Failed to send email OTP. Please try again.'}
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([AllowAny])
def user_verify_email_otp(request):
    """
    Verify email OTP for signup verification.
    POST /api/v1/users/verify-email-otp/
    """
    mobile_number = request.data.get('mobile_number')
    email = request.data.get('email')
    otp_code = request.data.get('otp_code')
    
    if not mobile_number or not email or not otp_code:
        raise ValidationError("mobile_number, email, and otp_code are required")
    
    # Verify email OTP (using email as phone_number for OTP lookup)
    if not verify_otp(email, otp_code, 'email_verification'):
        raise ValidationError("Invalid or expired email OTP")
    
    # Get registration data from cache
    from django.core.cache import cache
    cache_key = f"registration_{mobile_number}"
    registration_data = cache.get(cache_key)
    
    if not registration_data:
        raise ValidationError("Registration session expired. Please start again.")
    
    # Mark email as verified in cache
    registration_data['email_verified'] = True
    cache.set(cache_key, registration_data, timeout=600)
    
    return Response({
        'email_verified': True,
        'message': 'Email verified successfully'
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([AllowAny])
def user_complete_registration(request):
    """
    Complete registration - Step 3: Set password and create account.
    POST /api/v1/users/complete-registration/
    """
    mobile_number = request.data.get('mobile_number')
    password = request.data.get('password')
    
    if not mobile_number or not password:
        raise ValidationError("mobile_number and password are required")
    
    # Get registration data from cache
    from django.core.cache import cache
    cache_key = f"registration_{mobile_number}"
    registration_data = cache.get(cache_key)
    
    if not registration_data:
        raise ValidationError("Registration session expired. Please start again.")
    
    if not registration_data.get('mobile_verified'):
        raise ValidationError("Mobile number must be verified first")
    
    # Check if user already exists (double check)
    if Customer.objects.filter(mobile_number=mobile_number).exists():
        # Clear cache
        cache.delete(cache_key)
        raise ValidationError("User with this mobile number already exists")
    
    # Get optional info from request if provided
    emergency_contact_name = request.data.get('emergency_contact_name') or registration_data.get('emergency_contact_name')
    emergency_contact_mobile = request.data.get('emergency_contact_mobile') or registration_data.get('emergency_contact_mobile')
    blood_type = request.data.get('blood_type') or registration_data.get('blood_type')
    
    # Create customer
    customer = Customer.objects.create(
        name=registration_data['name'],
        email=registration_data['email'],
        mobile_number=mobile_number,
        phone=mobile_number,
        status='active',
        emergency_contact_name=emergency_contact_name,
        emergency_contact_mobile=emergency_contact_mobile,
        blood_type=blood_type
    )
    customer.set_password(password)
    customer.save()
    
    # Link any tickets assigned to this mobile number
    from tickets.models import Ticket
    assigned_tickets = Ticket.objects.filter(
        assigned_mobile=mobile_number,
        status='valid'
    ).exclude(customer=customer)
    
    if assigned_tickets.exists():
        # Update customer but keep buyer as original purchaser
        # NEVER overwrite buyer field - it should always be the original purchaser
        # Only set buyer if it's null (for tickets created before buyer field was added)
        for ticket in assigned_tickets:
            # Store the original buyer before updating customer
            original_buyer = ticket.buyer if ticket.buyer else ticket.customer
            ticket.customer = customer
            # Only set buyer if it's null, otherwise preserve it
            if not ticket.buyer:
                ticket.buyer = original_buyer
            # Clear assigned fields since ticket is now owned by customer, not just assigned
            ticket.assigned_name = None
            ticket.assigned_mobile = None
            ticket.assigned_email = None
            ticket.save(update_fields=['customer', 'buyer', 'assigned_name', 'assigned_mobile', 'assigned_email'])
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"Linked {assigned_tickets.count()} tickets to new customer {customer.id}")
    
    # Clear cache
    cache.delete(cache_key)
    
    # Generate JWT tokens
    refresh = RefreshToken()
    refresh['customer_id'] = str(customer.id)
    refresh['mobile'] = mobile_number
    
    return Response({
        'access': str(refresh.access_token),
        'refresh': str(refresh),
        'user': UserProfileSerializer(customer).data,
        'message': 'Registration completed successfully'
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
        raise ValidationError(
            detail='Invalid input data.',
            details=serializer.errors
        )
    
    mobile_number = serializer.validated_data['mobile_number']
    password = serializer.validated_data['password']
    
    try:
        customer = Customer.objects.get(mobile_number=mobile_number)
    except Customer.DoesNotExist:
        raise AuthenticationError(
            detail="Invalid mobile number or password",
            code="INVALID_CREDENTIALS"
        )
    
    if not customer.check_password(password):
        raise AuthenticationError(
            detail="Invalid mobile number or password",
            code="INVALID_CREDENTIALS"
        )
    
    if customer.status != 'active':
        raise AuthenticationError(
            detail="Your account is not active. Please contact support.",
            code="ACCOUNT_INACTIVE"
        )
    
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
        raise ValidationError(
            detail='Invalid input data.',
            details=serializer.errors
        )
    
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
    
    # Link any tickets assigned to this mobile number that aren't already linked
    from tickets.models import Ticket
    assigned_tickets = Ticket.objects.filter(
        assigned_mobile=mobile_number,
        status='valid'
    ).exclude(customer=customer)
    
    if assigned_tickets.exists():
        # Update customer but keep buyer as original purchaser
        # NEVER overwrite buyer field - it should always be the original purchaser
        # Only set buyer if it's null (for tickets created before buyer field was added)
        for ticket in assigned_tickets:
            # Store the original buyer before updating customer
            original_buyer = ticket.buyer if ticket.buyer else ticket.customer
            ticket.customer = customer
            # Only set buyer if it's null, otherwise preserve it
            if not ticket.buyer:
                ticket.buyer = original_buyer
            # Clear assigned fields since ticket is now owned by customer, not just assigned
            ticket.assigned_name = None
            ticket.assigned_mobile = None
            ticket.assigned_email = None
            ticket.save(update_fields=['customer', 'buyer', 'assigned_name', 'assigned_mobile', 'assigned_email'])
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"Linked {assigned_tickets.count()} tickets to customer {customer.id} on login")
    
    refresh = RefreshToken()
    refresh['customer_id'] = str(customer.id)
    refresh['mobile'] = mobile_number
    
    return Response({
        'access': str(refresh.access_token),
        'refresh': str(refresh),
        'user': UserProfileSerializer(customer).data
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([AllowAny])
def user_refresh_token(request):
    """
    Refresh access token for customer users.
    POST /api/v1/users/refresh-token/
    """
    try:
        refresh_token_str = request.data.get('refresh')
        if not refresh_token_str:
            raise ValidationError("refresh token is required")
        
        # Parse and validate the refresh token
        try:
            refresh_token = RefreshToken(refresh_token_str)
        except Exception as e:
            raise AuthenticationError("Invalid refresh token")
        
        # Get customer_id from token
        customer_id = refresh_token.get('customer_id')
        if not customer_id:
            raise AuthenticationError("Token does not contain customer_id")
        
        # Verify customer exists
        try:
            customer = Customer.objects.get(id=customer_id)
        except Customer.DoesNotExist:
            raise AuthenticationError("Customer not found")
        
        # Create new access token with same claims
        new_refresh = RefreshToken()
        new_refresh['customer_id'] = str(customer.id)
        new_refresh['mobile'] = refresh_token.get('mobile', '')
        
        return Response({
            'access': str(new_refresh.access_token),
            'refresh': str(new_refresh),  # Return new refresh token if rotation is enabled
        }, status=status.HTTP_200_OK)
    except (ValidationError, AuthenticationError):
        raise
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Error refreshing token: {str(e)}", exc_info=True)
        return Response({
            'error': {'code': 'TOKEN_REFRESH_FAILED', 'message': 'Failed to refresh token'}
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_me(request):
    """
    Get current user profile.
    GET /api/v1/users/me/
    """
    # Get customer from request (set by CustomerJWTAuthentication)
    customer = getattr(request, 'customer', None)
    if not customer:
        # Fallback: try to get from user.id (for compatibility)
        customer_id = request.user.id if hasattr(request.user, 'id') else None
        if customer_id:
            try:
                customer = Customer.objects.get(id=customer_id)
            except Customer.DoesNotExist:
                pass
    
    if not customer:
        return Response({
            'error': {'code': 'UNAUTHORIZED', 'message': 'Authentication required'}
        }, status=status.HTTP_401_UNAUTHORIZED)
    
    serializer = UserProfileSerializer(customer)
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_card_details(request):
    """
    Get current user's NFC card details.
    GET /api/v1/users/me/card-details/
    """
    # Get customer from request (set by CustomerJWTAuthentication)
    customer = getattr(request, 'customer', None)
    if not customer:
        # Fallback: try to get from user.id (for compatibility)
        customer_id = request.user.id if hasattr(request.user, 'id') else None
        if customer_id:
            try:
                customer = Customer.objects.get(id=customer_id)
            except Customer.DoesNotExist:
                pass
    
    if not customer:
        return Response({
            'error': {'code': 'UNAUTHORIZED', 'message': 'Authentication required'}
        }, status=status.HTTP_401_UNAUTHORIZED)
    
    
    # Get the user's active NFC card (if any)
    from nfc_cards.models import NFCCard
    nfc_card = NFCCard.objects.filter(customer=customer, status='active').first()
    
    # Extract customer first name
    customer_first_name = customer.name.split()[0] if customer.name else ""
    
    if nfc_card:
        # Ensure dates are always returned as strings (ISO format) or empty string if None
        card_data = {
            'card_number': nfc_card.serial_number,
            'card_status': nfc_card.status,
            'card_issue_date': nfc_card.issue_date.isoformat() if nfc_card.issue_date else "",
            'card_expiry_date': nfc_card.expiry_date.isoformat() if nfc_card.expiry_date else "",
        }
        wallet_data = {
            'wallet_status': 'active' if nfc_card.status == 'active' else 'inactive',
            'wallet_expiry_date': nfc_card.expiry_date.isoformat() if nfc_card.expiry_date else "",
        }
    else:
        card_data = None
        wallet_data = {
            'wallet_status': 'inactive',
            'wallet_expiry_date': "",
        }
    
    # Return response matching frontend interface
    return Response({
        'customer_first_name': customer_first_name,
        'nfc_card': card_data,
        'wallet': wallet_data
    }, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([AllowAny])
def public_events_list(request):
    """
    Public event listing (no auth required).
    GET /api/v1/public/events/
    Fetches all events from the same Event model used by admin dashboard.
    """
    # Show all events except cancelled ones (same as admin dashboard)
    events = Event.objects.exclude(status='cancelled').select_related('organizer', 'venue', 'category').prefetch_related('ticket_categories').order_by('-date', '-time')
    
    # Filtering
    category = request.query_params.get('category')
    location = request.query_params.get('location')
    date_from = request.query_params.get('date_from')
    date_to = request.query_params.get('date_to')
    search = request.query_params.get('search')
    
    if category:
        events = events.filter(category__name=category)
    if location:
        # Filter by venue address or city since Event doesn't have location field
        events = events.filter(
            Q(venue__address__icontains=location) | 
            Q(venue__city__icontains=location)
        )
    if date_from:
        events = events.filter(date__gte=date_from)
    if date_to:
        events = events.filter(date__lte=date_to)
    if search:
        events = events.filter(Q(title__icontains=search) | Q(description__icontains=search))
    
    serializer = PublicEventSerializer(events, many=True, context={'request': request})
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([AllowAny])
def public_event_detail(request, event_id):
    """
    Public event details.
    GET /api/v1/public/events/:id/
    """
    try:
        event = Event.objects.select_related('organizer', 'venue', 'category').prefetch_related('ticket_categories').get(id=event_id)
    except Event.DoesNotExist:
        return Response({
            'error': {'code': 'NOT_FOUND', 'message': 'Event not found'}
        }, status=status.HTTP_404_NOT_FOUND)
    
    serializer = PublicEventSerializer(event, context={'request': request})
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
        raise ValidationError(
            detail='Invalid input data.',
            details=serializer.errors
        )
    
    # Get customer from request (set by CustomerJWTAuthentication)
    customer = getattr(request, 'customer', None)
    if not customer:
        # Fallback: try to get from user.id (for compatibility)
        customer_id = request.user.id if hasattr(request.user, 'id') else None
        if customer_id:
            try:
                customer = Customer.objects.get(id=customer_id)
            except Customer.DoesNotExist:
                pass
    
    if not customer:
        return Response({
            'error': {'code': 'UNAUTHORIZED', 'message': 'Authentication required'}
        }, status=status.HTTP_401_UNAUTHORIZED)
    
    try:
        event = Event.objects.get(id=serializer.validated_data['event_id'])
    except Event.DoesNotExist:
        return Response({
            'error': {'code': 'NOT_FOUND', 'message': 'Event not found'}
        }, status=status.HTTP_404_NOT_FOUND)
    
    category = serializer.validated_data['category']
    quantity = serializer.validated_data['quantity']
    payment_method = serializer.validated_data['payment_method']
    
    try:
        # Get ticket category from event's ticket categories
        from events.models import TicketCategory
        try:
            ticket_category = TicketCategory.objects.get(event=event, name=category)
            price_per_ticket = Decimal(str(ticket_category.price))
            
            # Check availability for this specific category
            available_tickets = ticket_category.tickets_available
            if available_tickets < quantity:
                return Response({
                    'error': {'code': 'INSUFFICIENT_TICKETS', 'message': f'Not enough {category} tickets available. Only {available_tickets} tickets remaining.'}
                }, status=status.HTTP_400_BAD_REQUEST)
        except TicketCategory.DoesNotExist:
            # Fallback: use event's starting_price if ticket category doesn't exist
            if event.starting_price:
                price_per_ticket = Decimal(str(event.starting_price))
            else:
                price_per_ticket = Decimal('300.00')  # Default price when no categories configured
            
            # Check overall ticket availability
            available_tickets = event.tickets_available
            if available_tickets < quantity:
                return Response({
                    'error': {'code': 'INSUFFICIENT_TICKETS', 'message': f'Not enough tickets available. Only {available_tickets} tickets remaining.'}
                }, status=status.HTTP_400_BAD_REQUEST)
        
        # Check per-customer ticket limit
        if quantity > event.ticket_limit:
            return Response({
                'error': {'code': 'TICKET_LIMIT_EXCEEDED', 'message': f'Maximum {event.ticket_limit} tickets per booking allowed.'}
            }, status=status.HTTP_400_BAD_REQUEST)
        
        total_amount = price_per_ticket * Decimal(str(quantity))
        
        # Create payment transaction
        transaction = PaymentTransaction.objects.create(
            customer=customer,
            amount=total_amount,
            payment_method=payment_method,
            status='pending',
            transaction_id=str(uuid.uuid4())
        )
        
        # Create tickets with assignment details
        tickets = []
        ticket_details = serializer.validated_data.get('ticket_details', [])
        
        for i in range(quantity):
            # Start with default category and price from booking
            ticket_category = category
            ticket_price = price_per_ticket
            
            # If ticket details provided and this ticket has details, use specific category/price for this ticket
            if ticket_details and i < len(ticket_details):
                detail = ticket_details[i]
                
                # Use ticket-specific category if provided
                if detail.get('category'):
                    ticket_category = detail.get('category')
                    # Get price for this specific category
                    try:
                        from events.models import TicketCategory
                        specific_category = TicketCategory.objects.get(event=event, name=ticket_category)
                        ticket_price = Decimal(str(specific_category.price))
                    except TicketCategory.DoesNotExist:
                        # Fallback to default price if category not found
                        if event.starting_price:
                            ticket_price = Decimal(str(event.starting_price))
                        else:
                            ticket_price = Decimal('300.00')
                # Use ticket-specific price if provided (overrides category price)
                elif detail.get('price') is not None:
                    ticket_price = Decimal(str(detail.get('price')))
            
            ticket_data = {
                'event': event,
                'buyer': customer,  # Original buyer (who paid)
                'category': ticket_category,  # Use ticket-specific category
                'price': ticket_price,  # Use ticket-specific price
                'status': 'valid',
                'ticket_number': f"{event.id}-{customer.id}-{uuid.uuid4().hex[:8]}"
            }
            
            # If ticket details provided and this ticket has details
            if ticket_details and i < len(ticket_details):
                detail = ticket_details[i]
                # Only assign if it's not the owner's ticket
                if not detail.get('is_owner', False):
                    ticket_data['assigned_name'] = detail.get('name', '').strip() or None
                    ticket_data['assigned_mobile'] = detail.get('mobile', '').strip() or None
                    ticket_data['assigned_email'] = detail.get('email', '').strip() or None
                    
                    # If ticket is assigned to someone else, try to link it to their account if they exist
                    if ticket_data['assigned_mobile']:
                        try:
                            assigned_customer = Customer.objects.filter(mobile_number=ticket_data['assigned_mobile']).first()
                            if assigned_customer:
                                # Link ticket to assigned customer, but keep buyer as original purchaser
                                ticket_data['customer'] = assigned_customer
                            else:
                                # Keep ticket with buyer until assigned person registers
                                ticket_data['customer'] = customer
                        except Exception as e:
                            import logging
                            logger = logging.getLogger(__name__)
                            logger.warning(f"Could not link ticket to assigned customer: {e}")
                            ticket_data['customer'] = customer
                else:
                    # Owner's ticket - customer is the buyer
                    ticket_data['customer'] = customer
            else:
                # No details provided - assume owner's ticket
                ticket_data['customer'] = customer
            
            ticket = Ticket.objects.create(**ticket_data)
            tickets.append(ticket)
        
        # Update transaction status
        transaction.status = 'completed'
        transaction.save()
        
        # Update customer stats
        customer.total_bookings += quantity
        customer.total_spent += total_amount
        customer.save(update_fields=['total_bookings', 'total_spent'])
        
        return Response({
            'message': 'Tickets booked successfully',
            'transaction_id': transaction.transaction_id,
            'tickets': TicketSerializer(tickets, many=True).data
        }, status=status.HTTP_201_CREATED)
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Error booking tickets: {str(e)}", exc_info=True)
        return Response({
            'error': {'code': 'BOOKING_ERROR', 'message': f'Failed to book tickets: {str(e)}'}
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_tickets_list(request):
    """
    Get user's tickets.
    GET /api/v1/users/tickets/
    """
    # Get customer from request (set by CustomerJWTAuthentication)
    customer = getattr(request, 'customer', None)
    if not customer:
        # Fallback: try to get from user.id (for compatibility)
        customer_id = request.user.id if hasattr(request.user, 'id') else None
        if customer_id:
            try:
                customer = Customer.objects.get(id=customer_id)
            except Customer.DoesNotExist:
                pass
    
    if not customer:
        return Response({
            'error': {'code': 'UNAUTHORIZED', 'message': 'Authentication required'}
        }, status=status.HTTP_401_UNAUTHORIZED)
    
    # Get tickets where:
    # 1. Customer owns the ticket (customer = customer), OR
    # 2. Ticket is assigned to this customer (assigned_mobile matches), OR
    # 3. Customer bought ticket for someone else (buyer = customer AND assigned_mobile is set)
    # BUT exclude tickets that were transferred away (buyer = customer BUT customer != customer AND assigned_mobile is NULL)
    tickets = Ticket.objects.filter(
        Q(customer=customer) | 
        Q(assigned_mobile=customer.mobile_number) |
        (Q(buyer=customer) & Q(assigned_mobile__isnull=False))
    ).exclude(
        # Exclude transferred tickets: buyer is customer but customer is not customer and assigned_mobile is null
        Q(buyer=customer) & ~Q(customer=customer) & Q(assigned_mobile__isnull=True)
    ).select_related('event', 'buyer').order_by('-purchase_date')
    serializer = TicketSerializer(tickets, many=True, context={'request': request})
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_me_bookings(request):
    """
    Get user's bookings in paginated format.
    GET /api/v1/me/bookings/
    """
    # Get customer from request (set by CustomerJWTAuthentication)
    customer = getattr(request, 'customer', None)
    if not customer:
        # Fallback: try to get from user.id (for compatibility)
        customer_id = request.user.id if hasattr(request.user, 'id') else None
        if customer_id:
            try:
                customer = Customer.objects.get(id=customer_id)
            except Customer.DoesNotExist:
                pass
    
    if not customer:
        return Response({
            'error': {'code': 'UNAUTHORIZED', 'message': 'Authentication required'}
        }, status=status.HTTP_401_UNAUTHORIZED)
    
    # Get pagination parameters
    page = int(request.query_params.get('page', 1))
    limit = int(request.query_params.get('limit', 10))
    offset = (page - 1) * limit
    
    # Get tickets grouped by event and purchase_date (same event + same day = same booking)
    # Include tickets where:
    # 1. Customer owns the ticket, OR
    # 2. Ticket is assigned to this customer, OR
    # 3. Customer bought ticket for someone else (assigned tickets)
    # BUT exclude tickets that were transferred away
    tickets = Ticket.objects.filter(
        Q(customer=customer) | 
        Q(assigned_mobile=customer.mobile_number) |
        (Q(buyer=customer) & Q(assigned_mobile__isnull=False))
    ).exclude(
        # Exclude transferred tickets: buyer is customer but customer is not customer and assigned_mobile is null
        Q(buyer=customer) & ~Q(customer=customer) & Q(assigned_mobile__isnull=True)
    ).select_related('event', 'event__venue').order_by('-purchase_date')
    
    # Group tickets by event_id and purchase_date (day level) to create bookings
    bookings_dict = {}
    for ticket in tickets:
        if not ticket.event:
            continue
        
        # Group by event_id and purchase date (day level) - tickets bought on same day for same event are one booking
        purchase_date_str = ticket.purchase_date.strftime('%Y-%m-%d')
        order_key = f"{ticket.event.id}_{purchase_date_str}"
        
        if order_key not in bookings_dict:
            bookings_dict[order_key] = {
                'tickets': [],
                'purchase_date': ticket.purchase_date,
                'event': ticket.event,
            }
        bookings_dict[order_key]['tickets'].append(ticket)
    
    # Convert to list and sort by purchase_date
    bookings_list = list(bookings_dict.values())
    bookings_list.sort(key=lambda x: x['purchase_date'], reverse=True)
    
    # Apply pagination
    total_count = len(bookings_list)
    paginated_bookings = bookings_list[offset:offset + limit]
    
    # Transform to CustomerBookingItem format
    items = []
    for booking in paginated_bookings:
        tickets_list = booking['tickets']
        if not tickets_list:
            continue
        
        # Use first ticket's event info
        first_ticket = tickets_list[0]
        event = first_ticket.event
        
        # Calculate totals
        total_amount = sum(float(t.price) for t in tickets_list)
        quantity = len(tickets_list)
        unit_price = float(first_ticket.price) if tickets_list else 0
        
        # Get ticket category (use first ticket's category)
        ticket_category = first_ticket.category
        
        # Determine booking_status based on ticket statuses
        ticket_statuses = [t.status for t in tickets_list]
        if 'refunded' in ticket_statuses:
            booking_status = 'refunded'
        elif all(s == 'used' for s in ticket_statuses):
            booking_status = 'confirmed'  # All used = confirmed
        elif all(s in ['valid', 'used'] for s in ticket_statuses):
            booking_status = 'confirmed'
        else:
            booking_status = 'confirmed'
        
        # Get check-in time (use first ticket's check-in time if available)
        check_in_time = None
        for t in tickets_list:
            if t.check_in_time:
                check_in_time = t.check_in_time.isoformat()
                break
        
        items.append({
            'id': str(first_ticket.id),
            'event_id': str(event.id) if event else '',
            'event_title': event.title if event else '',
            'event_date': str(event.date) if event else '',
            'event_time': str(event.time) if event else '',
            'event_location': event.venue.address if event and event.venue else '',
            'order_id': order_key,
            'ticket_category': ticket_category,
            'quantity': quantity,
            'unit_price': unit_price,
            'total_amount': total_amount,
            'purchase_date': first_ticket.purchase_date.isoformat(),
            'status': booking_status,
            'qr_enabled': True,  # All tickets have QR codes
            'check_in_time': check_in_time,
            'dependents': [],  # TODO: Add dependents if needed
        })
    
    return Response({
        'items': items,
        'page': str(page),
        'limit': str(limit),
        'count': str(total_count),
    }, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_nfc_cards_list(request):
    """
    Get user's NFC cards.
    GET /api/v1/users/nfc-cards/
    """
    # Get customer from request (set by CustomerJWTAuthentication)
    customer = getattr(request, 'customer', None)
    if not customer:
        # Fallback: try to get from user.id (for compatibility)
        customer_id = request.user.id if hasattr(request.user, 'id') else None
        if customer_id:
            try:
                customer = Customer.objects.get(id=customer_id)
            except Customer.DoesNotExist:
                pass
    
    if not customer:
        return Response({
            'error': {'code': 'UNAUTHORIZED', 'message': 'Authentication required'}
        }, status=status.HTTP_401_UNAUTHORIZED)
    
    cards = NFCCard.objects.filter(customer=customer)
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
    
    raise ValidationError(
        detail='Invalid input data.',
        details=serializer.errors
    )


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
    try:
        # Handle both dict and string request.data
        if isinstance(request.data, str):
            import json
            try:
                data = json.loads(request.data)
            except json.JSONDecodeError:
                data = {}
        else:
            data = request.data
        
        mobile_number = data.get('mobile_number') if isinstance(data, dict) else None
        if not mobile_number:
            raise ValidationError("mobile_number is required")
        
        import logging
        logger = logging.getLogger(__name__)
        
        # Check if customer exists
        customer_exists = Customer.objects.filter(mobile_number=mobile_number).exists()
        
        # Always send OTP (for security - don't reveal if user exists)
        try:
            logger.info(f"Attempting to send OTP to {mobile_number} for forgot_password (customer exists: {customer_exists})")
            
            otp, success = create_and_send_otp(mobile_number, 'forgot_password', app_name="TicketRunners")
            
            logger.info(f"OTP created: {otp.code}, SMS success: {success}")
            
            if not success:
                logger.warning(f"OTP created but SMS failed for {mobile_number}")
                return Response({
                    'error': {'code': 'OTP_SEND_FAILED', 'message': 'Failed to send OTP. Please try again later.'}
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
            logger.info(f"OTP successfully sent to {mobile_number}")
            # Always return the same message for security (don't reveal if user exists)
            return Response({
                'message': 'If the mobile number exists, an OTP has been sent'
            }, status=status.HTTP_200_OK)
        except Exception as e:
            # Log the error for debugging
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Error sending OTP for {mobile_number}: {str(e)}", exc_info=True)
            return Response({
                'error': {'code': 'OTP_SEND_FAILED', 'message': 'Failed to send OTP. Please try again later.'}
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    except ValidationError:
        raise
    except Exception as e:
        # Catch any other unexpected errors
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Unexpected error in forgot password request: {str(e)}", exc_info=True)
        return Response({
            'error': {'code': 'INTERNAL_ERROR', 'message': 'An error occurred. Please try again later.'}
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([AllowAny])
def user_verify_password_reset_otp(request):
    """
    Verify password reset OTP and return a reset token.
    POST /api/v1/users/forgot-password/verify-otp/
    """
    try:
        # Handle both dict and string request.data
        if isinstance(request.data, str):
            import json
            try:
                data = json.loads(request.data)
            except json.JSONDecodeError:
                data = {}
        else:
            data = request.data
        
        mobile_number = data.get('mobile_number') if isinstance(data, dict) else None
        otp_code = data.get('otp_code') if isinstance(data, dict) else None
        
        if not mobile_number or not otp_code:
            raise ValidationError("mobile_number and otp_code are required")
        
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"Verifying password reset OTP for {mobile_number}")
        
        # Check if there are any recent OTPs (for better error messages)
        from core.models import OTP
        from django.utils import timezone
        recent_otps = OTP.objects.filter(
            phone_number=mobile_number,
            purpose='forgot_password'
        ).order_by('-created_at')[:1]
        
        # Verify OTP
        if not verify_otp(mobile_number, otp_code, 'forgot_password'):
            logger.warning(f"Invalid OTP for {mobile_number}")
            
            # Provide more helpful error message
            if recent_otps.exists():
                latest_otp = recent_otps.first()
                if latest_otp.used:
                    error_msg = "This OTP has already been used. Please request a new OTP."
                elif latest_otp.expires_at < timezone.now():
                    error_msg = "This OTP has expired. Please request a new OTP."
                else:
                    error_msg = "Invalid OTP code. Please check and try again."
            else:
                error_msg = "No OTP found. Please request a new OTP first."
            
            # Use ValidationError instead of AuthenticationError for OTP validation failures
            # This returns 400 instead of 401, which is more appropriate
            raise ValidationError(error_msg)
        
        # Check if customer exists
        try:
            customer = Customer.objects.get(mobile_number=mobile_number)
        except Customer.DoesNotExist:
            logger.warning(f"Customer not found for {mobile_number}")
            raise AuthenticationError("User not found")
        
        # Generate a simple reset token (using a hash of customer ID + timestamp)
        from django.utils import timezone
        from datetime import timedelta
        import hashlib
        import secrets
        
        # Create a secure token
        reset_token = secrets.token_urlsafe(32)
        expires_at = timezone.now() + timedelta(minutes=10)  # Token valid for 10 minutes
        
        # Store token in customer's session or create a simple token storage
        # For simplicity, we'll use a hash-based approach
        # In production, you might want to use Django's password reset tokens or a separate model
        
        logger.info(f"Password reset OTP verified for {mobile_number}, token generated")
        
        return Response({
            'password_reset_token': reset_token,
            'expires_in_seconds': 600  # 10 minutes
        }, status=status.HTTP_200_OK)
    except ValidationError:
        raise
    except AuthenticationError:
        raise
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Error verifying password reset OTP: {str(e)}", exc_info=True)
        return Response({
            'error': {'code': 'VERIFICATION_FAILED', 'message': 'Failed to verify OTP. Please try again.'}
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([AllowAny])
def user_reset_password(request):
    """
    Reset password with OTP.
    POST /api/v1/users/reset-password/
    """
    try:
        # Handle both dict and string request.data
        if isinstance(request.data, str):
            import json
            try:
                data = json.loads(request.data)
            except json.JSONDecodeError:
                data = {}
        else:
            data = request.data
        
        mobile_number = data.get('mobile_number') if isinstance(data, dict) else None
        otp_code = data.get('otp_code') if isinstance(data, dict) else None
        new_password = data.get('new_password') if isinstance(data, dict) else None
        
        if not all([mobile_number, otp_code, new_password]):
            raise ValidationError("mobile_number, otp_code, and new_password are required")
        
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"Resetting password for {mobile_number}")
        
        # Verify OTP
        if not verify_otp(mobile_number, otp_code, 'forgot_password'):
            logger.warning(f"Invalid OTP for password reset: {mobile_number}")
            raise AuthenticationError("Invalid or expired OTP")
        
        try:
            customer = Customer.objects.get(mobile_number=mobile_number)
        except Customer.DoesNotExist:
            logger.warning(f"Customer not found for password reset: {mobile_number}")
            raise AuthenticationError("User not found")
        
        customer.set_password(new_password)
        customer.save()
        
        logger.info(f"Password reset successfully for {mobile_number}")
        return Response({'message': 'Password reset successfully'}, status=status.HTTP_200_OK)
    except ValidationError:
        raise
    except AuthenticationError:
        raise
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Error resetting password: {str(e)}", exc_info=True)
        return Response({
            'error': {'code': 'RESET_FAILED', 'message': 'Failed to reset password. Please try again.'}
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([AllowAny])
def user_save_optional_info(request):
    """
    Save optional information during signup (before account creation).
    POST /api/v1/users/save-optional-info/
    Body: {
        "signup_id": "mobile_number",
        "blood_type": "A+",
        "emergency_contact_name": "John Doe",
        "emergency_contact_mobile": "01234567890"
    }
    """
    signup_id = request.data.get('signup_id')  # This is mobile_number
    if not signup_id:
        raise ValidationError("signup_id is required")
    
    # Store in registration cache
    from django.core.cache import cache
    cache_key = f"registration_{signup_id}"
    registration_data = cache.get(cache_key)
    
    if not registration_data:
        raise ValidationError("Registration session expired. Please start again.")
    
    # Update optional info in cache
    if request.data.get('blood_type'):
        registration_data['blood_type'] = request.data.get('blood_type')
    if request.data.get('emergency_contact_name'):
        registration_data['emergency_contact_name'] = request.data.get('emergency_contact_name')
    if request.data.get('emergency_contact_mobile'):
        registration_data['emergency_contact_mobile'] = request.data.get('emergency_contact_mobile')
    
    cache.set(cache_key, registration_data, timeout=600)  # Reset timeout
    
    return Response({
        'optional_saved': True,
        'message': 'Optional information saved successfully'
    }, status=status.HTTP_200_OK)


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
    
    raise ValidationError(
        detail='Invalid input data.',
        details=serializer.errors
    )


@api_view(['GET'])
@permission_classes([AllowAny])
def public_events_featured(request):
    """
    Get featured events.
    GET /api/v1/public/events/featured/
    """
    # Featured events are those marked as featured=True, or if none, show upcoming events
    events = Event.objects.filter(
        Q(featured=True) | Q(status__in=['upcoming', 'ongoing'])
    ).exclude(status='cancelled').select_related('organizer', 'venue', 'category')
    
    # Order by featured first, then by date (upcoming first) and limit to 10
    events = events.order_by('-featured', 'date')[:10]
    
    serializer = PublicEventSerializer(events, many=True, context={'request': request})
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
        # For public view, only require active status (not verified=True)
        organizer = Organizer.objects.get(id=organizer_id, status='active')
    except Organizer.DoesNotExist:
        return Response({
            'error': {'code': 'NOT_FOUND', 'message': 'Organizer not found'}
        }, status=status.HTTP_404_NOT_FOUND)
    
    events_count = Event.objects.filter(organizer=organizer, status__in=['upcoming', 'ongoing']).count()
    
    # Get logo URL if available
    logo_url = None
    if organizer.profile_image:
        logo_url = request.build_absolute_uri(organizer.profile_image.url)
    
    data = {
        'id': organizer.id,
        'name': organizer.name,
        'category': organizer.category,
        'location': organizer.location,
        'total_events': events_count,
        'rating': float(organizer.rating) if organizer.rating else None,
        'logo': logo_url,
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
    # Get customer from request (set by CustomerJWTAuthentication)
    customer = getattr(request, 'customer', None)
    if not customer:
        # Fallback: try to get from user.id (for compatibility)
        customer_id = request.user.id if hasattr(request.user, 'id') else None
        if customer_id:
            try:
                customer = Customer.objects.get(id=customer_id)
            except Customer.DoesNotExist:
                pass
    
    if not customer:
        return Response({
            'error': {'code': 'UNAUTHORIZED', 'message': 'Authentication required'}
        }, status=status.HTTP_401_UNAUTHORIZED)
    
    try:
        # First check if ticket exists
        ticket_exists = Ticket.objects.filter(id=ticket_id).exists()
        if not ticket_exists:
            return Response({
                'error': {'code': 'NOT_FOUND', 'message': 'Ticket not found'}
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Allow viewing ticket if user owns it (customer = customer) - this takes priority
        # OR if ticket is assigned to them (assigned_mobile matches)
        # OR if user bought ticket for someone else (assigned ticket)
        # BUT exclude tickets that were transferred away (buyer = customer BUT customer != customer AND assigned_mobile is NULL)
        ticket = Ticket.objects.select_related('event', 'customer', 'buyer').filter(
            Q(id=ticket_id) & (
                Q(customer=customer) |  # User owns the ticket - always allow viewing
                Q(assigned_mobile=customer.mobile_number) |  # Ticket assigned to user
                (Q(buyer=customer) & Q(assigned_mobile__isnull=False))  # User bought for someone else
            )
        ).exclude(
            # Only exclude if ticket was transferred away: buyer is customer but customer is not customer and assigned_mobile is null
            # This means: user bought it, but doesn't own it anymore, and it wasn't assigned (it was transferred)
            Q(buyer=customer) & ~Q(customer=customer) & Q(assigned_mobile__isnull=True)
        ).first()
        
        if not ticket:
            # Check if ticket was transferred away
            transferred_ticket = Ticket.objects.filter(
                id=ticket_id,
                buyer=customer
            ).exclude(customer=customer).first()
            
            if transferred_ticket:
                return Response({
                    'error': {
                        'code': 'TICKET_TRANSFERRED', 
                        'message': 'This ticket has been transferred and is no longer available in your account'
                    }
                }, status=status.HTTP_404_NOT_FOUND)
            
            return Response({
                'error': {'code': 'NOT_FOUND', 'message': 'Ticket not found'}
            }, status=status.HTTP_404_NOT_FOUND)
    except Exception:
        return Response({
            'error': {'code': 'NOT_FOUND', 'message': 'Ticket not found'}
        }, status=status.HTTP_404_NOT_FOUND)
    
    # Get all tickets from the same booking (same event, same purchase date)
    # Show tickets where:
    # 1. Customer owns the ticket, OR
    # 2. Ticket is assigned to this customer, OR
    # 3. Customer bought ticket for someone else (assigned tickets)
    # BUT exclude tickets that were transferred away
    purchase_date = ticket.purchase_date.date()
    all_booking_tickets = Ticket.objects.filter(
        event=ticket.event,
        purchase_date__date=purchase_date
    ).filter(
        Q(customer=customer) | 
        Q(assigned_mobile=customer.mobile_number) |
        (Q(buyer=customer) & Q(assigned_mobile__isnull=False))
    ).exclude(
        # Exclude transferred tickets: buyer is customer but customer is not customer and assigned_mobile is null
        Q(buyer=customer) & ~Q(customer=customer) & Q(assigned_mobile__isnull=True)
    ).select_related('customer', 'buyer').order_by('purchase_date')
    
    serializer = TicketSerializer(all_booking_tickets, many=True, context={'request': request})
    return Response({
        'ticket': TicketSerializer(ticket, context={'request': request}).data,
        'related_tickets': serializer.data,
        'total_tickets': all_booking_tickets.count()
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def user_ticket_transfer(request, ticket_id):
    """
    Transfer ticket to another user.
    POST /api/v1/users/tickets/:id/transfer/
    """
    # Get customer from request (set by CustomerJWTAuthentication)
    customer = getattr(request, 'customer', None)
    if not customer:
        # Fallback: try to get from user.id (for compatibility)
        customer_id = request.user.id if hasattr(request.user, 'id') else None
        if customer_id:
            try:
                customer = Customer.objects.get(id=customer_id)
            except Customer.DoesNotExist:
                pass
    
    if not customer:
        return Response({
            'error': {'code': 'UNAUTHORIZED', 'message': 'Authentication required'}
        }, status=status.HTTP_401_UNAUTHORIZED)
    
    try:
        ticket = Ticket.objects.select_related('event', 'customer', 'buyer').get(id=ticket_id, customer_id=customer.id)
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
    recipient_name = request.data.get('recipient_name', '').strip()
    payment_method = request.data.get('payment_method', 'credit_card')  # Default to credit_card if not provided
    
    if not recipient_mobile:
        raise ValidationError("recipient_mobile is required")
    
    # Calculate transfer fee
    event = ticket.event
    transfer_fee = Decimal('0')
    if event.transfer_fee_value:
        if event.transfer_fee_type == 'percentage':
            # Percentage of ticket price
            transfer_fee = (ticket.price * event.transfer_fee_value) / Decimal('100')
        else:
            # Flat amount
            transfer_fee = event.transfer_fee_value
    
    # Process payment for transfer fee
    if transfer_fee > 0:
        transfer_payment = PaymentTransaction.objects.create(
            customer=customer,
            ticket=ticket,
            amount=transfer_fee,
            payment_method=payment_method,
            status='completed',  # For now, assume payment is successful
            transaction_id=str(uuid.uuid4())
        )
    
    # Try to find recipient customer
    recipient = None
    try:
        recipient = Customer.objects.get(mobile_number=recipient_mobile, status='active')
        recipient_name = recipient.name if not recipient_name else recipient_name
    except Customer.DoesNotExist:
        # Recipient doesn't exist yet - will be linked when they register
        pass
    
    # Store original owner info
    from_customer = ticket.customer
    original_buyer = ticket.buyer if ticket.buyer else ticket.customer
    
    # Update ticket ownership
    if recipient:
        # Recipient exists - transfer ownership immediately
        # Change the ticket owner to recipient
        ticket.customer = recipient
        # Keep buyer as original purchaser (for tracking who paid)
        if not ticket.buyer:
            ticket.buyer = original_buyer
        # Clear assigned fields since ticket is now owned by recipient, not just assigned
        # We could keep them for transfer history, but for clarity, clear them
        # The buyer field already tracks who originally purchased it
        ticket.assigned_name = None
        ticket.assigned_mobile = None
        ticket.assigned_email = None
    else:
        # Recipient doesn't exist yet - set assigned fields, keep ticket with current owner
        # Ticket will be linked when recipient registers (handled in registration/login)
        ticket.assigned_name = recipient_name
        ticket.assigned_mobile = recipient_mobile
        ticket.assigned_email = None
        # Keep buyer as original purchaser
        if not ticket.buyer:
            ticket.buyer = original_buyer
        # Keep customer as current owner until recipient registers
    
    ticket.save()
    
    # Create TicketTransfer record
    from tickets.models import TicketTransfer
    if recipient:
        transfer_record = TicketTransfer.objects.create(
            ticket=ticket,
            from_customer=from_customer,
            to_customer=recipient,
            status='completed'
        )
    else:
        # Create pending transfer record (will be completed when recipient registers)
        # For now, we'll create it with a placeholder or handle it when recipient registers
        # Store transfer info in ticket's assigned fields until recipient registers
        pass
    
    return Response({
        'message': 'Ticket transferred successfully',
        'ticket': TicketSerializer(ticket, context={'request': request}).data,
        'transfer_fee': float(transfer_fee),
        'recipient_exists': recipient is not None
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
    # Get customer from request (set by CustomerJWTAuthentication)
    customer = getattr(request, 'customer', None)
    if not customer:
        # Fallback: try to get from user.id (for compatibility)
        customer_id = request.user.id if hasattr(request.user, 'id') else None
        if customer_id:
            try:
                customer = Customer.objects.get(id=customer_id)
            except Customer.DoesNotExist:
                pass
    
    if not customer:
        return Response({
            'error': {'code': 'UNAUTHORIZED', 'message': 'Authentication required'}
        }, status=status.HTTP_401_UNAUTHORIZED)
    
    amount = request.data.get('amount')
    payment_method = request.data.get('payment_method')
    event_id = request.data.get('event_id')
    ticket_ids = request.data.get('ticket_ids', [])
    
    if not all([amount, payment_method]):
        raise ValidationError("amount and payment_method are required")
    
    # Convert amount to Decimal
    try:
        amount_decimal = Decimal(str(amount))
    except (ValueError, TypeError):
        raise ValidationError("Invalid amount format")
    
    # Get first ticket if ticket_ids provided (PaymentTransaction has ticket field, not event)
    ticket = None
    if ticket_ids and len(ticket_ids) > 0:
        try:
            ticket = Ticket.objects.get(id=ticket_ids[0], customer=customer)
        except Ticket.DoesNotExist:
            pass
    
    try:
        transaction = PaymentTransaction.objects.create(
            customer=customer,
            ticket=ticket,  # PaymentTransaction has ticket field, not event
            amount=amount_decimal,
            payment_method=payment_method,
            status='pending',
            transaction_id=str(uuid.uuid4())
        )
        
        return Response({
            'transaction_id': transaction.transaction_id,
            'status': transaction.status,
            'amount': float(transaction.amount)
        }, status=status.HTTP_201_CREATED)
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Error processing payment: {str(e)}", exc_info=True)
        return Response({
            'error': {'code': 'PAYMENT_ERROR', 'message': f'Failed to process payment: {str(e)}'}
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


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
        expiry_date=timezone.now().date() + timedelta(days=365)  # 1 year from issue date
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
